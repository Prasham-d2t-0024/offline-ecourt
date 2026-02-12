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

(window as any).openTocPdf = (bitstreamId: string, rowId: string) => {
    console.log("bitstreamId", bitstreamId);
    const iframe = document.getElementById('pdfViewer') as HTMLIFrameElement;
    if (!iframe) return;

    // Remove previous active highlight
    document.querySelectorAll('.toc-row-active').forEach(el => {
        el.classList.remove('toc-row-active');
    });

    // Add active class to clicked row
    const activeRow = document.getElementById(`row-${rowId}`);
    if (activeRow) {
        activeRow.classList.add('toc-row-active');
    }

    const urlParams = new URLSearchParams(window.location.search);
    const cino = urlParams.get('cino');
    const baseUrl = import.meta.env.VITE_API_BASE_URL;
    const pdfPath = `${baseUrl}/api/jocd/${cino}/${bitstreamId}`;
    // const pdfPath = `/pdfs/sample.pdf`;
    iframe.src = `/pdfviewer.html?file=` + encodeURIComponent(pdfPath);
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

    // CASE A: !isTemplet && desc == null && !isSubchild (e.g. Orders with date only)
    if (!isTemplet && !desc && !isSubchild) {
        displayText = dateStr;
        isClickable = true;
        clickAction = `openTocPdf('${bitstream?.id}', '${node.id}')`;
    }
    // CASE B: !isTemplet && isSubchild && bitstream != null
    else if (!isTemplet && isSubchild && bitstream) {
        displayText = docName;
        isClickable = true;
        clickAction = `openTocPdf('${bitstream.id}', '${node.id}')`;
    }
    // CASE C: !isTemplet && !isSubchild && desc != null (e.g. Orders with description)
    else if (!isTemplet && !isSubchild && desc) {
        displayText = desc;
        tooltip = desc;
        isClickable = true;
        clickAction = `openTocPdf('${bitstream?.id}', '${node.id}')`;
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
        clickAction = `openTocPdf('${bitstream.id}', '${node.id}')`;
    }
    // FALLBACK
    else {
        displayText = desc || docName || dateStr || 'Document';
        if (bitstream) {
            isClickable = true;
            clickAction = `openTocPdf('${bitstream.id}', '${node.id}')`;
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
            (window as any).openTocPdf(
                firstLeaf.bitstream.id,
                firstLeaf.id
            );
        }
    }, 0);

    return `
<div class="container-fluid m-0 p-0">
  <div class="row m-0 p-0" style="height:100vh">

    <!-- LEFT 30% -->
    <div class="col-3 p-0 border-end">

      <ul class="nav nav-tabs">
        <li class="nav-item cursor">
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

    <!-- RIGHT 70% -->
    <div class="col-9 p-0">
      <iframe
        id="pdfViewer"
        style="width:100%;height:100%;border:none">
      </iframe>
    </div>

  </div>
</div>
`;
}
