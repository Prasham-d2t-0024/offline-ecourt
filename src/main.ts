import './style.css';
// import { renderFilters } from './render/filters.render';
import { renderCauseList } from './render/cause-list.render';
import ecourt from './data/ecourt.json';
import './styles/bootstrap.min.css';

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
  renderCauseSection();
}
function openCase(cino: string) {
  const url = `/toc.html?cino=${encodeURIComponent(cino)}`;
  window.open(url, '_blank');
}

// expose for inline onclick
(window as any).openCase = openCase;
const apiResponse = ecourt as any;

// this is what we actually render
const causeListData = apiResponse.data || [];
const causeListTitle = apiResponse.causelist_title;

// after filters render & bindings
function renderCauseSection() {
  const container = document.getElementById('causeList');
  if (!container) return;

  container.innerHTML = renderCauseList(causeListData, causeListTitle);
}

// call after rerender()
renderCauseSection();

// ---- INIT ----
state.userjocode = state.userList[0];
rerender();
