// (window as any).toggleNode = (id: string) => {
//     const el = document.getElementById(`node-${id}`);
//     if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
// };

// function renderTOCNode(node: any): string {
//     const hasChildren = node.children && node.children.length > 0;
//     const isClickable = !!node.bitstream;

//     return `
//     <li class="mb-1">

//       <div class="d-flex align-items-center">

//         ${hasChildren
//             ? `<span
//                 class="mr-1 cursor"
//                 onclick="toggleNode('${node.id}')"
//               >▶</span>`
//             : `<span class="mr-1"></span>`
//         }

//         <span
//           class="${isClickable ? 'spanclik' : ''}"
//           style="font-size:13px;${isClickable ? 'cursor:pointer;' : ''}"
//           ${isClickable ? `onclick="openTocPdf('${node.bitstream.id}')"` : ''}
//         >
//           ${node.desc || node.documentType?.documenttypename || ''}
//         </span>

//       </div>

//       <div
//         id="node-${node.id}"
//         style="display:none;"
//       >
//         ${hasChildren ? renderTOCTree(node.children) : ''}
//       </div>

//     </li>
//   `;
// }

// function renderTOCTree(nodes: any[]): string {
//     if (!nodes || !nodes.length) return '';

//     return `
//     <ul class="list-unstyled ml-2">
//       ${nodes.map(renderTOCNode).join('')}
//     </ul>
//   `;
// }

// export function renderTOCLayout(tree: any[]): string {
//     return `
//     <div class="container-fluid p-0">
//       <div class="row m-0" style="height: calc(100vh - 50px);">

//         <!-- LEFT: TOC TREE -->
//         <div class="col-4 border-end" style="overflow:auto;">
//           ${renderTOCTree(tree)}
//         </div>

//         <!-- RIGHT: PDF VIEWER -->
//         <div class="col-8 p-0">
//           <iframe
//             id="pdfViewerFrame"
//             src=""
//             style="width:100%;height:100%;border:none;"
//           ></iframe>

//           <div
//             id="emptyPdf"
//             class="text-center text-muted mt-5"
//           >
//             Select a document to view PDF
//           </div>
//         </div>

//       </div>
//     </div>
//   `;
// }

// export function renderTOCPage(
//     tree: any[],
//     activeTab: 'toc' | 'notes'
// ): string {
//     return `
// <div class="container-fluid m-0 p-0">
//   <div class="row m-0 p-0" style="height:100vh">

//     <!-- LEFT 30% -->
//     <div class="col-3 p-0 border-end">

//       <!-- LEFT TABS -->
//       <ul class="nav nav-tabs">
//         <li class="nav-item">
//           <a class="nav-link ${activeTab === 'toc' ? 'active' : ''}"
//              onclick="switchLeftTab('toc')">
//             Table of Content
//           </a>
//         </li>
//         <li class="nav-item">
//           <a class="nav-link ${activeTab === 'notes' ? 'active' : ''}"
//              onclick="switchLeftTab('notes')">
//             Note
//           </a>
//         </li>
//       </ul>

//       <!-- LEFT TAB CONTENT -->
//       <div style="height:calc(100vh - 42px); overflow:auto">
//         ${activeTab === 'toc'
//             ? renderTOCTree(tree)
//             : renderNotes()
//         }
//       </div>
//     </div>

//     <!-- RIGHT 70% PDF -->
//     <div class="col-9 p-0">
//       <iframe
//         id="pdfViewer"
//         style="width:100%;height:100%;border:none">
//       </iframe>
//     </div>

//   </div>
// </div>
// `;
// }

// function renderNotes(): string {
//     return `
//     <div class="p-2">
//     <button class="btn btn-success w-100 mb-2">
//         Generate Note
//     </button>

//     <textarea
//         class="form-control"
//         rows="10"
//         placeholder="Notes...">
//     </textarea>
//     </div>
//     `;
// }


// ---- GLOBALS ----
// SAFETY: force global binding

(window as any).toggleNode = (id: string) => {
    const el = document.getElementById(`node-${id}`);
    const chevron = document.getElementById(`chevron-${id}`);
    if (!el) return;

    const isExpanding = el.style.display === 'none';
    el.style.display = isExpanding ? 'block' : 'none';

    if (chevron) {
        chevron.textContent = isExpanding ? '▾' : '▸';
    }
};



