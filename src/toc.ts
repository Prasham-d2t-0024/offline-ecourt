import './style.css';
import './styles/bootstrap.min.css';
import { renderTOCPage } from './render/toc.render';
import type { JOCDResponse, DocumentTypeTree } from './types';

// ---- API CONFIG ----
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

async function fetchJOCD(cino: string): Promise<JOCDResponse> {
    const response = await fetch(`${API_BASE_URL}/api/jocd/${cino}`);
    if (!response.ok) throw new Error('Failed to fetch JOCD');
    return response.json();
}

let tocTree: DocumentTypeTree[] = [];
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

// ---- INIT ----
(async () => {
    try {
        // Extract CINO from URL query parameter
        const urlParams = new URLSearchParams(window.location.search);
        const cino = urlParams.get('cino');

        if (!cino) {
            console.error('No CINO parameter provided in URL');
            return;
        }

        // Fetch JOCD data
        const apiResponse = await fetchJOCD(cino);
        tocTree = apiResponse.data || [];

        // Render TOC
        render();
        openFirstPdf();

    } catch (error) {
        console.error('Failed to load JOCD from API, falling back to static JSON:', error);

        // Fallback to static JSON
        try {
            const staticData = await import('./data/toc.json');
            tocTree = staticData.default._embedded?.documenttypetrees || [];

            // Render TOC
            render();
            openFirstPdf();
        } catch (fallbackError) {
            console.error('Failed to load static TOC fallback data:', fallbackError);
        }
    }
})();
