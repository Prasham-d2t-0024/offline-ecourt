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
    if (!el) return;
    el.style.display = el.style.display === 'none' ? 'block' : 'none';
};

(window as any).openTocPdf = (bitstreamId: string) => {
    console.log("bitstreamId", bitstreamId);
    const iframe = document.getElementById('pdfViewer') as HTMLIFrameElement;
    if (!iframe) return;

    // const pdfPath = `/pdfs/${bitstreamId}.pdf`;
    const pdfPath = `/pdfs/sample.pdf`;
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
    const isLeaf = !!node.bitstream;

    return `
        <li class="rowEcourt mb-1">

        <div class="d-flex align-items-center">

            <!-- Chevron (TEXT ONLY) -->
            <span
            class="mr-2 cursor"
            style="width:16px;display:inline-block;"
            ${hasChildren ? `onclick="toggleNode('${node.id}')"` : ''}
            >
            ${hasChildren ? '▶' : ''}
            </span>

            <!-- Label -->
            <span
            class="spanclik"
            style="font-size:12px;${isLeaf ? 'cursor:pointer;' : ''}"
            ${isLeaf ? `onclick="openTocPdf('${node.bitstream.id}')"` : ''}
            >
            ${node.desc || node.documentType?.documenttypename || ''}
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

    // 🔹 auto-load first leaf
    setTimeout(() => {
        const firstLeaf = findFirstLeaf(tree);
        if (firstLeaf?.bitstream?.id) {
            (window as any).openTocPdf(firstLeaf.bitstream.id);
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
        <li class="nav-item cursor">
          <a class="nav-link ${activeTab === 'notes' ? 'active' : ''}"
             onclick="switchLeftTab('notes')">
            Note
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
