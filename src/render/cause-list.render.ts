function openPdfInNewTab(pdfPath: string) {
  if (!pdfPath) {
    alert('PDF not available for this case');
    return;
  }

  // const url =
  //   `/pdfviewer.html?file=` +
  //   encodeURIComponent(pdfPath);

  // pdfPath = "/pdfs/sample.pdf";
  const url =
    `/pdfviewer.html?file=` +
    encodeURIComponent(pdfPath);

  window.open(url, '_blank');
}
(window as any).openPdfInNewTab = openPdfInNewTab;


// Helper to strip HTML from strings if needed, though renderRow usually handles it.
function matchEstiCode(cino: string): string {
  if (!cino) return '';
  return cino.startsWith('WBCHCO') ? 'WBCHCO' : 'WBCHCA';
}

export function renderCauseList(list: any[], title?: any): string {
  if (!list || !list.length) {
    return `<p>No cause list available</p>`;
  }

  // 1. Separate Main and Connected Cases
  // Main cases: link_main_sr_no is undefined/null/empty
  const mainCases = list.filter(item => !item.link_main_sr_no);

  // Connected cases: have link_main_sr_no
  const connectedCasesList = list.filter(item => item.link_main_sr_no);

  // 2. Map connected cases to their parent (Main) case
  const casesWithConnected = mainCases.map(main => {
    // Find children where link_main_sr_no matches main.sr_no
    // Ensure accurate type comparison (e.g. Number vs String)
    const children = connectedCasesList.filter(
      c => Number(c.link_main_sr_no) === Number(main.sr_no)
    );
    return { ...main, connectedCases: children };
  });

  // 3. Group the *main* cases (which now contain their children)
  const grouped = groupByPurpose(casesWithConnected);

  return `
    <div class="container-fluid pt-3">
      ${title ? renderCauseListHeader(title) : ''}
      <div class="content-container">
        ${Object.keys(grouped).map((purpose, index) =>
    renderPurposeSection(purpose, grouped[purpose], index)
  ).join('')}
      </div>
    </div>
  `;
}

function groupByPurpose(list: any[]) {
  return list.reduce((acc, item) => {
    const key = item.purpose_name || 'OTHER MATTERS';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, any[]>);
}

function renderPurposeSection(purpose: string, rows: any[], index: number) {
  return `
    <div class="mb-4">
      <!-- Purpose Header -->
      <div class="text-center mb-3">
         <h5 class="font-weight-bold"><u>${purpose}</u></h5>
      </div>

      ${index === 0 ? `
        <!-- Column Headers (Bold, No Borders) -->
        <div class="row mx-0 mb-2 px-3">
          <div class="font-weight-bold">Sr No</div>
          <div class="col-3 font-weight-bold">Case Number</div>
          <div class="col-4 font-weight-bold">Main Parties</div>
          <div class="col-3 font-weight-bold">Petitioner Advocate</div>
          <div class="font-weight-bold">Respondent Advocate</div>
        </div>
      ` : ''}

      <!-- Rows with Original UI -->
      ${rows.map((row, i) => renderRow(row, i + 1)).join('')}
    </div>
  `;
}

function renderRow(row: any, srNo: number) {
  // Parsing IA String Logic
  const getIADisplay = (data: any) => {
    if (data.if_listed_as_IA_string && data.if_listed_as_IA_string.length > 0) {
      const parts = data.if_listed_as_IA_string.split(' in ');
      if (parts[0]) {
        // return `IA NO. ${parts[0]} <br> <span class="ml-4"> In </span>`;
        return `IA NO. ${parts[0]}`;
      }
    }
    return '';
  };

  // Helper to render a single case block (Main or Connected)
  // We use this for the Main parts inside the row
  const renderContent = (data: any, isConnected: boolean = false, displaySrNo: any) => {
    const estiCode = matchEstiCode(data.cino);
    // Logic: If connected, use "wt"/"in" prefix AND the connected case's own sr_no
    const prefixStr = isConnected ? (estiCode === 'WBCHCO' ? 'wt' : estiCode == 'WBCHCA' ? 'in' : '') : '';
    // Display: "in 1)" or "29)"
    const finalDisplay = isConnected
      ? `${prefixStr} ` + (displaySrNo ? `${displaySrNo})` : '')
      : displaySrNo != '' ? `${displaySrNo})` : '';

    const getIADisplayResult = getIADisplay(data);

    return `
      <!-- Added pl-4 for connected cases alignment -->
      <div class="row mx-0 ${isConnected ? 'mt-2' : ''}">
        
        <!-- Sr No / Prefix -->
        <div class="font-weight-bolder">
           ${finalDisplay}
        </div>

        <!-- Case Number + IA + Actions -->
        <div class="col-3">
            <!-- Case Link -->
            <span class="spanclik font-weight-bold" 
                  style="cursor: pointer; color: #343a40;"
                  onclick="openCase('${data.cino}')">
               ${data.main_case_no}
            </span>
            
            <!-- Specific IA Listing -->
            ${getIADisplayResult ? `<br><div class="text-muted small mt-1">${getIADisplayResult}</div>` : ''}

            <!-- All IA String (Moved from footer) -->
            ${data.all_IA_string && data.all_IA_string.length > 0
        ? `<br><div class="text-muted small mt-1">IA NO: ${data.all_IA_string}</div>`
        : ''}

            <!-- Removed Action Dropdown as per request -->
            
            ${data.case_remark ? `<br><p class="m-0 text-muted small">${data.case_remark}</p>` : ''}
        </div>

        <!-- Main Parties -->
        <div class="col-4">
             ${data.pet_name} 
             ${data.petitionerorganization ? `(${data.petitionerorganization})` : ''}
             <br><b class="font-italic"> Vs </b><br>
             ${data.res_name}
             ${data.respondentorganization ? `(${data.respondentorganization})` : ''}
        </div>

        <!-- Petitioner Advocate -->
        <div class="col-3">
             <span [innerHTML]="${data.pet_adv}">${data.pet_adv || ''}</span>
        </div>

        <!-- Respondent Advocate -->
        <div class="word-break-all">
             <span [innerHTML]="${data.res_adv}">${data.res_adv || ''}</span>
        </div>
      </div>
  `;
  };

  return `
    <div style="box-shadow: 0 0 5px rgba(0, 0, 0, .5); margin: 8px 4px;" class="rowEcourt mb-2">
      <ul class="pl-4">
        <li class="liEcourt px-3">
          
          <!-- MAIN CASE -->
          ${renderContent(row, false, row.sr_no)}

          <!-- CONNECTED CASES -->
          ${row.connectedCases && row.connectedCases.length > 0
      ? row.connectedCases.map((conn: any) => renderContent(conn, true, conn.sr_no)).join('')
      : ''}

        </li>
      </ul>
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