// ---- TOC RENDERING ----
function findFirstLeaf(nodeList: any[]): any | null {
    for (const node of nodeList) {
        if (node.bitstream) return node;
        if (node.children?.length) {
            const found = findFirstLeaf(node.children);
            if (found) return found;
        }
    }
    return null;
}


function renderTOCNode(node: any): string {
    const hasChildren = node.children && node.children.length > 0;

    // Determine display text and click behavior based on conditions
    let displayText = '';
    let isClickable = false;
    let clickAction = '';
    let tooltip = '';

    const { isTemplet, isSubchild, desc, bitstream, doc_date, documentType } = node;
    const docName = documentType?.documenttypename || '';
    const dateStr = doc_date ? new Date(doc_date).toLocaleDateString('en-GB') : ''; // dd/mm/yyyy

    const getSafeTitle = (t: string) => t.replace(/'/g, "\\'");

    // CASE A: !isTemplet && desc == null && !isSubchild (e.g. Orders with date only)
    if (!isTemplet && !desc && !isSubchild) {
        displayText = dateStr;
        isClickable = true;
        clickAction = `openTocPdf('${bitstream?.id}', '${node.id}', '${getSafeTitle(displayText)}')`;
    }
    // CASE B: !isTemplet && isSubchild && bitstream != null
    else if (!isTemplet && isSubchild && bitstream) {
        displayText = docName;
        isClickable = true;
        clickAction = `openTocPdf('${bitstream.id}', '${node.id}', '${getSafeTitle(displayText)}')`;
    }
    // CASE C: !isTemplet && !isSubchild && desc != null (e.g. Orders with description)
    else if (!isTemplet && !isSubchild && desc) {
        displayText = desc;
        tooltip = desc;
        isClickable = true;
        clickAction = `openTocPdf('${bitstream?.id}', '${node.id}', '${getSafeTitle(displayText)}')`;
    }
    // CASE D: !isTemplet && isSubchild && desc != null && bitstream == null (Folder-like)
    else if (!isTemplet && isSubchild && desc && !bitstream) {
        displayText = desc;
        tooltip = desc;
        isClickable = true; // Expandable
        clickAction = `toggleNode('${node.id}')`;
    }
    // CASE E: children > 0 && isTemplet && bitstream == null (Folder-like Template)
    else if (hasChildren && isTemplet && !bitstream) {
        displayText = docName;
        isClickable = true; // Expandable
        clickAction = `toggleNode('${node.id}')`;
    }
    // CASE F: isTemplet && bitstream != null
    else if (isTemplet && bitstream) {
        displayText = docName;
        isClickable = true;
        clickAction = `openTocPdf('${bitstream.id}', '${node.id}', '${getSafeTitle(displayText)}')`;
    }
    // FALLBACK
    else {
        displayText = desc || docName || dateStr || 'Document';
        if (bitstream) {
            isClickable = true;
            clickAction = `openTocPdf('${bitstream.id}', '${node.id}', '${getSafeTitle(displayText)}')`;
        }
    }

    const isLeaf = !!bitstream;

    return `
        <li class="rowEcourt mb-1" id="row-${node.id}" style="${!isLeaf ? 'background-color: #FFF;' : 'background-color: #f0f8ff;'}">

        <div class="d-flex align-items-center">

            <!-- Chevron (TEXT ONLY) -->
            <span
            id="chevron-${node.id}"
            class="mr-1 ml-1 cursor"
            style="width:16px;display:inline-block;transform:scale(1.7);"
            ${hasChildren ? `onclick="toggleNode('${node.id}')"` : ''}
            >
            ${hasChildren ? '▸' : ''}
            </span>


            <!-- Icon (for non-templates) using Inline SVG -->
            ${!isTemplet ? `
            <span class="mr-2 text-muted">
                <svg viewBox="0 0 384 512" width="12" height="12" fill="currentColor" style="display:inline-block;vertical-align:middle;color: #3077b5;">
                    <path d="M0 64C0 28.7 28.7 0 64 0H224V128c0 17.7 14.3 32 32 32H384V448c0 35.3-28.7 64-64 64H64c-35.3 0-64-28.7-64-64V64zm384 64H256V0L384 128z"/>
                </svg>
            </span>` : ''}

            <!-- Label -->
            <span
            class="${isClickable ? 'spanclik' : ''}"
            style="${isClickable ? 'cursor:pointer;font-size:14px;' : 'font-size:16px;'}"
            ${isClickable ? `onclick="${clickAction}"` : ''}
            ${tooltip ? `title="${tooltip}"` : ''}
            >
            ${displayText}
            </span>

            <!-- Second Viewer Icon (Split View) -->
            ${isLeaf ? `
            <span 
                class="ml-2 cursor" 
                title="Open in Second Viewer" 
                onclick="openSecondViewer('${bitstream.id}', '${node.id}', '${displayText.replace(/'/g, "\\'")}')"
                style="color: #3077b5; margin-right: 8px;"
            >
                <svg viewBox="0 0 512 512" width="14" height="14" fill="currentColor" style="display:inline-block;vertical-align:middle;">
                    <path d="M464 32H48C21.49 32 0 53.49 0 80v352c0 26.51 21.49 48 48 48h416c26.51 0 48-21.49 48-48V80c0-26.51-21.49-48-48-48zM224 416H64V160h160v256zm224 0H288V160h160v256z"/>
                </svg>
            </span>
            ` : ''}
        </div>

        ${hasChildren
            ? `
            <div
                id="node-${node.id}"
                style="display:none;margin-left:20px; margin-right:10px;"
            >
                ${renderTOCTree(node.children)}
            </div>`
            : ``
        }

        </li>
    `;
}


