import './style.css';
// import { renderFilters } from './render/filters.render';
import { renderCauseList } from './render/cause-list.render';
import type { CauseListResponse } from './types';
import './styles/bootstrap.min.css';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// API Fetch Function
async function fetchCauseList(): Promise<CauseListResponse> {
  const response = await fetch(`${API_BASE_URL}/api/causelist/`);
  if (!response.ok) throw new Error('API failed');
  return response.json();
}

// ---- STATE (replaces Angular component class) ----
const state: any = {
  userList: ['J001', 'J002'],
  userjocode: '',
  courtnameArray: [],
  causelistEstiCode: '',
  causelisttypecode: '',
  benchid: '',
  lockbutton: false
};

// ---- RENDER PIPELINE ----
function rerender() {
  const app = document.getElementById('app')!;
  app.innerHTML = `
    <div id="causeList"></div>
  `;
}

function openCase(cino: string) {
  const url = `/toc.html?cino=${encodeURIComponent(cino)}`;
  window.open(url, '_blank');
}

// expose for inline onclick
(window as any).openCase = openCase;

// ---- INIT ----
state.userjocode = state.userList[0];
rerender();

// Initialize app with API data
(async () => {
  try {
    const app = document.getElementById('app')!;
    app.innerHTML = '<div id="causeList"><p>Loading...</p></div>';

    const apiResponse = await fetchCauseList();
    const causeListData = apiResponse.data?.data || [];
    const causeListTitle = apiResponse.data?.causelist_title;

    state.userjocode = state.userList[0];
    rerender();

    const container = document.getElementById('causeList');
    if (container) {
      container.innerHTML = renderCauseList(causeListData, causeListTitle);
    }
  } catch (error) {
    console.error('Failed to load cause list from API, falling back to static JSON:', error);

    // Fallback to static JSON
    try {
      const staticData = await import('./data/ecourt.json');
      // Static JSON has structure: { data: [...], causelist_title: {...} }
      const causeListData = staticData.default.data || [];
      const causeListTitle = staticData.default.causelist_title;

      const container = document.getElementById('causeList');
      if (container) {
        container.innerHTML = renderCauseList(causeListData, causeListTitle);
      }
    } catch (fallbackError) {
      console.error('Failed to load static fallback data:', fallbackError);
      const container = document.getElementById('causeList');
      if (container) container.innerHTML = '<p>No data available</p>';
    }
  }
})();
