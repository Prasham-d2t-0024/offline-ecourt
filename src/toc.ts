import './style.css';
import './styles/bootstrap.min.css';
import toc from './data/toc.json';
import { renderTOCPage } from './render/toc.render';

const tocTree = toc._embedded?.documenttypetrees || [];
function openTocPdf(bitstreamId: string) {
    const iframe = document.getElementById('pdfViewer') as HTMLIFrameElement;
    const empty = document.getElementById('emptyPdf');

    if (!iframe) return;

    iframe.src =
        '/pdfviewer.html?file=' +
        encodeURIComponent(`/pdfs/${bitstreamId}.pdf`);

    if (empty) empty.style.display = 'none';
}


let activeLeftTab: 'toc' | 'notes' = 'toc';

function switchLeftTab(tab: 'toc' | 'notes') {
    activeLeftTab = tab;
    render();
}

function openPdf(bitstreamId: string) {
    const iframe = document.getElementById('pdfViewer') as HTMLIFrameElement;
    if (!iframe) return;

    iframe.src =
        '/pdfviewer.html?file=' +
        encodeURIComponent(`/pdfs/${bitstreamId}.pdf`);
}

// auto-open first PDF
function openFirstPdf() {
    function findLeaf(nodes: any[]): any | null {
        for (const n of nodes) {
            if (n.bitstreamId) return n;
            if (n.children) {
                const found = findLeaf(n.children);
                if (found) return found;
            }
        }
        return null;
    }

    const first = findLeaf(tocTree);
    if (first) openPdf(first.bitstreamId);
}

// expose globally
(window as any).openPdf = openPdf;
(window as any).switchLeftTab = switchLeftTab;

function render() {
    const app = document.getElementById('app')!;
    app.innerHTML = renderTOCPage(tocTree, activeLeftTab);
}

render();
openFirstPdf();