function renderTOCTree(nodes: any[]): string {
    if (!nodes || !nodes.length) return '';

    return `
<ul class="list-unstyled m-0 p-0">
  ${nodes.map(renderTOCNode).join('')}
</ul>
`;
}

// ---- NOTES TAB ----
function renderNotes(): string {
    return `
<div class="p-2">
  <button class="btn btn-success w-100 mb-2">
    Generate Note
  </button>

  <textarea
    class="form-control"
    rows="12"
    placeholder="Notes...">
  </textarea>
</div>
`;
}

// ---- PAGE LAYOUT ----
export function renderTOCPage(
    tree: any[],
    activeTab: 'toc' | 'notes' = 'toc'
): string {

    // auto-load first leaf
    setTimeout(() => {
        const firstLeaf = findFirstLeaf(tree);
        if (firstLeaf?.bitstream?.id && firstLeaf?.id) {
            const title = firstLeaf.desc || firstLeaf.documentType?.documenttypename || 'Document';
            (window as any).openTocPdf(
                firstLeaf.bitstream.id,
                firstLeaf.id,
                title.replace(/'/g, "\\'")
            );
        }
    }, 0);

    return `
<div class="container-fluid m-0 p-0">
  <div class="row m-0 p-0" style="height:100vh">

    <!-- LEFT 30% -->
    <div class="col-3 p-0 border-end">

      <ul class="nav nav-tabs">
        <li class="nav-item cursor fw-600">
          <a class="nav-link ${activeTab === 'toc' ? 'active' : ''}"
             onclick="switchLeftTab('toc')">
            Table of Content
          </a>
        </li>
      </ul>

      <div style="height:calc(100vh - 42px); overflow:auto; padding:12px;">
        ${activeTab === 'toc'
            ? renderTOCTree(tree)
            : renderNotes()
        }
      </div>
    </div>

    <!-- RIGHT 70% (Split View Container) -->
    <div class="col-9 p-0 d-flex" id="pdfContainer">
      
      <!-- Viewer 1 -->
      <div id="viewer1" style="width:100%; height:100%; transition: width 0.3s ease; display:flex; flex-direction:column; border-right:1px solid #dee2e6;">
          <div class="viewer-header-container">
                <div class="viewer-header-tab">
                    <span id="viewer1-title" class="viewer-header-title">Select a Document</span>
                    <button onclick="closeFirstViewer()" class="btn btn-danger btn-sm p-0 d-flex align-items-center justify-content-center viewer-close-btn" title="Close">&times;</button>
                </div>
          </div>    
          <div style="flex:1; position:relative;">
              <iframe
                id="pdfViewer"
                style="width:100%;height:100%;border:none; position:absolute; top:0; left:0;">
              </iframe>
          </div>
      </div>

      <!-- Viewer 2 -->
      <div id="viewer2" style="width:0%; height:100%; display:none; transition: width 0.3s ease; flex-direction:column; border-left:1px solid #dee2e6;">
          <div class="viewer-header-container">
                <div class="viewer-header-tab">
                    <span id="viewer2-title" class="viewer-header-title">Document 2</span>
                    <button onclick="closeSecondViewer()" class="btn btn-danger btn-sm p-0 d-flex align-items-center justify-content-center viewer-close-btn" title="Close">&times;</button>
                </div>
          </div>
           <div style="flex:1; position:relative;">
              <iframe
                id="pdfViewer2"
                style="width:100%;height:100%;border:none; position:absolute; top:0; left:0;">
              </iframe>
          </div>
      </div>

    </div>

  </div>
</div>
`;
}

// ---- VIEWER LOGIC ----

(window as any).openTocPdf = (bitstreamId: string, rowId: string, docName: string = 'Document') => {
    const iframe = document.getElementById('pdfViewer') as HTMLIFrameElement;
    if (!iframe) return;

    // Update Title
    const titleEl = document.getElementById('viewer1-title');
    if (titleEl) titleEl.innerText = docName;

    // Highlight Row for Viewer 1
    document.querySelectorAll('.toc-row-active-1').forEach(el => el.classList.remove('toc-row-active-1'));
    // Fallback: clear old class too
    document.querySelectorAll('.toc-row-active').forEach(el => el.classList.remove('toc-row-active'));

    const activeRow = document.getElementById(`row-${rowId}`);
    if (activeRow) activeRow.classList.add('toc-row-active-1');

    // Load PDF
    const urlParams = new URLSearchParams(window.location.search);
    const cino = urlParams.get('cino');
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    const pdfPath = `${baseUrl}/api/jocd/${cino}/${bitstreamId}`;
    iframe.src = `/pdfviewer.html?file=` + encodeURIComponent(pdfPath);
};

(window as any).closeFirstViewer = () => {
    const iframe = document.getElementById('pdfViewer') as HTMLIFrameElement;
    const titleEl = document.getElementById('viewer1-title');
    if (iframe) iframe.src = '';
    if (titleEl) titleEl.innerText = 'Select a Document';

    // Remove Highlight
    document.querySelectorAll('.toc-row-active-1').forEach(el => el.classList.remove('toc-row-active-1'));
};

(window as any).closeSecondViewer = () => {
    const v1 = document.getElementById('viewer1');
    const v2 = document.getElementById('viewer2');
    const iframe2 = document.getElementById('pdfViewer2') as HTMLIFrameElement;

    if (v1 && v2) {
        v2.style.width = '0%';
        v2.style.display = 'none';
        v1.style.width = '100%';
        if (iframe2) iframe2.src = '';

        // Remove Highlight
        document.querySelectorAll('.toc-row-active-2').forEach(el => el.classList.remove('toc-row-active-2'));
    }
};

(window as any).openSecondViewer = (bitstreamId: string, _rowId: string, docName: string = 'Document') => {
    const v1 = document.getElementById('viewer1');
    const v2 = document.getElementById('viewer2');
    const iframe2 = document.getElementById('pdfViewer2') as HTMLIFrameElement;

    if (v1 && v2 && iframe2) {
        // 1. Activate Split View
        v1.style.width = '50%';
        v2.style.display = 'flex';

        // Wait for layout reflow
        requestAnimationFrame(() => {
            v2.style.width = '50%';
        });

        // Update Title
        const titleEl = document.getElementById('viewer2-title');
        if (titleEl) titleEl.innerText = docName;

        // Highlight Row for Viewer 2
        document.querySelectorAll('.toc-row-active-2').forEach(el => el.classList.remove('toc-row-active-2'));
        const activeRow = document.getElementById(`row-${_rowId}`);
        if (activeRow) activeRow.classList.add('toc-row-active-2');

        // 2. Load PDF
        const urlParams = new URLSearchParams(window.location.search);
        const cino = urlParams.get('cino');
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        const pdfPath = `${baseUrl}/api/jocd/${cino}/${bitstreamId}`;
        const finalUrl = `/pdfviewer.html?file=` + encodeURIComponent(pdfPath);

        console.log("Opening in Second Viewer:", finalUrl);
        iframe2.src = finalUrl;
    }
    // Prevent event bubbling
    if (window.event) {
        window.event.cancelBubble = true;
        window.event.stopPropagation();
    }
};
