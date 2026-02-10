function openPdfInNewTab(pdfPath: string) {
  if (!pdfPath) {
    alert('PDF not available for this case');
    return;
  }

  // const url =
  //   `/pdfviewer.html?file=` +
  //   encodeURIComponent(pdfPath);

  pdfPath = "/pdfs/sample.pdf";
  const url =
    `/pdfviewer.html?file=` +
    encodeURIComponent(pdfPath);

  window.open(url, '_blank');
}
(window as any).openPdfInNewTab = openPdfInNewTab;

export function renderCauseList(list: any[], title?: any): string {
  if (!list || !list.length) {
    return `<p>No cause list available</p>`;
  }

  return `
    <div class="container-fluid pt-3">
      ${title ? renderCauseListHeader(title) : ''}
      <div class="content-container">
        ${list.map(renderRow).join('')}
      </div>
    </div>
  `;
}


function renderCauseListHeader(title: any): string {
  if (!title) return '';

  return `
    <div
      class="mb-3 pt-2 pb-2 text-center col-lg-12"
      style="
        box-shadow:0 0 5px rgba(0,0,0,.5);
        border-radius:10px;
        background-color:#f0f8ff;
      "
    >
      <b>
        <img
          src="/In_The_High_Court_at_Calcutta.png"
          class="mb-2 mt-2"
          alt="High Court Logo"
        /><br>

        <h4 class="font-weight-bold">CAUSE LIST</h4>

        <h5 class="font-weight-bold">
          For ${new Date(title.causelist_date).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })}
        </h5>

        <h5 class="font-weight-bold">COURT NO. ${title.room_no}</h5>
        <h5 class="font-weight-bold">${title.floor}</h5>
        <h5 class="font-weight-bold">${title.building}</h5>

        <h5 class="font-weight-bold">
          ${title.bench_type_name} (${title.roaster_desc})
        </h5>

        ${title.causelist_time
      ? `<h5 class="font-weight-bold">
                 AT ${new Date(`1970-01-01T${title.causelist_time}`)
        .toLocaleTimeString('en-IN', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        })
        .toUpperCase()}
               </h5>`
      : ''
    }

        <h5 class="font-weight-bold">
          ${title.coram.split(',').join('<br>')}
        </h5>

        ${title.cheader
      ? `<h6 class="font-weight-bold">
                 ${title.cheader.replace(/\n/g, '<br>')}
               </h6>`
      : ''
    }

        ${title.vc_link
      ? `<h6>
                VC LINK :
                <a href="${title.vc_link}" target="_blank">
                  ${title.vc_link}
                </a>
              </h6>`
      : ''
    }
      </b>
    </div>
  `;
}

function renderRow(row: any) {
  const caseNo = row.main_case_no || '';
  const iaCase = row.if_listed_as_IA_string || '';
  const purpose = row.purpose_name || '';

  return `
    <div class="rowEcourt mb-2">
      <ul>
        <li class="liEcourt px-3">

          <div class="d-flex justify-content-between align-items-start">

            <!-- LEFT: Item + Case -->
            <div class="groupbody">
              <div>
                <span
                  class="spanclik"
                  onclick="openCase('${row.main_case_no}')"
                >
                  ${row.main_case_no}
                </span>

                ${iaCase ? `
                  <span class="dot-sm mx-1">•</span>
                  <span class="spanclik">${iaCase}</span>
                ` : ''}
              </div>

              <!-- Petitioner / Respondent -->
              <div class="trim-info mt-1">
                <strong>${row.pet_name || ''}</strong>
                <span class="dot-sm mx-1">•</span>
                <strong>${row.res_name || ''}</strong>
              </div>

              <!-- Advocates -->
              <div class="trim-info text-muted">
                ${row.pet_adv || '—'}
                ${row.res_adv ? ' / ' + row.res_adv : ''}
              </div>
            </div>

            <!-- RIGHT: Purpose -->
            <div class="text-end">
              <span class="badge bg-light text-dark">
                ${purpose}
              </span>
            </div>

          </div>

        </li>
      </ul>
    </div>
  `;
}

// function renderCases(tabs: any[]): string {
//     return tabs.map((case2, index) => `
//     ${renderPurposeHeader(case2, tabs[index - 1])}
//     ${renderCaseRow(case2)}
//     ${renderConnectedCases(case2)}
//   `).join('');
// }

// function renderPurposeHeader(curr: any, prev: any): string {
//     if (!prev || curr.purpose_name !== prev.purpose_name) {
//         return `
//       <div class="mb-3 text-center">
//         <b>
//           <u>${curr.purpose_name}</u><br>
//           ${curr.purpose_header
//                 ? `<u>(${curr.purpose_header})</u>`
//                 : ''
//             }
//         </b>
//       </div>
//     `;
//     }
//     return '';
// }

// function renderCaseRow(c: any): string {
//     return `
//     <div class="row mb-3 border-bottom">
//       <div class="col-lg-3">
//         <b>${c.itemNo})</b><br>
//         <span class="font-weight-bold">${c.main_case_no}</span>
//       </div>

//       <div class="col-lg-3">
//         ${c.pet_name}<br><b>Vs</b><br>${c.res_name}
//       </div>

//       <div class="col-lg-3">${c.pet_adv || ''}</div>
//       <div class="col-lg-3">${c.res_adv || ''}</div>
//     </div>
//   `;
// }

// function renderConnectedCases(c: any): string {
//     if (!c.connectedCases || c.connectedCases.length === 0) return '';

//     return c.connectedCases.map((cc: any) => `
//     <div class="row ml-4 mb-2">
//       <div class="col-lg-3">
//         <b>in</b> ${cc.main_case_no}
//       </div>
//       <div class="col-lg-3">
//         ${cc.pet_name}<br><b>Vs</b><br>${cc.res_name}
//       </div>
//       <div class="col-lg-3">${cc.pet_adv || ''}</div>
//       <div class="col-lg-3">${cc.res_adv || ''}</div>
//     </div>
//   `).join('');
// }