// ═══════════════════════════════════════════════════════
// RENDER NAV
// ═══════════════════════════════════════════════════════
function renderNav() {
  const inTxSection = ['transactions','categories','recurring'].includes(currentView);
  const isActive = v => v==='dashboard' ? currentView==='dashboard' : v==='transactions' ? inTxSection : currentView===v;
  const items = [['dashboard','🏠','Home'],['transactions','💸','Transactions'],['accounts','🏦','Accounts'],['goals','🎯','Goals']];
  const subNav = inTxSection ? `
    <div class="flex border-b mb-5" style="border-color:rgba(255,255,255,0.05);margin-top:0">
      ${[['transactions','Transactions'],['categories','Categories'],['recurring','Recurring']].map(([k,lbl])=>`
        <button onclick="setView('${k}')" style="background:none;border:none;border-bottom:2px solid ${currentView===k?'#6366f1':'transparent'};cursor:pointer;padding:8px 14px;font-size:13px;font-family:inherit;color:${currentView===k?'#e5e7eb':'#6b7280'};font-weight:${currentView===k?'600':'400'};white-space:nowrap;margin-bottom:-1px">${lbl}</button>`).join('')}
    </div>` : '<div class="mb-7"></div>';
  const firstName = currentUser
    ? ((currentUser.user_metadata?.full_name?.split(' ')[0] || currentUser.email?.split('@')[0] || 'there').replace(/^./, c => c.toUpperCase()))
    : 'there';
  const hr = new Date().getHours();
  const timeGreeting = hr < 5 ? 'Good night' : hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : hr < 21 ? 'Good evening' : 'Good night';
  const sublines = [
    "See how much money you have today.",
    "Let's check where your money went.",
    "Your finances at a glance — all yours.",
    "Every peso accounted for.",
    "Small habits, big results. Keep tracking.",
    "Money clarity starts here.",
    "Stay on top of your spending today.",
    "Let's make sure your budget's on track.",
    "Your net worth, updated and honest.",
    "Know your numbers, own your future.",
    "Check in — your wallet will thank you.",
    "Awareness is the first step to saving more.",
    "A quick look at your financial health.",
    "Where did it all go? Let's find out.",
    "You're doing great — let's keep it that way.",
    "Spending smart starts with looking back.",
    "Money managed is stress relieved.",
    "Your cash flow, crystal clear.",
    "See what's in, what's out, what's left.",
    "One dashboard, full financial picture.",
  ];
  // Seeded random by date so it changes daily but stays consistent within the day
const subline = sublines[_sessionSublineIndex];
  const showGreeting = currentView === 'dashboard';
  return `
    ${showGreeting ? `
    <div class="greeting-wrap">
      <div class="greeting-time">${timeGreeting}, ${firstName}. 👋</div>
      <div class="greeting-sub">${subline}</div>
    </div>` : `<div class="flex items-center gap-2 text-lg font-bold mb-2 cursor-pointer select-none" onclick="setView('dashboard')" title="Back to Dashboard" style="color:#f1f1f3;letter-spacing:-0.01em">💰 Personal Finance</div>`}
    <div class="top-nav-wrap">
      <nav class="nav-scroll flex gap-1 text-sm mb-0" style="padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,0.06)">
        ${items.map(([k,ic,lbl])=>`<span class="nav-item ${isActive(k)?'active':''}" onclick="setView('${k}')" style="${isActive(k)?'':'color:#6b7280'}">${ic} ${lbl}</span>`).join('')}
      </nav>
    </div>
    ${subNav}`;
}

// ═══════════════════════════════════════════════════════
// RENDER TRANSACTIONS
// ═══════════════════════════════════════════════════════
function renderTransactions() {
  // Filter transactions
  const yr = now.getFullYear(), mo = now.getMonth();
  const lastMoYr = mo === 0 ? yr - 1 : yr;
  const lastMo   = mo === 0 ? 11 : mo - 1;
  let list = [...state.transactions].sort((a,b)=>new Date(b.date)-new Date(a.date));
  if      (txUI.filter==='month')     list = list.filter(t=>{ const d=new Date(t.date+'T00:00:00'); return d.getFullYear()===yr&&d.getMonth()===mo; });
  else if (txUI.filter==='lastMonth') list = list.filter(t=>{ const d=new Date(t.date+'T00:00:00'); return d.getFullYear()===lastMoYr&&d.getMonth()===lastMo; });
  else if (txUI.filter==='expense')   list = list.filter(t=>t.type==='expense');
  else if (txUI.filter==='income')    list = list.filter(t=>t.type==='income');

  const totalIncome   = list.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount,0);
  const totalExpense  = list.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount,0);
  const net = totalIncome - totalExpense;

  // Group by date
  const grouped = {};
  list.forEach(t => { if(!grouped[t.date]) grouped[t.date]=[]; grouped[t.date].push(t); });
  const sortedDates = Object.keys(grouped).sort((a,b)=>new Date(b)-new Date(a));

  const rowsHTML = sortedDates.map(date => {
    const rows = grouped[date].map(tx => {
      const cat    = state.categories.find(c=>c.id===tx.categoryId);
      const subcat = cat?.subs.find(s=>s.id===tx.subcategoryId);
      const isDeleting = txUI.deleteId === tx.id;
      if (isDeleting) return `
        <div class="tx-row" style="background:#1a0f0f;border-radius:10px;padding:10px 12px;margin:4px 0;border:1px solid #7f1d1d">
          <div class="flex-1 text-sm" style="color:#fca5a5">Delete <strong>${tx.description}</strong> (${fmt(tx.amount)})? This cannot be undone.</div>
          <div class="flex gap-2 flex-shrink-0">
            <button onclick="txConfirmDelete()" class="text-xs px-3 py-1.5 rounded-lg font-semibold" style="background:#ef4444;border:none;color:#fff;cursor:pointer">Delete</button>
            <button onclick="txCancelDelete()" class="text-xs px-3 py-1.5 rounded-lg" style="background:rgba(255,255,255,0.08);border:none;color:#9ca3af;cursor:pointer">Cancel</button>
          </div>
        </div>`;
      return `
        <div class="tx-row">
          <div class="tx-icon">${cat?.icon||'💸'}</div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate" style="color:#f1f1f3">${tx.description}</div>
            <div class="text-xs mt-0.5" style="color:#6b7280">${tx.type==='transfer'?`🔄 Transfer → ${findAccount(tx.toAccountId)?.name||'?'}`:cat?.name||''}${subcat?' · '+subcat.name:''}${(() => { const a=findAccount(tx.accountId); return a ? ` · <span style="color:${state.creditCards.find(c=>c.id===tx.accountId)?'#f59e0b':'#6b7280'}">${a.icon||''}${state.creditCards.find(c=>c.id===tx.accountId)?' CC':''} ${a.name}</span>` : ''; })()}</div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <div class="text-sm font-semibold ${tx.type==='income'?'text-emerald-400':tx.type==='transfer'?'text-indigo-400':'text-red-400'}">
              ${tx.type==='income'?'+':tx.type==='transfer'?'⇄':'-'}${fmt(tx.amount)}
            </div>
            <button onclick="txOpenEdit('${tx.id}')" class="text-gray-600 hover:text-indigo-400 transition-colors text-sm leading-none" style="background:none;border:none;cursor:pointer;padding:2px 4px" title="Edit">✏️</button>
            <button onclick="txAskDelete('${tx.id}')" class="text-gray-700 hover:text-red-400 transition-colors text-base leading-none" style="background:none;border:none;cursor:pointer;padding:2px 4px">×</button>
          </div>
        </div>`;
    }).join('');
    return `
      <div class="mb-4">
        <div class="section-label mb-2">${fmtDate(date)}</div>
        ${rows}
      </div>`;
  }).join('');



  const filterLabels = {month:'This Month', lastMonth:'Last Month', expense:'Expenses', income:'Income', all:'All Time'};
  const filters = ['month','lastMonth','expense','income','all'];

  // Modal: supports Add and Edit mode
  const activeCatOptions = (type, selId='') => state.categories.filter(c=>c.type===type&&c.active)
    .map(c=>`<option value="${c.id}" ${c.id===selId?'selected':''}>${c.icon} ${c.name}</option>`).join('');
  const acctOptions = (selId='', includeCCs=true) => {
    const debitOpts = state.accounts.map(a=>`<option value="${a.id}" ${a.id===selId?'selected':''}>${a.icon||'🏦'} ${a.name}</option>`).join('');
    const ccOpts    = includeCCs ? state.creditCards.map(c=>`<option value="${c.id}" ${c.id===selId?'selected':''}>${c.icon||'💳'} ${c.name} (CC)</option>`).join('') : '';
    if (!ccOpts) return debitOpts;
    return `<optgroup label="── Debit / Cash ──">${debitOpts}</optgroup><optgroup label="── Credit Cards ──">${ccOpts}</optgroup>`;
  };

  let modalHtml = '';
  if (txUI.showModal) {
    const ex = txUI.editId ? state.transactions.find(t=>t.id===txUI.editId) : null;
    const initType  = ex?.type || 'expense';
    const initDate  = ex?.date || todayISO;
    const initAmt   = ex?.amount || '';
    const initDesc  = ex?.description || '';
    const initNotes = ex?.notes || '';
    const initCat   = ex?.categoryId || '';
    const initSubCat= ex?.subcategoryId || '';
    const initAcct  = ex?.accountId || '';
    const initToAcct= ex?.toAccountId || '';
    const isEdit    = !!ex;
    // Pre-build subcategory options for edit mode
    const initSubOpts = (() => {
      if (!initCat) return '<option value="">— Select subcategory (optional) —</option>';
      const c = state.categories.find(x=>x.id===initCat);
      if (!c) return '<option value="">— Select subcategory (optional) —</option>';
      return '<option value="">— Select subcategory (optional) —</option>' +
        c.subs.filter(s=>s.active).map(s=>`<option value="${s.id}" ${s.id===initSubCat?'selected':''}>${s.name}</option>`).join('');
    })();
    const btnStyle = (t) => t===initType
      ? `background:#1c2028;border:1px solid rgba(255,255,255,0.08);color:${t==='income'?'#34d399':t==='expense'?'#f87171':'#a5b4fc'}`
      : 'background:transparent;border:1px solid transparent;color:#6b7280';
    modalHtml = `
    <div class="modal-overlay fixed inset-0 flex items-end sm:items-center justify-center" style="z-index:200;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)" onclick="txCloseModal()">
      <div class="w-full sm:w-96 rounded-t-3xl sm:rounded-2xl p-6" style="background:#1c2028;border:1px solid rgba(255,255,255,0.09);max-height:92vh;overflow-y:auto;box-shadow:0 -8px 40px rgba(0,0,0,0.4)" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between mb-5">
          <div class="text-lg font-bold">${isEdit?'Edit Transaction':'Add Transaction'}</div>
          <button onclick="txCloseModal()" style="background:none;border:none;color:#6b7280;cursor:pointer;font-size:20px;line-height:1">×</button>
        </div>

        <div class="field-label">TYPE</div>
        <div class="inline-flex p-1 rounded-xl mb-4 gap-1 w-full" style="background:#16191f;border:1px solid rgba(255,255,255,0.05)">
          <button id="btn-expense"  onclick="txSetType('expense')"  class="flex-1 rounded-lg py-2 text-sm font-medium" style="${btnStyle('expense')}">💸 Expense</button>
          <button id="btn-income"   onclick="txSetType('income')"   class="flex-1 rounded-lg py-2 text-sm font-medium" style="${btnStyle('income')}">💰 Income</button>
          <button id="btn-transfer" onclick="txSetType('transfer')" class="flex-1 rounded-lg py-2 text-sm font-medium" style="${btnStyle('transfer')}">🔄 Transfer</button>
        </div>
        <input type="hidden" id="tx-type" value="${initType}">

        <div class="mb-3">
          <div class="field-label">DATE *</div>
          <input id="tx-date" type="date" value="${initDate}" class="field-input">
        </div>
        <div class="mb-3">
          <div class="field-label">AMOUNT (₱) *</div>
          <input id="tx-amount" type="number" step="0.01" min="0" placeholder="0.00" value="${initAmt}" class="field-input">
        </div>
        <div class="mb-3">
          <div class="field-label">DESCRIPTION *</div>
          <input id="tx-desc" type="text" placeholder="e.g. Jollibee lunch" value="${initDesc.replace(/"/g,'&quot;')}" class="field-input">
        </div>

        <div id="tx-cat-wrap" class="mb-3" style="${initType==='transfer'?'display:none':''}">
          <div class="field-label">CATEGORY ${initType!=='transfer'?'*':''}</div>
          <select id="tx-cat" class="field-select" onchange="txUpdateSubDropdown()">
            <option value="">— Select category —</option>
            ${activeCatOptions(initType==='income'?'income':'expense', initCat)}
          </select>
        </div>
        <div id="tx-subcat-wrap" class="mb-3" style="${initType==='transfer'?'display:none':''}">
          <div class="field-label">SUBCATEGORY</div>
          <select id="tx-subcat" class="field-select">${initSubOpts}</select>
        </div>

        <div class="mb-3">
          <div class="field-label">FROM ACCOUNT *</div>
          <select id="tx-account" class="field-select">
            <option value="">— Select account —</option>
            ${acctOptions(initAcct)}
          </select>
        </div>
        <div id="tx-toaccount-wrap" class="mb-3" style="${initType!=='transfer'?'display:none':''}">
          <div class="field-label">TO ACCOUNT *</div>
          <select id="tx-toaccount" class="field-select">
            <option value="">— Select destination account —</option>
            ${acctOptions(initToAcct, false)}
          </select>
        </div>

        <div class="mb-5">
          <div class="field-label">NOTES (optional)</div>
          <input id="tx-notes" type="text" placeholder="Optional notes..." value="${initNotes.replace(/"/g,'&quot;')}" class="field-input">
        </div>

        <div id="tx-error" class="text-red-400 text-xs mb-3"></div>

        <div class="flex gap-3">
          <button onclick="txSave()" class="flex-1 rounded-xl py-3 font-semibold text-white text-sm" style="background:#6366f1;border:none;cursor:pointer;box-shadow:0 2px 12px rgba(99,102,241,0.35);letter-spacing:0.01em">${isEdit?'Update Transaction':'Save Transaction'}</button>
          <button onclick="txCloseModal()" class="flex-1 rounded-xl py-3 text-sm" style="background:#16191f;border:1px solid rgba(255,255,255,0.08);color:#9ca3af;cursor:pointer">Cancel</button>
        </div>
      </div>
    </div>`;
  }
  const modal = modalHtml;

  return `
    ${renderNav()}
    <div class="flex items-center justify-between mb-1">
      <div class="text-2xl font-bold">Transactions</div>
      <button onclick="txOpenModal()" class="rounded-xl px-4 py-2.5 text-sm font-semibold text-white flex-shrink-0"
        style="background:#6366f1;border:none;cursor:pointer">+ Add</button>
    </div>
    <div class="section-label mb-5">${state.transactions.length} Total &nbsp;&middot;&nbsp; ${list.length} In View</div>

    <!-- Summary bar -->
    <div class="grid grid-cols-3 gap-3 mb-5">
      <div class="rounded-xl p-3 text-center" style="background:#1c2028">
        <div class="section-label mb-1">INCOME</div>
        <div class="font-bold text-emerald-400 text-sm">${fmt(totalIncome)}</div>
      </div>
      <div class="rounded-xl p-3 text-center" style="background:#1c2028">
        <div class="section-label mb-1">EXPENSES</div>
        <div class="font-bold text-red-400 text-sm">${fmt(totalExpense)}</div>
      </div>
      <div class="rounded-xl p-3 text-center" style="background:#1c2028">
        <div class="section-label mb-1">NET</div>
        <div class="font-bold text-sm ${net>=0?'text-emerald-400':'text-red-400'}">${net>=0?'+':''}${fmt(net)}</div>
      </div>
    </div>

    <!-- Filter tabs -->
    <div class="flex gap-2 mb-5 flex-wrap">
      ${filters.map(f=>`
        <button onclick="txSetFilter('${f}')" class="text-xs px-3 py-1.5 rounded-full transition-all"
          style="${txUI.filter===f?'background:#6366f1;color:#fff;border:1px solid #6366f1':'background:#1c2028;color:#9ca3af;border:1px solid rgba(255,255,255,0.08)'}">
          ${filterLabels[f]}
        </button>`).join('')}
    </div>

    <!-- Transaction list -->
    <div class="rounded-2xl p-4" style="background:#1c2028">
      ${list.length === 0
        ? `<div class="text-center py-12" style="color:#6b7280">
            <div class="text-4xl mb-3">💸</div>
            <div class="font-semibold mb-1" style="color:#9ca3af">No transactions</div>
            <div class="text-sm">Click "+ Add" to log your first one.</div>
          </div>`
        : rowsHTML}
    </div>
    ${modal}`;
}

// ═══════════════════════════════════════════════════════
// RENDER CATEGORIES
// ═══════════════════════════════════════════════════════
function renderCategories() {
  const all=state.categories, filtered=all.filter(c=>c.type===catUI.tab);
  const expCount=all.filter(c=>c.type==='expense').length, incCount=all.filter(c=>c.type==='income').length;
  const activeCount=filtered.filter(c=>c.active).length;
  const cards=filtered.map(cat=>{
    const isExpanded=catUI.expanded===cat.id, activeSubs=cat.subs.filter(s=>s.active).length;
    const toggleBg=cat.active?'#10b981':'rgba(255,255,255,0.08)', knobLeft=cat.active?'19px':'3px';
    const subsSection=isExpanded?`
      <div style="background:#16191f;border-top:1px solid rgba(255,255,255,0.05)" class="px-4 pt-3 pb-4 rounded-b-2xl">
        <div class="section-label mb-2.5">SUBCATEGORIES — double-click to rename</div>
        <div class="flex flex-wrap gap-1.5 mb-3">
          ${cat.subs.map(s=>`<span class="chip${s.active?'':' off'}">
            <span id="sub-name-${s.id}" ondblclick="catStartRenameSub('${cat.id}','${s.id}')" style="cursor:text">${s.name}</span>
            <button class="chip-btn" onclick="catToggleSub('${cat.id}','${s.id}')">${s.active?'●':'○'}</button>
            <button class="chip-btn" onclick="catDeleteSub('${cat.id}','${s.id}')">×</button>
          </span>`).join('')}
        </div>
        <div class="flex gap-2 items-center">
          <input id="new-sub-${cat.id}" class="add-sub-input" placeholder="New subcategory…" onkeydown="if(event.key==='Enter')catAddSub('${cat.id}')">
          <button onclick="catAddSub('${cat.id}')" class="text-xs px-3 py-1.5 rounded-full text-white font-semibold" style="background:#6366f1;border:none;cursor:pointer">Add</button>
        </div>
      </div>`:'' ;
    return `<div class="rounded-2xl overflow-hidden" style="background:#1c2028;${cat.active?'':'opacity:0.5'}">
      <div class="flex items-center gap-3 p-4">
        <div id="cat-icon-${cat.id}" onclick="catStartRenameIcon('${cat.id}')" class="flex-shrink-0 flex items-center justify-center rounded-xl text-xl cursor-pointer" style="width:44px;height:44px;background:#16191f;border:1px solid rgba(255,255,255,0.05)">${cat.icon}</div>
        <div class="flex-1 min-w-0">
          <div id="cat-name-${cat.id}" ondblclick="catStartRenameCategory('${cat.id}')" class="font-semibold text-sm truncate" style="color:#f1f1f3;cursor:text">${cat.name}</div>
          <div class="text-xs mt-0.5" style="color:#6b7280">${activeSubs}/${cat.subs.length} subcategories</div>
        </div>
        <div class="flex items-center gap-3 flex-shrink-0">
          <div class="cat-toggle" onclick="catToggle('${cat.id}')" style="width:38px;height:22px;background:${toggleBg}"><div class="cat-toggle-knob" style="left:${knobLeft}"></div></div>
          <button onclick="catToggleExpand('${cat.id}')" style="background:none;border:none;cursor:pointer;color:#9ca3af;font-size:20px;line-height:1;padding:0;transform:rotate(${isExpanded?'180':'0'}deg);transition:transform 0.2s">⌄</button>
        </div>
      </div>${subsSection}</div>`;
  }).join('');
  const modal=catUI.showModal?`
    <div class="fixed inset-0 z-50 flex items-center justify-center" style="background:rgba(0,0,0,0.8)" onclick="catCloseModal()">
      <div class="rounded-2xl p-7 w-80" style="background:#1c2028;border:1px solid rgba(255,255,255,0.08)" onclick="event.stopPropagation()">
        <div class="text-lg font-bold mb-1">New ${catUI.tab==='expense'?'Expense':'Income'} Category</div>
        <div class="text-sm mb-5" style="color:#6b7280">Fill in the details below.</div>
        <div class="section-label mb-1.5">EMOJI ICON</div>
        <input id="modal-icon" placeholder="🗂️" class="w-full rounded-xl p-3 mb-4 text-2xl" style="background:#16191f;border:1px solid rgba(255,255,255,0.08);color:#f1f1f3;outline:none;font-family:inherit">
        <div class="section-label mb-1.5">CATEGORY NAME</div>
        <input id="modal-name" placeholder="e.g. Education" onkeydown="if(event.key==='Enter')catAddFromModal();if(event.key==='Escape')catCloseModal()" class="w-full rounded-xl p-3 mb-6" style="background:#16191f;border:1px solid rgba(255,255,255,0.08);color:#f1f1f3;outline:none;font-size:15px;font-family:inherit">
        <div class="flex gap-3">
          <button onclick="catAddFromModal()" class="flex-1 rounded-xl py-3 text-sm font-semibold text-white" style="background:#6366f1;border:none;cursor:pointer">Add Category</button>
          <button onclick="catCloseModal()" class="flex-1 rounded-xl py-3 text-sm" style="background:#16191f;border:1px solid rgba(255,255,255,0.08);color:#9ca3af;cursor:pointer">Cancel</button>
        </div>
      </div>
    </div>`:'' ;
  return `${renderNav()}
    <div class="flex items-center justify-between mb-1">
      <div class="text-2xl font-bold">Categories</div>
      <button onclick="catOpenModal()" class="rounded-xl px-4 py-2.5 text-sm font-semibold text-white flex-shrink-0" style="background:#6366f1;border:none;cursor:pointer">+ Add</button>
    </div>
    <div class="section-label mb-5">${expCount} Expense &nbsp;&middot;&nbsp; ${incCount} Income &nbsp;&middot;&nbsp; ${activeCount} Active</div>
    <div class="inline-flex p-1 rounded-xl mb-5 gap-1" style="background:#16191f;border:1px solid rgba(255,255,255,0.05)">
      <button onclick="catSetTab('expense')" class="rounded-lg px-5 py-2 text-sm font-medium" style="${catUI.tab==='expense'?'background:#1c2028;color:#f1f1f3;border:1px solid rgba(255,255,255,0.08)':'background:transparent;color:#6b7280;border:1px solid transparent'}">💸 Expense (${expCount})</button>
      <button onclick="catSetTab('income')" class="rounded-lg px-5 py-2 text-sm font-medium" style="${catUI.tab==='income'?'background:#1c2028;color:#f1f1f3;border:1px solid rgba(255,255,255,0.08)':'background:transparent;color:#6b7280;border:1px solid transparent'}">💰 Income (${incCount})</button>
    </div>
    <div class="text-xs mb-4" style="color:#6b7280">💡 Double-click to rename &nbsp;·&nbsp; Click emoji to change</div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${filtered.length===0?`<div class="col-span-2 text-center py-16" style="color:#6b7280"><div class="text-5xl mb-3">🗂️</div><div class="font-semibold mb-1" style="color:#9ca3af">No categories</div></div>`:cards}</div>
    ${modal}`;
}

// ═══════════════════════════════════════════════════════
// RENDER PLACEHOLDER
// ═══════════════════════════════════════════════════════
function renderPlaceholder(label, icon, note) {
  return `${renderNav()}
    <div class="flex flex-col items-center justify-center py-24 text-center">
      <div class="text-5xl mb-4">${icon}</div>
      <div class="text-xl font-bold mb-2">${label}</div>
      <div class="text-sm max-w-xs" style="color:#6b7280">${note}</div>
      <div class="mt-5 text-xs px-4 py-2 rounded-full" style="color:#6b7280;border:1px solid rgba(255,255,255,0.05)">Coming soon</div>
    </div>`;
}

// ═══════════════════════════════════════════════════════
// RENDER DASHBOARD
// ═══════════════════════════════════════════════════════
function renderDashboard() {
  // Empty state for brand new users
  if (!state.accounts.length && !state.transactions.length) {
    return `
      ${renderNav()}
      <div style="text-align:center;padding:60px 24px">
        <div style="font-size:56px;margin-bottom:16px">👋</div>
        <div style="font-size:20px;font-weight:700;color:#f1f1f3;margin-bottom:8px">Welcome to Personal Finance</div>
        <div style="color:#6b7280;font-size:14px;line-height:1.7;margin-bottom:32px">Get started by adding your bank accounts,<br>or import your existing data below.</div>
        <div style="display:flex;flex-direction:column;gap:12px;max-width:300px;margin:0 auto">
          <button onclick="setView('accounts')" style="padding:14px;border-radius:12px;background:#6366f1;border:none;color:#fff;font-size:14px;font-weight:600;cursor:pointer">🏦 Add My Accounts</button>
          <button onclick="showImportPanel()" style="padding:14px;border-radius:12px;background:#1c2028;border:1px solid rgba(255,255,255,0.08);color:#c9cdd5;font-size:14px;font-weight:600;cursor:pointer">📥 Import Existing Data</button>
        </div>
        <div id="import-panel" style="display:none;margin-top:24px;background:#1c2028;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:20px;text-align:left">
          <div style="font-weight:600;margin-bottom:4px;color:#f1f1f3">Import Your Data</div>
          <div style="color:#6b7280;font-size:12px;margin-bottom:16px">CSV is the easiest — works from Excel, Google Sheets, or any app</div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <button onclick="importCSV()" style="padding:12px 14px;border-radius:10px;background:#6366f1;border:none;color:#fff;font-size:13px;cursor:pointer;text-align:left;font-weight:600">
              📊 Import Transactions from CSV
            </button>
            <button onclick="importData()" style="padding:12px 14px;border-radius:10px;background:#16191f;border:1px solid rgba(255,255,255,0.08);color:#c9cdd5;font-size:13px;cursor:pointer;text-align:left">
              🗂 Restore from JSON Backup
            </button>
          </div>
          <div id="import-status" style="margin-top:12px;font-size:13px"></div>
          <details style="margin-top:16px">
            <summary style="color:#6b7280;font-size:12px;cursor:pointer;user-select:none">📋 CSV Format Guide</summary>
            <div style="margin-top:10px;background:#16191f;border-radius:8px;padding:12px;font-size:11px;color:#9ca3af;font-family:monospace;overflow-x:auto;white-space:nowrap">
              Date,Description,Type,Amount,Category,Subcategory,Account,Notes<br>
              2026-05-01,Jollibee,expense,150,Food,Fast Food,GCash,Lunch<br>
              2026-05-07,Upwork,income,50000,Freelance,Upwork,Unionbank,<br>
              2026-06-01,Rent,expense,22000,Housing,,Unionbank,June rent
            </div>
            <div style="margin-top:10px;color:#6b7280;font-size:11px;line-height:1.7">
              <strong style="color:#9ca3af">Required:</strong> Date (YYYY-MM-DD), Description, Type (expense/income/transfer), Amount<br>
              <strong style="color:#9ca3af">Optional:</strong> Category, Subcategory, Account, Notes<br>
              <strong style="color:#9ca3af">Tip:</strong> Category and Account names must match what you set up in this app
            </div>
          </details>
        </div>
      </div>`;
  }

  const nw=netWorth(), assets=totalAssets(), spendable=spendableAssets(), liab=totalLiab();
  const m=getMonthlyData();
  const net=m.income-m.expenses;
  const incomeW=Math.min((m.income/Math.max(m.income,m.expenses))*100,100);
  const expW=Math.min((m.expenses/Math.max(m.income,m.expenses))*100,100);
  // Auto-compute avg monthly expenses from last 3 months of actual transactions
  const autoAvgExp = (() => {
    const months = [];
    for (let i=1; i<=3; i++) {
      const mo = (now.getMonth()-i+12)%12, yr = now.getMonth()-i<0?now.getFullYear()-1:now.getFullYear();
      const sum = (state.transactions||[]).filter(t=>{ const d=new Date(t.date+'T00:00:00'); return t.type==='expense'&&d.getFullYear()===yr&&d.getMonth()===mo; }).reduce((s,t)=>s+t.amount,0);
      if (sum>0) months.push(sum);
    }
    return months.length>0 ? months.reduce((a,b)=>a+b,0)/months.length : (m.avgMonthlyExpenses||0);
  })();
  const dailyBurn = autoAvgExp/30;
  const runway = dailyBurn>0 ? Math.floor(spendable/dailyBurn) : 0;
  const savingsRate=m.income>0?((net/m.income)*100).toFixed(1):0;
  const maxCat=Math.max(...m.categories.map(c=>c.amount),1);
  const forecastEnd=toLocalISO(new Date(now.getTime()+(state.forecastDays||7)*24*60*60*1000));
  const forecastItems={
    income: (state.recurring||[]).filter(r=>r.type==='income' &&r.active&&r.nextDue<=forecastEnd),
    expense:(state.recurring||[]).filter(r=>r.type==='expense'&&r.active&&r.nextDue<=forecastEnd),
  };
  const forecastIncome=forecastItems.income.reduce((s,r)=>s+r.amount,0);
  const forecastExpense=forecastItems.expense.reduce((s,r)=>s+r.amount,0);
  // All CCs with outstanding balance — always shown so user never misses an obligation
  const ccDueForecast = (state.creditCards||[]).filter(c=>c.outstanding>0);
  // What's payable on the due date is the unpaid statement balance, not the full
  // outstanding (which includes new charges billed on the NEXT statement)
  const ccDueAmount = c => c.lastStatement>0
    ? Math.max(0, c.lastStatement - ccStatementPayments(c.id))
    : c.outstanding;
  // Only count toward "available" if due within the forecast window
  const ccForecastExp = ccDueForecast.filter(c=>{
    const dates = ccCycleDates(c.id);
    return dates && dates.due >= todayISO && dates.due <= forecastEnd;
  }).reduce((s,c)=>s+ccDueAmount(c),0);
  const available=spendable+forecastIncome-forecastExpense-ccForecastExp;
  // Compute vs Last Month dynamically
  const curMo=now.getMonth(), curYr=now.getFullYear();
  const prevMo=curMo===0?11:curMo-1, prevYr=curMo===0?curYr-1:curYr;
  const lastMoExp=state.transactions.filter(t=>{const d=new Date(t.date+'T00:00:00');return t.type==='expense'&&d.getFullYear()===prevYr&&d.getMonth()===prevMo;}).reduce((s,t)=>s+t.amount,0);
  const vsLastMo = lastMoExp>0 ? (((m.expenses-lastMoExp)/lastMoExp)*100).toFixed(0) : null;
  const vsLastMoLabel = vsLastMo===null ? '—' : (vsLastMo>=0?`↑ ${vsLastMo}%`:`↓ ${Math.abs(vsLastMo)}%`);
  const vsLastMoColor = vsLastMo===null ? 'text-gray-400' : (vsLastMo>=0 ? 'text-red-400' : 'text-emerald-400');

  return `${renderNav()}
    <div class="rounded-2xl p-6 mb-6" style="background:linear-gradient(135deg,#4338ca 0%,#6366f1 100%)">
      <div class="text-sm opacity-75 mb-1">Net worth</div>
      <div class="text-5xl font-bold tracking-tight mb-5">${fmt2(nw)}</div>
      <div class="flex gap-10">
        <div><div class="text-xs opacity-60 mb-0.5">Assets</div><div class="text-lg font-semibold">${fmt2(assets)}</div></div>
        <div><div class="text-xs opacity-60 mb-0.5">Liabilities</div><div class="text-lg font-semibold">${fmt2(liab)}</div></div>
      </div>
    </div>
    <div class="flex items-center justify-between mb-3"><div class="section-label">DEBIT ACCOUNTS</div><div class="text-xs text-emerald-400 font-medium">${fmt2(assets)}</div></div>
    <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
      ${state.accounts.map(a=>`<div class="bg-[#1c2028] rounded-xl p-4"><div class="text-xs text-gray-400 mb-2">${a.name}</div><div class="text-lg font-semibold">${editable(a.balance,`accounts.${a.id}.balance`,fmt)}</div></div>`).join('')}
    </div>
    <div class="flex items-center justify-between mb-3 mt-6"><div class="section-label">CREDIT CARDS</div><div class="text-xs text-red-400 font-medium">OWED ${fmt2(liab)}</div></div>
    <div class="space-y-3 mb-7">
      ${state.creditCards.map(c=>{
        const avail=c.limit-c.outstanding, pct=c.limit>0?Math.min((c.outstanding/c.limit)*100,100):0;
        return `<div class="bg-[#1c2028] rounded-xl p-4">
          <div class="flex justify-between items-start mb-3">
            <div><div class="font-medium">${c.name}</div><div class="text-xs text-gray-500 mt-0.5">${(()=>{const dd=ccCycleDates(c.id);return dd?`Due ${fmtDateShort(dd.due)} · ${dd.daysToDue} days away`:`Due ${c.dueDay}${sfx(c.dueDay)}`})()}</div></div>
            <div class="text-right"><div class="text-red-400 font-semibold">${fmt2(c.outstanding)}</div><div class="text-xs text-gray-500">avl. ${fmt2(avail)}</div></div>
          </div>
          <div class="bg-[#16191f] rounded-full overflow-hidden" style="height:3px"><div style="width:${pct}%;height:3px;background:#ef4444;border-radius:2px"></div></div>
        </div>`;}).join('')}
    </div>
    <div class="bg-[#1c2028] rounded-2xl p-5 mb-4">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2"><span>📊</span><span class="font-semibold">${m.label}</span></div>
        <div class="text-xs px-2.5 py-1 rounded-full font-semibold ${net>=0?'bg-emerald-900/40 text-emerald-400':'bg-red-900/40 text-red-400'}">${net>=0?'+':''}${fmt(net)}</div>
      </div>
      <div class="space-y-3">
        <div>
          <div class="flex justify-between text-sm mb-1.5"><span class="text-gray-400">Income</span><span class="text-emerald-400 font-medium">${fmt2(m.income)}</span></div>
          <div class="bg-[#16191f] rounded-full overflow-hidden" style="height:6px"><div style="width:${incomeW}%;height:6px;background:linear-gradient(90deg,#10b981,#34d399);border-radius:3px"></div></div>
        </div>
        <div>
          <div class="flex justify-between text-sm mb-1.5"><span class="text-gray-400">Expenses</span><span class="text-red-400 font-medium">${fmt2(m.expenses)}</span></div>
          <div class="bg-[#16191f] rounded-full overflow-hidden" style="height:6px"><div style="width:${expW}%;height:6px;background:linear-gradient(90deg,#ef4444,#f87171);border-radius:3px"></div></div>
        </div>
      </div>
      <div class="flex gap-4 mt-4 pt-4 border-t border-gray-800">
        <div class="flex-1 text-center"><div class="text-xs text-gray-500 mb-0.5">Net Income</div><div class="font-bold ${net>=0?'text-emerald-400':'text-red-400'}">${fmt(net)}</div></div>
        <div class="flex-1 text-center border-l border-gray-800"><div class="text-xs text-gray-500 mb-0.5">Savings Rate</div><div class="font-bold ${savingsRate>=20?'text-emerald-400':'text-amber-400'}">${savingsRate}%</div></div>
        <div class="flex-1 text-center border-l border-gray-800"><div class="text-xs text-gray-500 mb-0.5">vs Last Month</div><div class="font-bold ${vsLastMoColor}">${vsLastMoLabel}</div></div>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3 mb-4">
      <div class="bg-[#1c2028] rounded-2xl p-5">
        <div class="text-xs text-gray-500 mb-1">🔥 Daily Burn Rate</div>
        <div class="text-2xl font-bold">${fmt(dailyBurn)}</div>
        <div class="text-xs text-gray-600 mt-1">per day</div>
        <div class="mt-3 pt-3 border-t border-gray-800"><div class="text-xs text-gray-500">3-mo avg spend</div><div class="text-sm font-medium mt-0.5">${fmt(autoAvgExp)}</div></div>
      </div>
      <div class="bg-[#1c2028] rounded-2xl p-5">
        <div class="text-xs text-gray-500 mb-1">⏱️ Cash Runway</div>
        <div class="text-2xl font-bold ${runway<14?'text-red-400':runway<30?'text-amber-400':'text-emerald-400'}">${runway}</div>
        <div class="text-xs text-gray-600 mt-1">days remaining</div>
        <div class="mt-3 pt-3 border-t border-gray-800"><div class="text-xs ${runway<14?'text-red-400':runway<30?'text-amber-400':'text-gray-500'}">${runway<14?'⚠️ Income needed soon':runway<30?'Moderate cushion':'Good buffer'}</div></div>
      </div>
    </div>
    <div class="bg-[#1c2028] rounded-2xl p-5 mb-4">
      <div class="flex items-center gap-2 mb-4"><span>🏆</span><span class="font-semibold">Top Spending — ${m.label}</span></div>
      <div class="space-y-3">
        ${m.categories.map((c,i)=>{
          const pct=(c.amount/maxCat)*100;
          return `<div>
            <div class="flex justify-between items-center mb-1.5">
              <div class="flex items-center gap-2 text-sm"><span class="text-base">${c.icon}</span><span>${c.name}</span><span class="text-xs text-gray-600">#${i+1}</span></div>
              <span class="text-sm font-medium">${fmt(c.amount)}</span>
            </div>
            <div class="bg-[#16191f] rounded-full overflow-hidden" style="height:5px"><div style="width:${pct}%;height:5px;background:${c.color};border-radius:3px;opacity:0.85"></div></div>
          </div>`;}).join('')}
      </div>
    </div>
    <div class="bg-[#1c2028] rounded-2xl p-5 mb-4">
      <div class="flex items-center gap-2 mb-4"><span>🪙</span><span class="font-semibold">Spending Forecast</span></div>
      <div class="flex gap-2 mb-5 flex-wrap">
        ${[7,14,21,30].map(d=>`<button class="tab-btn text-xs px-3 py-1.5 rounded-full ${state.forecastDays===d?'active':'bg-[#2a2d35] text-gray-300'}" onclick="setForecast(${d})">${d} days</button>`).join('')}
      </div>
      <div class="flex justify-between py-2.5 border-b border-gray-800"><span class="text-sm">Spendable funds${spendable!==assets?' <span class="text-xs text-gray-600">(excl. maintaining bal.)</span>':''}</span><span class="font-semibold">${fmt2(spendable)}</span></div>
      <div class="text-xs text-gray-600 font-semibold tracking-wider mt-4 mb-2">SCHEDULED INCOME</div>
      ${forecastItems.income.length===0?`<div class="text-xs text-gray-700 py-1.5">None in this window</div>`:forecastItems.income.map(r=>`<div class="flex justify-between items-center py-1.5"><div class="text-sm flex items-center gap-2"><span>${r.icon}</span>${r.name}</div><div class="text-sm ${r.amount===0?'text-gray-700':'text-emerald-400'}">${r.amount===0?'—':'+ '+fmt(r.amount)}</div></div>`).join('')}
      <div class="text-xs text-gray-600 font-semibold tracking-wider mt-4 mb-2">SCHEDULED EXPENSES</div>
      ${forecastItems.expense.length===0&&ccForecastExp===0?`<div class="text-xs text-gray-700 py-1.5">None in this window</div>`:forecastItems.expense.map(r=>`<div class="flex justify-between items-center py-1.5"><div class="text-sm flex items-center gap-2"><span>${r.icon}</span>${r.name}</div><div class="text-sm text-red-400">− ${fmt(r.amount)}</div></div>`).join('')}
      ${ccDueForecast.map(c=>{ const dates=ccCycleDates(c.id); const inWindow=dates&&dates.due<=forecastEnd; return `<div class="flex justify-between items-center py-1.5"><div class="text-sm flex items-center gap-2"><span>💳</span>${c.name}<span class="text-xs ml-1" style="color:${inWindow?'#f59e0b':'#6b7280'}">due ${dates?fmtDateShort(dates.due):'—'}${inWindow?'':' · outside window'}</span></div><div class="text-sm" style="color:${inWindow?'#f87171':'#6b7280'}">− ${fmt(ccDueAmount(c))}</div></div>`; }).join('')}
      <div class="flex justify-between items-center pt-4 mt-3 border-t border-gray-800"><span class="font-semibold">Available to spend</span><span class="text-lg font-bold ${available>=0?'text-emerald-400':'text-red-400'}">${fmt2(available)}</span></div>
    </div>
      <div class="flex items-center gap-2 mb-4"><span>🎯</span><span class="font-semibold">Financial Goals</span></div>
      ${state.goals.map(g=>{
        const gs=computeGoalSaved(g);
        const remaining=Math.max(g.target-gs.total,0), months=monthsBetween(g.targetDate), monthly=months>0?remaining/months:remaining, daily=monthly/30;
        const pct=g.target>0?Math.min((gs.total/g.target)*100,100):0;
        const dateLabel=new Date(g.targetDate).toLocaleDateString('en-US',{month:'short',year:'numeric'});
        return `<div class="rounded-xl p-4" style="background:#0e1014">
          <div class="flex justify-between items-start mb-3">
            <div><div class="font-semibold">${g.icon} ${g.name}</div><div class="text-xs text-gray-500 mt-0.5">Target: ${dateLabel} · ${months} months away</div></div>
            <div class="text-xs px-2 py-1 rounded-full" style="background:rgba(99,102,241,0.15);color:#a5b4fc">${pct.toFixed(1)}%</div>
          </div>
          <div class="flex justify-between text-sm mb-1.5"><span class="text-gray-500">Saved so far</span><span class="font-semibold text-emerald-400">${fmt(gs.total)} <span class="text-gray-500">of ${fmt(g.target)}</span></span></div>
          <div class="bg-[#16191f] rounded-full overflow-hidden mb-4" style="height:6px"><div style="width:${pct.toFixed(1)}%;height:6px;background:linear-gradient(90deg,#f59e0b,#fbbf24);border-radius:3px"></div></div>
          <div class="grid grid-cols-3 gap-2">
            <div class="bg-[#1c2028] rounded-lg p-3"><div class="text-xs text-gray-500">Remaining</div><div class="font-semibold mt-0.5 text-sm">${fmt(remaining)}</div></div>
            <div class="bg-[#1c2028] rounded-lg p-3"><div class="text-xs text-gray-500">Monthly needed</div><div class="font-semibold mt-0.5 text-sm">${fmt(monthly)}</div></div>
            <div class="bg-[#1c2028] rounded-lg p-3"><div class="text-xs text-gray-500">Daily needed</div><div class="font-semibold mt-0.5 text-sm">${fmt(daily)}</div></div>
          </div>
        </div>`;}).join('')}
      <button class="w-full text-sm text-gray-600 mt-3 py-3 px-4 border border-dashed border-gray-800 rounded-xl hover:border-gray-600 hover:text-gray-400 transition-colors">+ Add another goal</button>
    </div>
    <div class="text-center text-xs text-gray-700 mt-8 pb-4">Click any number to edit · Changes saved automatically · <span class="cursor-pointer hover:text-indigo-400" onclick="setView('transactions')">View all transactions →</span></div>`;
}

// ═══════════════════════════════════════════════════════
// RENDER RECURRING
// ═══════════════════════════════════════════════════════
function renderRecurring() {
  const FREQ = { daily:'Daily', weekly:'Weekly', biweekly:'Bi-weekly', monthly:'Monthly', quarterly:'Quarterly', yearly:'Yearly' };
  const FREQ_MO = { daily:30.4, weekly:4.33, biweekly:2.17, monthly:1, quarterly:0.333, yearly:0.0833 };
  const recs = state.recurring || [];
  const active = recs.filter(r=>r.active);
  const monthlyExp = active.filter(r=>r.type==='expense').reduce((s,r)=>s+r.amount*(FREQ_MO[r.frequency]||1),0);
  const monthlyInc = active.filter(r=>r.type==='income').reduce((s,r)=>s+r.amount*(FREQ_MO[r.frequency]||1),0);

  const sorted = [...recs].sort((a,b)=>{
    const sc=x=>{ if(!x.active) return 10; if(x.nextDue<todayISO) return 0; if(x.nextDue===todayISO) return 1; return 2; };
    const d=sc(a)-sc(b); return d!==0?d:a.nextDue.localeCompare(b.nextDue);
  });

  function recModal(r) {
    const isEdit=!!r, pfx=isEdit?'edit-':'', title=isEdit?'Edit Recurring':'Add Recurring';
    const onClose=isEdit?'recCancelEdit()':'recCloseAdd()';
    const onSave=isEdit?`recUpdate('${r.id}')`:'recSave()';
    const errId=isEdit?'':'rec-err';
    const cats=state.categories.filter(c=>c.active);
    const selCat=r?.categoryId||'';
    const selSub=r?.subcategoryId||'';
    const subs=selCat?(cats.find(c=>c.id===selCat)?.subs||[]).filter(s=>s.active):[];
    return `
      <div class="fixed inset-0 flex items-end sm:items-center justify-center" style="z-index:200;background:rgba(0,0,0,0.8)" onclick="${onClose}">
        <div class="w-full sm:w-96 rounded-t-3xl sm:rounded-2xl p-6" style="background:#1c2028;border:1px solid rgba(255,255,255,0.08);max-height:92vh;overflow-y:auto" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-5">
            <div class="text-lg font-bold">${title}</div>
            <button onclick="${onClose}" style="background:none;border:none;color:#6b7280;cursor:pointer;font-size:22px;line-height:1">×</button>
          </div>
          <div class="grid gap-3 mb-3" style="grid-template-columns:56px 1fr">
            <div><div class="field-label">ICON</div><input type="hidden" id="${pfx}rec-icon" value="${r?r.icon||'🔁':'🔁'}">
              <button type="button" onclick="iconPickerOpen('${pfx}rec-icon','rec')" id="${pfx}rec-icon-btn" onmouseover="this.style.borderColor='#6366f1'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'" style="width:100%;height:44px;background:#16191f;border:1px solid rgba(255,255,255,0.08);border-radius:10px;font-size:24px;cursor:pointer;line-height:1;transition:border-color 0.15s">${r?r.icon||'🔁':'🔁'}</button></div>
            <div><div class="field-label">NAME *</div><input id="${pfx}rec-name" type="text" ${r?`value="${r.name}"`:'placeholder="e.g. Rent"'} class="field-input"></div>
          </div>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div><div class="field-label">TYPE</div>
              <select id="${pfx}rec-type" class="field-select">
                <option value="expense" ${r?.type==='expense'||!r?'selected':''}>💸 Expense</option>
                <option value="income"  ${r?.type==='income'?'selected':''}>💰 Income</option>
              </select>
            </div>
            <div><div class="field-label">FREQUENCY</div>
              <select id="${pfx}rec-freq" class="field-select">
                ${Object.entries(FREQ).map(([v,l])=>`<option value="${v}" ${r?.frequency===v?'selected':''}>${l}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3 mb-3">
            <div><div class="field-label">AMOUNT (₱) *</div><input id="${pfx}rec-amount" type="number" step="0.01" min="0" ${r?`value="${r.amount}"`:'placeholder="0.00"'} class="field-input"></div>
            <div><div class="field-label">NEXT DUE DATE</div><input id="${pfx}rec-due" type="date" value="${r?.nextDue||todayISO}" class="field-input"></div>
          </div>
          <div class="mb-3"><div class="field-label">CATEGORY (optional)</div>
            <select id="${pfx}rec-cat" class="field-select" onchange="recUpdateSub('${pfx}rec-cat','${pfx}rec-subcat')">
              <option value="">— None —</option>
              ${cats.map(c=>`<option value="${c.id}" ${selCat===c.id?'selected':''}>${c.icon} ${c.name}</option>`).join('')}
            </select>
          </div>
          <div class="mb-3"><div class="field-label">SUBCATEGORY (optional)</div>
            <select id="${pfx}rec-subcat" class="field-select">
              <option value="">— All —</option>
              ${subs.map(s=>`<option value="${s.id}" ${selSub===s.id?'selected':''}>${s.name}</option>`).join('')}
            </select>
          </div>
          <div class="mb-5"><div class="field-label">ACCOUNT (optional)</div>
            <select id="${pfx}rec-acct" class="field-select">
              <option value="">— None —</option>
              <optgroup label="── Debit / Cash ──">
                ${state.accounts.map(a=>`<option value="${a.id}" ${r?.accountId===a.id?'selected':''}>${a.icon||''} ${a.name}</option>`).join('')}
              </optgroup>
              ${state.creditCards.length?`<optgroup label="── Credit Cards ──">${state.creditCards.map(c=>`<option value="${c.id}" ${r?.accountId===c.id?'selected':''}>${c.icon||'💳'} ${c.name} (CC)</option>`).join('')}</optgroup>`:''}
            </select>
          </div>
          ${errId?`<div id="${errId}" class="text-red-400 text-xs mb-3"></div>`:''}
          <div class="flex gap-3">
            <button onclick="${onSave}" class="flex-1 rounded-xl py-3 font-semibold text-white text-sm" style="background:#6366f1;border:none;cursor:pointer">${isEdit?'Save Changes':'Add Recurring'}</button>
            <button onclick="${onClose}" class="flex-1 rounded-xl py-3 text-sm" style="background:#16191f;border:1px solid rgba(255,255,255,0.08);color:#9ca3af;cursor:pointer">Cancel</button>
          </div>
        </div>
      </div>`;
  }

  function recCard(r) {
    const cat=r.categoryId?state.categories.find(c=>c.id===r.categoryId):null;
    const sub=cat&&r.subcategoryId?cat.subs.find(s=>s.id===r.subcategoryId):null;
    const acct=r.accountId?findAccount(r.accountId):null;
    const isOverdue=r.nextDue<todayISO, isDueToday=r.nextDue===todayISO;
    const typeColor=r.type==='income'?'#34d399':'#f87171';
    const typeBg=r.type==='income'?'rgba(52,211,153,0.12)':'rgba(248,113,113,0.12)';

    if (recUI.deleteRecId===r.id) return `
      <div class="rounded-2xl p-4 mb-3" style="background:#1c2028;border:1px solid #7f1d1d">
        <div class="text-sm mb-3" style="color:#fca5a5">Delete <strong>${r.icon} ${r.name}</strong>? Cannot be undone.</div>
        <div class="flex gap-2">
          <button onclick="recConfirmDelete()" class="rounded-lg px-5 py-2 text-sm font-semibold" style="background:#ef4444;border:none;color:#fff;cursor:pointer">Delete</button>
          <button onclick="recCancelDelete()" class="rounded-lg px-5 py-2 text-sm" style="background:rgba(255,255,255,0.08);border:none;color:#9ca3af;cursor:pointer">Cancel</button>
        </div>
      </div>`;

    return `
      <div class="rounded-2xl p-4 mb-3" style="background:#1c2028;${!r.active?'opacity:0.6':''}">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0 flex items-center justify-center rounded-xl text-xl" style="width:42px;height:42px;background:${typeBg}">${r.icon||'🔁'}</div>
            <div>
              <div class="font-semibold text-sm" style="color:#f1f1f3">${r.name}</div>
              <div class="flex items-center gap-2 mt-1 flex-wrap">
                <span class="text-xs px-2 py-0.5 rounded-full font-medium" style="background:${typeBg};color:${typeColor}">${r.type==='income'?'💰 Income':'💸 Expense'}</span>
                <span class="text-xs px-2 py-0.5 rounded-full" style="background:#16191f;color:#9ca3af">${FREQ[r.frequency]||r.frequency}</span>
                ${!r.active?`<span class="text-xs px-2 py-0.5 rounded-full" style="background:rgba(255,255,255,0.08);color:#9ca3af">⏸ Paused</span>`:''}
                ${isOverdue&&r.active?`<span class="text-xs px-2 py-0.5 rounded-full font-semibold" style="background:rgba(248,113,113,0.15);color:#f87171">⚠️ Overdue</span>`:''}
                ${isDueToday?`<span class="text-xs px-2 py-0.5 rounded-full font-semibold" style="background:rgba(251,191,36,0.15);color:#fbbf24">⚡ Due today</span>`:''}
              </div>
            </div>
          </div>
          <div class="text-right flex-shrink-0 ml-2">
            <div class="font-bold text-sm" style="color:${typeColor}">${r.type==='income'?'+':'-'}${fmt2(r.amount)}</div>
            <div class="flex gap-1 mt-1 justify-end">
              <button onclick="recToggleActive('${r.id}')" title="${r.active?'Pause':'Resume'}" style="background:#16191f;border:none;color:#9ca3af;cursor:pointer;border-radius:8px;padding:5px 7px;font-size:13px">${r.active?'⏸':'▶'}</button>
              <button onclick="recDuplicate('${r.id}')" title="Duplicate" style="background:#16191f;border:none;color:#9ca3af;cursor:pointer;border-radius:8px;padding:5px 7px;font-size:13px">⧉</button>
              <button onclick="recOpenEdit('${r.id}')" style="background:#16191f;border:none;color:#9ca3af;cursor:pointer;border-radius:8px;padding:5px 7px;font-size:13px">✏️</button>
              <button onclick="recAskDelete('${r.id}')" style="background:#16191f;border:none;color:#9ca3af;cursor:pointer;border-radius:8px;padding:5px 7px;font-size:13px">🗑️</button>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-4 text-xs flex-wrap" style="color:#6b7280">
          <span style="color:${isOverdue?'#f87171':isDueToday?'#fbbf24':'#6b7280'}">📅 ${isOverdue?'Overdue · ':isDueToday?'Today · ':'Next: '}${fmtDate(r.nextDue)}</span>
          ${cat?`<span>${cat.icon} ${cat.name}${sub?' › '+sub.name:''}</span>`:''}
          ${acct?`<span>${acct.icon||'💳'} ${acct.name}</span>`:''}
        </div>
      </div>`;
  }

  const editRec = recUI.editRecId ? recs.find(r=>r.id===recUI.editRecId) : null;

  return `${renderNav()}
    <div class="flex items-center justify-between mb-1">
      <div class="text-2xl font-bold">Recurring</div>
      <button onclick="recOpenAdd()" class="rounded-xl px-4 py-2.5 text-sm font-semibold text-white flex-shrink-0" style="background:#6366f1;border:none;cursor:pointer">+ Add</button>
    </div>
    <div class="section-label mb-4">${recs.length} item${recs.length!==1?'s':''} · ${active.length} active</div>

    ${recAutoPostedCount>0?`
    <div class="flex items-center gap-3 rounded-xl p-3 mb-4 text-sm" style="background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.2)">
      <span>⚡</span>
      <span style="color:#6ee7b7"><strong>${recAutoPostedCount} transaction${recAutoPostedCount>1?'s':''}</strong> were auto-posted since your last visit</span>
    </div>`:''}

    <div class="grid grid-cols-2 gap-3 mb-5">
      <div class="rounded-2xl p-4" style="background:#1c2028">
        <div class="text-xs mb-1" style="color:#6b7280">Monthly Expenses</div>
        <div class="text-xl font-bold text-red-400">-${fmt2(monthlyExp)}</div>
        <div class="text-xs mt-0.5" style="color:#6b7280">${active.filter(r=>r.type==='expense').length} items</div>
      </div>
      <div class="rounded-2xl p-4" style="background:#1c2028">
        <div class="text-xs mb-1" style="color:#6b7280">Monthly Income</div>
        <div class="text-xl font-bold text-emerald-400">+${fmt2(monthlyInc)}</div>
        <div class="text-xs mt-0.5" style="color:#6b7280">${active.filter(r=>r.type==='income').length} items</div>
      </div>
    </div>

    ${recs.length===0?`
      <div class="flex flex-col items-center justify-center py-20 text-center">
        <div class="text-5xl mb-4">🔁</div>
        <div class="text-xl font-bold mb-2">No recurring items</div>
        <div class="text-sm max-w-xs mb-5" style="color:#6b7280">Add your regular bills, salaries, and income so they post automatically.</div>
        <button onclick="recOpenAdd()" class="rounded-xl px-6 py-3 text-sm font-semibold text-white" style="background:#6366f1;border:none;cursor:pointer">+ Add your first item</button>
      </div>`:sorted.map(r=>recCard(r)).join('')}

    ${recUI.showAddRec ? recModal(null) : ''}
    ${editRec ? recModal(editRec) : ''}`;
}


function renderGoals() {
  function goalCard(g) {
    const gs=computeGoalSaved(g);
    const remaining=Math.max(g.target-gs.total,0);
    const months=monthsBetween(g.targetDate);
    const monthly=months>0?remaining/months:remaining, daily=monthly/30;
    const pct=g.target>0?Math.min((gs.total/g.target)*100,100):0;
    const barColor=pct>=66?'linear-gradient(90deg,#10b981,#34d399)':pct>=33?'linear-gradient(90deg,#f59e0b,#fbbf24)':'linear-gradient(90deg,#6366f1,#a5b4fc)';
    const pctColor=pct>=66?'#34d399':pct>=33?'#fbbf24':'#a5b4fc';
    const dateLabel=new Date(g.targetDate).toLocaleDateString('en-US',{month:'short',year:'numeric'});
    const deposits=g.deposits||[];
    const isDepositOpen=goalUI.depositGoalId===g.id;
    const isHistoryOpen=goalUI.expandedGoalId===g.id;
    const linkedCat=g.linkedCategoryId?state.categories.find(c=>c.id===g.linkedCategoryId):null;
    const linkedSub=g.linkedSubcategoryId&&linkedCat?linkedCat.subs.find(s=>s.id===g.linkedSubcategoryId):null;

    if (goalUI.deleteGoalId===g.id) return `
      <div class="rounded-2xl p-5 mb-4" style="background:#1c2028;border:1px solid #7f1d1d">
        <div class="text-sm mb-3" style="color:#fca5a5">Delete <strong>${g.icon} ${g.name}</strong>? All deposit history will be lost. Cannot be undone.</div>
        <div class="flex gap-2">
          <button onclick="goalConfirmDelete()" class="rounded-lg px-5 py-2 text-sm font-semibold" style="background:#ef4444;border:none;color:#fff;cursor:pointer">Delete Goal</button>
          <button onclick="goalCancelDelete()" class="rounded-lg px-5 py-2 text-sm" style="background:rgba(255,255,255,0.08);border:none;color:#9ca3af;cursor:pointer">Cancel</button>
        </div>
      </div>`;

    const depositForm=isDepositOpen?`
      <div class="mt-4 pt-4" style="border-top:1px solid rgba(255,255,255,0.08)">
        <div class="section-label mb-3">ADD DEPOSIT</div>
        <div class="grid grid-cols-2 gap-2 mb-2">
          <div><div class="field-label">AMOUNT (₱) *</div><input id="dep-amt-${g.id}" type="number" step="0.01" min="0" placeholder="0.00" class="field-input"></div>
          <div><div class="field-label">DATE</div><input id="dep-date-${g.id}" type="date" value="${todayISO}" class="field-input"></div>
        </div>
        <div class="mb-3"><div class="field-label">NOTE (optional)</div><input id="dep-note-${g.id}" type="text" placeholder="e.g. Monthly savings" class="field-input"></div>
        <div class="flex gap-2">
          <button onclick="goalAddDeposit('${g.id}')" class="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style="background:#6366f1;border:none;cursor:pointer">Save Deposit</button>
          <button onclick="goalCloseDeposit()" class="flex-1 rounded-xl py-2.5 text-sm" style="background:rgba(255,255,255,0.08);border:none;color:#9ca3af;cursor:pointer">Cancel</button>
        </div>
      </div>`:'';

    const historyRows=deposits.slice().reverse().map(d=>{
      const isDel=goalUI.deleteDepositKey&&goalUI.deleteDepositKey.goalId===g.id&&goalUI.deleteDepositKey.depositId===d.id;
      if(isDel) return `
        <div class="flex items-center gap-3 py-2" style="border-bottom:1px solid rgba(255,255,255,0.05)">
          <div class="flex-1 text-xs" style="color:#fca5a5">Remove ${fmt(d.amount)} deposit?</div>
          <button onclick="goalConfirmDeleteDeposit()" class="text-xs px-3 py-1 rounded-lg" style="background:#ef4444;border:none;color:#fff;cursor:pointer">Remove</button>
          <button onclick="goalCancelDeleteDeposit()" class="text-xs px-3 py-1 rounded-lg" style="background:rgba(255,255,255,0.08);border:none;color:#9ca3af;cursor:pointer">Keep</button>
        </div>`;
      return `
        <div class="flex items-center gap-3 py-2" style="border-bottom:1px solid rgba(255,255,255,0.05)">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-emerald-400">+${fmt(d.amount)}</div>
            <div class="text-xs truncate" style="color:#6b7280">${fmtDate(d.date)}${d.note?' · '+d.note:''}</div>
          </div>
          <button onclick="goalAskDeleteDeposit('${g.id}','${d.id}')" style="background:none;border:none;color:#6b7280;cursor:pointer;font-size:18px;padding:0 4px;line-height:1;flex-shrink:0">×</button>
        </div>`;
    }).join('');

    const historySection=isHistoryOpen?`
      <div class="mt-4 pt-4" style="border-top:1px solid rgba(255,255,255,0.08)">
        <div class="section-label mb-2">DEPOSIT HISTORY</div>
        ${deposits.length===0
          ?`<div class="text-sm text-center py-3" style="color:#6b7280">No manual deposits yet.</div>`
          :historyRows}
      </div>`:'';

    return `
      <div class="rounded-2xl p-5 mb-4" style="background:#1c2028">
        <div class="flex items-start justify-between mb-4">
          <div>
            <div class="flex items-center gap-2 text-lg font-bold">${g.icon} ${g.name}</div>
            <div class="text-xs mt-0.5" style="color:#6b7280">Target ${dateLabel} · ${months} month${months!==1?'s':''} away</div>
          </div>
          <div class="flex gap-1 flex-shrink-0">
            <button onclick="goalOpenEdit('${g.id}')" style="background:#16191f;border:none;color:#9ca3af;cursor:pointer;border-radius:8px;padding:6px 8px;font-size:13px">✏️</button>
            <button onclick="goalAskDelete('${g.id}')" style="background:#16191f;border:none;color:#9ca3af;cursor:pointer;border-radius:8px;padding:6px 8px;font-size:13px">🗑️</button>
          </div>
        </div>

        <div class="flex items-center gap-3 mb-4">
          <div class="flex-1 rounded-full overflow-hidden" style="height:9px;background:#16191f">
            <div style="width:${pct.toFixed(1)}%;height:9px;background:${barColor};border-radius:5px;transition:width 0.5s ease"></div>
          </div>
          <span class="text-sm font-bold flex-shrink-0" style="min-width:48px;text-align:right;color:${pctColor}">${pct.toFixed(1)}%</span>
        </div>

        <div class="grid grid-cols-3 gap-2 mb-3">
          <div class="rounded-xl p-3 text-center" style="background:#16191f">
            <div class="text-xs mb-1" style="color:#6b7280">Saved</div>
            <div class="font-bold text-sm text-emerald-400">${fmt(gs.total)}</div>
          </div>
          <div class="rounded-xl p-3 text-center" style="background:#16191f">
            <div class="text-xs mb-1" style="color:#6b7280">Target</div>
            <div class="font-bold text-sm">${fmt(g.target)}</div>
          </div>
          <div class="rounded-xl p-3 text-center" style="background:#16191f">
            <div class="text-xs mb-1" style="color:#6b7280">Remaining</div>
            <div class="font-bold text-sm text-amber-400">${fmt(remaining)}</div>
          </div>
        </div>

        <div class="rounded-xl p-3 mb-3" style="background:#16191f">
          <div class="flex justify-between text-sm mb-1.5">
            <span style="color:#6b7280">Monthly needed</span><span class="font-semibold">${fmt(monthly)}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span style="color:#6b7280">Daily needed</span><span class="font-semibold">${fmt(daily)}</span>
          </div>
        </div>

        ${linkedCat?`
        <div class="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl text-xs" style="background:rgba(99,102,241,0.1);border:1px solid rgba(99,102,241,0.2)">
          <span>🔗</span>
          <span style="color:#a5b4fc">Auto-tracking: ${linkedCat.icon} ${linkedCat.name}${linkedSub?' → '+linkedSub.name:''}</span>
          <span class="ml-auto font-semibold" style="color:#a5b4fc">+${fmt(gs.auto)}</span>
        </div>`:''}

        <div class="flex gap-2">
          <button onclick="goalOpenDeposit('${g.id}')" class="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style="background:#6366f1;border:none;cursor:pointer">+ Deposit</button>
          <button onclick="goalToggleHistory('${g.id}')" class="flex-1 rounded-xl py-2.5 text-sm font-semibold" style="background:#16191f;border:1px solid ${isHistoryOpen?'#6366f1':'rgba(255,255,255,0.08)'};color:${isHistoryOpen?'#a5b4fc':'#9ca3af'};cursor:pointer">📋 History (${deposits.length})</button>
        </div>
        ${depositForm}${historySection}
      </div>`;
  }

  const editGoal=goalUI.editGoalId?state.goals.find(g=>g.id===goalUI.editGoalId):null;
  const addModal=goalUI.showAddGoal?`
    <div class="fixed inset-0 flex items-end sm:items-center justify-center" style="z-index:200;background:rgba(0,0,0,0.8)" onclick="goalCloseAdd()">
      <div class="w-full sm:w-96 rounded-t-3xl sm:rounded-2xl p-6" style="background:#1c2028;border:1px solid rgba(255,255,255,0.08);max-height:92vh;overflow-y:auto" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between mb-5">
          <div class="text-lg font-bold">New Goal</div>
          <button onclick="goalCloseAdd()" style="background:none;border:none;color:#6b7280;cursor:pointer;font-size:22px;line-height:1">×</button>
        </div>
        <div class="grid gap-3 mb-3" style="grid-template-columns:56px 1fr">
          <div><div class="field-label">ICON</div><input type="hidden" id="goal-icon" value="🎯">
          <button type="button" onclick="iconPickerOpen('goal-icon','goal')" id="goal-icon-btn" onmouseover="this.style.borderColor='#6366f1'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'" style="width:100%;height:44px;background:#16191f;border:1px solid rgba(255,255,255,0.08);border-radius:10px;font-size:24px;cursor:pointer;line-height:1;transition:border-color 0.15s">🎯</button></div>
          <div><div class="field-label">GOAL NAME *</div><input id="goal-name" type="text" placeholder="e.g. Emergency Fund" class="field-input"></div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div><div class="field-label">TARGET (₱) *</div><input id="goal-target" type="number" step="0.01" min="0" placeholder="0.00" class="field-input"></div>
          <div><div class="field-label">TARGET DATE *</div><input id="goal-date" type="date" class="field-input"></div>
        </div>
        <div class="mb-3"><div class="field-label">AUTO-TRACK CATEGORY (optional)</div>
          <select id="goal-cat" class="field-select" onchange="goalUpdateSub('goal-cat','goal-subcat')">
            <option value="">— None (manual only) —</option>
            ${state.categories.filter(c=>c.active).map(c=>`<option value="${c.id}">${c.icon} ${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="mb-5"><div class="field-label">SUBCATEGORY (optional)</div>
          <select id="goal-subcat" class="field-select"><option value="">— All subcategories —</option></select>
        </div>
        <div id="goal-err" class="text-red-400 text-xs mb-3"></div>
        <div class="flex gap-3">
          <button onclick="goalSave()" class="flex-1 rounded-xl py-3 font-semibold text-white text-sm" style="background:#6366f1;border:none;cursor:pointer">Create Goal</button>
          <button onclick="goalCloseAdd()" class="flex-1 rounded-xl py-3 text-sm" style="background:#16191f;border:1px solid rgba(255,255,255,0.08);color:#9ca3af;cursor:pointer">Cancel</button>
        </div>
      </div>
    </div>`:'';

  const editModal=editGoal?`
    <div class="fixed inset-0 flex items-end sm:items-center justify-center" style="z-index:200;background:rgba(0,0,0,0.8)" onclick="goalCancelEdit()">
      <div class="w-full sm:w-96 rounded-t-3xl sm:rounded-2xl p-6" style="background:#1c2028;border:1px solid rgba(255,255,255,0.08);max-height:92vh;overflow-y:auto" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between mb-5">
          <div class="text-lg font-bold">Edit Goal</div>
          <button onclick="goalCancelEdit()" style="background:none;border:none;color:#6b7280;cursor:pointer;font-size:22px;line-height:1">×</button>
        </div>
        <div class="grid gap-3 mb-3" style="grid-template-columns:56px 1fr">
          <div><div class="field-label">ICON</div><input type="hidden" id="edit-goal-icon" value="${editGoal.icon||'🎯'}">
          <button type="button" onclick="iconPickerOpen('edit-goal-icon','goal')" id="edit-goal-icon-btn" onmouseover="this.style.borderColor='#6366f1'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'" style="width:100%;height:44px;background:#16191f;border:1px solid rgba(255,255,255,0.08);border-radius:10px;font-size:24px;cursor:pointer;line-height:1;transition:border-color 0.15s">${editGoal.icon||'🎯'}</button></div>
          <div><div class="field-label">GOAL NAME *</div><input id="edit-goal-name" type="text" value="${editGoal.name}" class="field-input"></div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div><div class="field-label">TARGET (₱) *</div><input id="edit-goal-target" type="number" step="0.01" value="${editGoal.target}" class="field-input"></div>
          <div><div class="field-label">TARGET DATE *</div><input id="edit-goal-date" type="date" value="${editGoal.targetDate}" class="field-input"></div>
        </div>
        <div class="mb-3"><div class="field-label">AUTO-TRACK CATEGORY</div>
          <select id="edit-goal-cat" class="field-select" onchange="goalUpdateSub('edit-goal-cat','edit-goal-subcat')">
            <option value="">— None —</option>
            ${state.categories.filter(c=>c.active).map(c=>`<option value="${c.id}" ${editGoal.linkedCategoryId===c.id?'selected':''}>${c.icon} ${c.name}</option>`).join('')}
          </select>
        </div>
        <div class="mb-5"><div class="field-label">SUBCATEGORY</div>
          <select id="edit-goal-subcat" class="field-select">
            <option value="">— All subcategories —</option>
            ${editGoal.linkedCategoryId?(state.categories.find(c=>c.id===editGoal.linkedCategoryId)?.subs||[]).filter(s=>s.active).map(s=>`<option value="${s.id}" ${editGoal.linkedSubcategoryId===s.id?'selected':''}>${s.name}</option>`).join(''):''}
          </select>
        </div>
        <div class="flex gap-3">
          <button onclick="goalUpdate('${editGoal.id}')" class="flex-1 rounded-xl py-3 font-semibold text-white text-sm" style="background:#6366f1;border:none;cursor:pointer">Save Changes</button>
          <button onclick="goalCancelEdit()" class="flex-1 rounded-xl py-3 text-sm" style="background:#16191f;border:1px solid rgba(255,255,255,0.08);color:#9ca3af;cursor:pointer">Cancel</button>
        </div>
      </div>
    </div>`:'';

  const totalSaved=state.goals.reduce((s,g)=>s+computeGoalSaved(g).total,0);
  const totalTarget=state.goals.reduce((s,g)=>s+g.target,0);

  return `${renderNav()}
    <div class="flex items-center justify-between mb-1">
      <div class="text-2xl font-bold">Goals</div>
      <button onclick="goalOpenAdd()" class="rounded-xl px-4 py-2.5 text-sm font-semibold text-white flex-shrink-0" style="background:#6366f1;border:none;cursor:pointer">+ Add Goal</button>
    </div>
    <div class="section-label mb-5">${state.goals.length} Goal${state.goals.length!==1?'s':''} · ${fmt(totalSaved)} saved of ${fmt(totalTarget)}</div>
    ${state.goals.length===0?`
      <div class="flex flex-col items-center justify-center py-20 text-center">
        <div class="text-5xl mb-4">🎯</div>
        <div class="text-xl font-bold mb-2">No goals yet</div>
        <div class="text-sm max-w-xs mb-5" style="color:#6b7280">Set a savings goal and track your progress.</div>
        <button onclick="goalOpenAdd()" class="rounded-xl px-6 py-3 text-sm font-semibold text-white" style="background:#6366f1;border:none;cursor:pointer">+ Create your first goal</button>
      </div>`:state.goals.map(g=>goalCard(g)).join('')}
    ${addModal}${editModal}`;
}


function renderAccounts() {
  const TC = {
    bank:    { label:'Bank',     icon:'🏦', color:'#3b82f6', bg:'rgba(59,130,246,0.13)'  },
    ewallet: { label:'E-Wallet', icon:'📱', color:'#8b5cf6', bg:'rgba(139,92,246,0.13)'  },
    cash:    { label:'Cash',     icon:'💵', color:'#10b981', bg:'rgba(16,185,129,0.13)'  },
  };
  const banks    = state.accounts.filter(a=>(a.type||'bank')==='bank');
  const ewallets = state.accounts.filter(a=>a.type==='ewallet');
  const cashList = state.accounts.filter(a=>a.type==='cash');
  const sumB=banks.reduce((s,a)=>s+a.balance,0), sumE=ewallets.reduce((s,a)=>s+a.balance,0), sumC=cashList.reduce((s,a)=>s+a.balance,0);
  const totalDebit=sumB+sumE+sumC, totalOwed=state.creditCards.reduce((s,c)=>s+c.outstanding,0), nw=totalDebit-totalOwed;
  const totalMaintaining=state.accounts.reduce((s,a)=>s+(a.maintainingBalance||0),0);
  const totalSpendable=totalDebit-totalMaintaining;

  function acctCard(a) {
    const conf=TC[a.type||'bank'];
    if (acctUI.deleteAcctId===a.id) return `
      <div class="rounded-xl p-4 mb-2" style="background:#1a0f0f;border:1px solid #7f1d1d">
        <div class="text-sm mb-3" style="color:#fca5a5">Delete <strong>${a.name}</strong>? Cannot be undone.</div>
        <div class="flex gap-2">
          <button onclick="acctConfirmDelete()" class="text-xs px-4 py-2 rounded-lg font-semibold" style="background:#ef4444;border:none;color:#fff;cursor:pointer">Delete</button>
          <button onclick="acctCancelDelete()" class="text-xs px-4 py-2 rounded-lg" style="background:rgba(255,255,255,0.08);border:none;color:#9ca3af;cursor:pointer">Cancel</button>
        </div>
      </div>`;
    if (acctUI.editAcctId===a.id) return `
      <div class="rounded-xl p-4 mb-2" style="background:#16191f;border:1px solid #6366f1">
        <div class="grid gap-3 mb-3" style="grid-template-columns:56px 1fr">
          <div><div class="field-label">ICON</div><input type="hidden" id="edit-acct-icon-${a.id}" value="${a.icon||conf.icon}">
          <button type="button" onclick="iconPickerOpen('edit-acct-icon-${a.id}','${a.type||'bank'}')" onmouseover="this.style.borderColor='#6366f1'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'" id="edit-acct-icon-${a.id}-btn" style="width:100%;height:44px;background:#16191f;border:1px solid rgba(255,255,255,0.08);border-radius:10px;font-size:24px;cursor:pointer;line-height:1;transition:border-color 0.15s">${a.icon||conf.icon}</button></div>
          <div><div class="field-label">NAME</div><input id="edit-acct-name-${a.id}" value="${a.name}" class="field-input"></div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div><div class="field-label">BALANCE (₱)</div><input id="edit-acct-bal-${a.id}" type="number" step="0.01" value="${a.balance}" class="field-input"></div>
          <div><div class="field-label">MAINTAINING BAL. (₱)</div><input id="edit-acct-mbal-${a.id}" type="number" step="0.01" value="${a.maintainingBalance||0}" class="field-input" title="Amount that must stay in account"></div>
        </div>
        <div class="flex gap-2">
          <button onclick="acctUpdate('${a.id}')" class="flex-1 rounded-lg py-2 text-sm font-semibold text-white" style="background:#6366f1;border:none;cursor:pointer">Save</button>
          <button onclick="acctCancelEdit()" class="flex-1 rounded-lg py-2 text-sm" style="background:rgba(255,255,255,0.08);border:none;color:#9ca3af;cursor:pointer">Cancel</button>
        </div>
      </div>`;
    return `
      <div class="flex items-center gap-3 p-3 rounded-xl mb-2" style="background:#16191f">
        <div class="flex-shrink-0 flex items-center justify-center rounded-xl text-xl" style="width:42px;height:42px;background:${conf.bg}">${a.icon||conf.icon}</div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold" style="color:#f1f1f3">${a.name}</div>
          <div class="text-xs" style="color:#6b7280">${conf.label}${a.maintainingBalance>0?` · <span style="color:#f59e0b">min ${fmt(a.maintainingBalance)}</span>`:''}</div>
        </div>
        <div class="font-semibold text-sm flex-shrink-0">${fmt2(a.balance)}</div>
        <div class="flex gap-1 flex-shrink-0">
          <button onclick="acctOpenEdit('${a.id}')" style="background:#1c2028;border:none;color:#9ca3af;cursor:pointer;border-radius:8px;padding:5px 8px;font-size:13px">✏️</button>
          <button onclick="acctAskDelete('${a.id}')" style="background:#1c2028;border:none;color:#9ca3af;cursor:pointer;border-radius:8px;padding:5px 8px;font-size:13px">🗑️</button>
        </div>
      </div>`;
  }

  function section(title, list, type, total) {
    const conf=TC[type];
    return `
      <div class="rounded-2xl p-4 mb-4" style="background:#1c2028">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span>${conf.icon}</span><span class="font-semibold">${title}</span>
            <span class="text-xs px-2 py-0.5 rounded-full font-medium" style="background:${conf.bg};color:${conf.color}">${list.length}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm font-semibold" style="color:#9ca3af">${fmt2(total)}</span>
            <button onclick="acctOpenAdd('${type}')" class="text-xs px-3 py-1.5 rounded-lg font-semibold text-white" style="background:#6366f1;border:none;cursor:pointer">+ Add</button>
          </div>
        </div>
        ${list.map(a=>acctCard(a)).join('')}
        ${list.length===0?`<div class="text-center py-4 text-sm" style="color:#6b7280">No ${title.toLowerCase()} added yet</div>`:''}
      </div>`;
  }

  function ccCard(c) {
    const avail=c.limit-c.outstanding, pct=c.limit>0?Math.min((c.outstanding/c.limit)*100,100):0;
    const isPaid = c.outstanding<=0;
    const dates = ccCycleDates(c.id) || {};
    const newCharges = ccCycleSpend(c.id);
    const currentBalance = c.lastStatement + newCharges;
    const stmtPayments = ccStatementPayments(c.id);
    const stmtRemaining = c.lastStatement > 0 ? Math.max(0, c.lastStatement - stmtPayments) : 0;
    const stmtFullyPaid = c.lastStatement > 0 && stmtRemaining === 0;
    const barColor = pct>80?'#ef4444':pct>50?'#f59e0b':'#10b981';

    // ── DELETE confirm ────────────────────────────────────
    if (acctUI.deleteCCId===c.id) return `
      <div class="rounded-xl p-4 mb-3" style="background:#1a0f0f;border:1px solid #7f1d1d">
        <div class="text-sm mb-3" style="color:#fca5a5">Delete <strong>${c.name}</strong>? Cannot be undone.</div>
        <div class="flex gap-2">
          <button onclick="ccConfirmDelete()" class="text-xs px-4 py-2 rounded-lg font-semibold" style="background:#ef4444;border:none;color:#fff;cursor:pointer">Delete</button>
          <button onclick="ccCancelDelete()" class="text-xs px-4 py-2 rounded-lg" style="background:rgba(255,255,255,0.08);border:none;color:#9ca3af;cursor:pointer">Cancel</button>
        </div>
      </div>`;

    // ── EDIT form ─────────────────────────────────────────
    if (acctUI.editCCId===c.id) return `
      <div class="rounded-xl p-4 mb-3" style="background:#16191f;border:1px solid #6366f1">
        <div class="grid gap-3 mb-3" style="grid-template-columns:56px 1fr">
          <div><div class="field-label">ICON</div><input type="hidden" id="edit-cc-icon-${c.id}" value="${c.icon||'💳'}">
          <button type="button" onclick="iconPickerOpen('edit-cc-icon-${c.id}','cc')" id="edit-cc-icon-${c.id}-btn" onmouseover="this.style.borderColor='#6366f1'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'" style="width:100%;height:44px;background:#16191f;border:1px solid rgba(255,255,255,0.08);border-radius:10px;font-size:24px;cursor:pointer;line-height:1;transition:border-color 0.15s">${c.icon||'💳'}</button></div>
          <div><div class="field-label">NAME</div><input id="edit-cc-name-${c.id}" value="${c.name}" class="field-input"></div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div><div class="field-label">CURRENT BALANCE (₱)</div><input id="edit-cc-owed-${c.id}" type="number" step="0.01" value="${c.outstanding}" class="field-input" title="Sync this from your bank app to correct drift"></div>
          <div><div class="field-label">CREDIT LIMIT (₱)</div><input id="edit-cc-lim-${c.id}" type="number" step="0.01" value="${c.limit}" class="field-input"></div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div><div class="field-label">CUT-OFF DAY</div><input id="edit-cc-cutoff-${c.id}" type="number" min="1" max="31" value="${c.cutoffDay||22}" class="field-input" title="Last day of billing cycle (from your statement)"></div>
          <div><div class="field-label">DUE DAY</div><input id="edit-cc-due-${c.id}" type="number" min="1" max="31" value="${c.dueDay}" class="field-input" title="Payment due date"></div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div><div class="field-label">STATEMENT BALANCE (₱)</div><input id="edit-cc-last-stmt-${c.id}" type="number" step="0.01" value="${c.lastStatement||0}" class="field-input" title="Total Amount Due from your last statement"></div>
          <div><div class="field-label">MIN. AMOUNT DUE (₱)</div><input id="edit-cc-min-due-${c.id}" type="number" step="0.01" value="${c.minDue||0}" class="field-input" title="Minimum Amount Due from your last statement"></div>
        </div>
        <div class="flex gap-2">
          <button onclick="ccUpdate('${c.id}')" class="flex-1 rounded-lg py-2 text-sm font-semibold text-white" style="background:#6366f1;border:none;cursor:pointer">Save</button>
          <button onclick="ccCancelEdit()" class="flex-1 rounded-lg py-2 text-sm" style="background:rgba(255,255,255,0.08);border:none;color:#9ca3af;cursor:pointer">Cancel</button>
        </div>
      </div>`;

    // ── PAYMENT form ──────────────────────────────────────
    if (acctUI.paymentCCId===c.id) return `
      <div class="rounded-xl p-4 mb-3" style="background:#16191f;border:1px solid #10b981">
        <div class="flex items-center gap-2 mb-4">
          <span style="font-size:20px">💳</span>
          <div>
            <div class="font-semibold text-sm" style="color:#f1f1f3">Record Payment — ${c.name}</div>
            <div class="text-xs" style="color:#6b7280">Current Balance: <span style="color:#f87171;font-weight:600">${fmt(c.outstanding)}</span></div>
          </div>
        </div>
        <div class="mb-3">
          <div class="field-label">PAYMENT DATE</div>
          <input id="cc-pay-date" type="date" value="${todayISO}" class="field-input">
        </div>
        <div class="mb-3">
          <div class="field-label">PAYMENT AMOUNT (₱)</div>
          <input id="cc-pay-amt" type="number" step="0.01" min="0" value="${c.lastStatement>0?c.lastStatement:c.outstanding}" class="field-input" style="font-size:18px;font-weight:700;color:#34d399">
          <div class="flex gap-2 mt-2 flex-wrap">
            <button onclick="document.getElementById('cc-pay-amt').value='${c.outstanding}'" class="text-xs px-3 py-1.5 rounded-lg" style="background:#16191f;border:1px solid rgba(255,255,255,0.08);color:#9ca3af;cursor:pointer">Current bal · ${fmt(c.outstanding)}</button>
            ${c.lastStatement>0?`<button onclick="document.getElementById('cc-pay-amt').value='${c.lastStatement}'" class="text-xs px-3 py-1.5 rounded-lg" style="background:#16191f;border:1px solid rgba(245,158,11,0.4);color:#fbbf24;cursor:pointer">Stmt bal · ${fmt(c.lastStatement)}</button>`:''}
            ${c.minDue>0?`<button onclick="document.getElementById('cc-pay-amt').value='${c.minDue}'" class="text-xs px-3 py-1.5 rounded-lg" style="background:#16191f;border:1px solid rgba(255,255,255,0.08);color:#9ca3af;cursor:pointer">Min due · ${fmt(c.minDue)}</button>`:''}
          </div>
        </div>
        <div class="mb-4">
          <div class="field-label">PAY FROM ACCOUNT</div>
          <select id="cc-pay-from" class="field-select">
            <option value="">— Select account —</option>
            ${state.accounts.map(a=>`<option value="${a.id}">${a.icon||'🏦'} ${a.name}</option>`).join('')}
          </select>
        </div>
        <div id="cc-pay-err" class="text-red-400 text-xs mb-3"></div>
        <div class="flex gap-2">
          <button onclick="ccRecordPayment('${c.id}')" class="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white" style="background:#10b981;border:none;cursor:pointer">✅ Record Payment</button>
          <button onclick="ccCancelPayment()" class="flex-1 rounded-lg py-2.5 text-sm" style="background:rgba(255,255,255,0.08);border:none;color:#9ca3af;cursor:pointer">Cancel</button>
        </div>
      </div>`;

    // ── CARD DISPLAY ──────────────────────────────────────
    const cutoffLabel  = dates.cutoff    ? new Date(dates.cutoff+'T00:00:00').toLocaleDateString('en-PH',{month:'short',day:'numeric'}) : '—';
    const dueLabel     = dates.due       ? new Date(dates.due+'T00:00:00').toLocaleDateString('en-PH',{month:'short',day:'numeric'})    : '—';
    const startLabel   = dates.cycleStart? new Date(dates.cycleStart+'T00:00:00').toLocaleDateString('en-PH',{month:'short',day:'numeric'}) : '—';
    const daysToC      = dates.daysToCutoff ?? '—';
    const daysToD      = dates.daysToDue    ?? '—';
    const pastCutoff   = dates.cutoff && todayISO > dates.cutoff;
    const nearDue      = typeof daysToD==='number' && daysToD<=5;
    const nearCutoff   = typeof daysToC==='number' && daysToC<=3;

    return `
      <div class="rounded-xl p-4 mb-3" style="background:#16191f;border:1px solid ${isPaid?'rgba(16,185,129,0.3)':'transparent'}">

        <!-- Header -->
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0 flex items-center justify-center rounded-xl text-xl" style="width:42px;height:42px;background:rgba(245,158,11,0.12)">${c.icon||'💳'}</div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <div class="font-semibold text-sm" style="color:#f1f1f3">${c.name}</div>
                ${isPaid?`<span class="text-xs px-2 py-0.5 rounded-full font-semibold" style="background:rgba(16,185,129,0.15);color:#34d399">✅ Paid</span>`:''}
                ${nearDue&&!isPaid?`<span class="text-xs px-2 py-0.5 rounded-full font-semibold" style="background:rgba(248,113,113,0.15);color:#f87171">⚠️ Due soon</span>`:''}
              </div>
              <div class="text-xs mt-0.5" style="color:#6b7280">Cut-off ${c.cutoffDay||22}${sfx(c.cutoffDay||22)} · Due ${c.dueDay}${sfx(c.dueDay)}</div>
            </div>
          </div>
          <div class="flex gap-1 flex-shrink-0">
            <button onclick="ccOpenPayment('${c.id}')" title="Record Payment" style="background:#0d2b1e;border:1px solid rgba(16,185,129,0.3);color:#34d399;cursor:pointer;border-radius:8px;padding:5px 8px;font-size:12px;font-weight:600">Pay</button>
            <button onclick="ccOpenEdit('${c.id}')" style="background:#1c2028;border:none;color:#9ca3af;cursor:pointer;border-radius:8px;padding:5px 8px;font-size:13px">✏️</button>
            <button onclick="ccAskDelete('${c.id}')" style="background:#1c2028;border:none;color:#9ca3af;cursor:pointer;border-radius:8px;padding:5px 8px;font-size:13px">🗑️</button>
          </div>
        </div>

        <!-- Billing Cycle Timeline -->
        <div class="rounded-lg p-3 mb-3" style="background:#0e1014;border:1px solid rgba(255,255,255,0.05)">
          <div class="flex items-center justify-between text-xs mb-2" style="color:#6b7280">
            <span>📅 Billing Cycle</span>
            <span style="color:${nearCutoff?'#f87171':'#6b7280'}">${pastCutoff?'Grace period':''+daysToC+' days to cut-off'}</span>
          </div>
          <div class="flex items-center gap-1 text-xs">
            <div class="text-center flex-1">
              <div style="color:#a5b4fc;font-weight:600">${startLabel}</div>
              <div style="color:#6b7280;margin-top:1px">Cycle start</div>
            </div>
            <div style="flex:2;height:2px;background:linear-gradient(90deg,#6366f1,${pastCutoff?'#6366f1':'rgba(255,255,255,0.05)'});border-radius:1px;position:relative">
              ${!pastCutoff?`<div style="position:absolute;top:-3px;width:8px;height:8px;border-radius:50%;background:#6366f1;left:${Math.min(95,Math.max(2,100-(daysToC/(daysToC+(now.getDate()-parseInt(dates.cycleStart?.split('-')[2]||1)+1||1))*100)))}%;transform:translateX(-50%)"></div>`:''}
            </div>
            <div class="text-center flex-1">
              <div style="color:${pastCutoff?'#34d399':nearCutoff?'#f87171':'#9ca3af'};font-weight:600">${cutoffLabel}</div>
              <div style="color:#6b7280;margin-top:1px">Cut-off</div>
            </div>
            <div style="flex:1;height:2px;background:${pastCutoff?'linear-gradient(90deg,#10b981,rgba(255,255,255,0.05))':'rgba(255,255,255,0.05)'};border-radius:1px"></div>
            <div class="text-center flex-1">
              <div style="color:${nearDue?'#f87171':'#9ca3af'};font-weight:600">${dueLabel}</div>
              <div style="color:#6b7280;margin-top:1px">Due date</div>
            </div>
          </div>
          <div class="flex justify-between text-xs mt-2" style="color:#6b7280">
            <span>${pastCutoff?'Statement closed':'Charges here → this bill'}</span>
            <span style="color:${nearDue?'#f87171':'#6b7280'}">${daysToD}d to pay</span>
          </div>
        </div>

        <!-- Balance Grid -->
        <div class="grid grid-cols-2 gap-2 mb-3">
          <div class="rounded-lg p-3" style="background:#1c2028;${c.lastStatement>0?'grid-column:span 2':''};${c.lastStatement>0?'':''}">
            <div class="text-xs mb-1" style="color:#6b7280">Statement Balance</div>
            ${c.lastStatement>0?`
            <div class="flex items-start justify-between">
              <div>
                <div class="text-sm font-bold text-amber-400">${fmt(c.lastStatement)}</div>
                <div class="text-xs mt-0.5" style="color:#6b7280">Last billed amount</div>
              </div>
              <div class="text-right">
                ${stmtFullyPaid
                  ? `<div class="text-xs px-2 py-1 rounded-lg font-semibold" style="background:rgba(16,185,129,0.15);color:#34d399">✅ Fully Paid</div>`
                  : `<div class="text-xs" style="color:#9ca3af">Paid <span style="color:#34d399;font-weight:600">${fmt(stmtPayments)}</span></div>
                     <div class="text-xs mt-0.5" style="color:#f87171;font-weight:600">Still owed ${fmt(stmtRemaining)}</div>`
                }
              </div>
            </div>
            ${stmtPayments>0&&!stmtFullyPaid?`
            <div class="mt-2 rounded-full overflow-hidden" style="height:3px;background:rgba(255,255,255,0.08)">
              <div style="width:${Math.min(100,(stmtPayments/c.lastStatement)*100).toFixed(1)}%;height:3px;background:#34d399;border-radius:2px"></div>
            </div>`:''}`
            :`<div class="text-sm font-bold" style="color:#6b7280">—</div>
            <div class="text-xs mt-0.5" style="color:#6b7280">No statement set</div>`}
          </div>
          <div class="rounded-lg p-3" style="background:#1c2028">
            <div class="text-xs mb-1" style="color:#6b7280">Current Balance</div>
            <div class="text-sm font-bold ${isPaid?'text-emerald-400':'text-red-400'}">${isPaid?'Paid ✓':fmt(c.outstanding)}</div>
            <div class="text-xs mt-0.5" style="color:#6b7280">${newCharges>0?`+${fmt(newCharges)} new charges`:'No new charges'}</div>
          </div>
          <div class="rounded-lg p-3" style="background:#1c2028">
            <div class="text-xs mb-1" style="color:#6b7280">Available Credit</div>
            <div class="text-base font-bold text-emerald-400">${fmt(avail)}</div>
          </div>
          <div class="rounded-lg p-3" style="background:#1c2028">
            <div class="text-xs mb-1" style="color:#6b7280">Credit Limit</div>
            <div class="text-base font-bold" style="color:#f1f1f3">${fmt(c.limit)}</div>
          </div>
        </div>

        ${c.minDue>0&&!isPaid?`
        <div class="flex items-center justify-between py-2 px-3 rounded-lg mb-3" style="background:rgba(245,158,11,0.06);border:1px solid rgba(245,158,11,0.2)">
          <div class="text-xs" style="color:#9ca3af">⚠️ Minimum Amount Due <span style="color:#6b7280">· pay by ${dueLabel}</span></div>
          <div class="text-sm font-bold text-amber-400">${fmt(c.minDue)}</div>
        </div>`:''}

        <!-- Utilization bar -->
        <div class="flex items-center gap-2">
          <div class="flex-1 rounded-full overflow-hidden" style="height:5px;background:#1c2028">
            <div style="width:${pct.toFixed(1)}%;height:5px;background:${isPaid?'#10b981':barColor};border-radius:3px;transition:width 0.3s"></div>
          </div>
          <span class="text-xs flex-shrink-0" style="color:#6b7280">${pct.toFixed(1)}% used</span>
        </div>
      </div>`;
  }
  const addAcctModal = acctUI.showAddAcct ? `
    <div class="fixed inset-0 flex items-end sm:items-center justify-center" style="z-index:200;background:rgba(0,0,0,0.8)" onclick="acctCloseAdd()">
      <div class="w-full sm:w-96 rounded-t-3xl sm:rounded-2xl p-6" style="background:#1c2028;border:1px solid rgba(255,255,255,0.08);max-height:92vh;overflow-y:auto" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between mb-5">
          <div class="text-lg font-bold">Add Account</div>
          <button onclick="acctCloseAdd()" style="background:none;border:none;color:#6b7280;cursor:pointer;font-size:22px;line-height:1">×</button>
        </div>
        <div class="inline-flex p-1 rounded-xl mb-4 gap-1 w-full" style="background:#16191f;border:1px solid rgba(255,255,255,0.05)">
          ${['bank','ewallet','cash'].map(t=>`<button onclick="acctSetAddType('${t}')" class="flex-1 rounded-lg py-2 text-xs font-medium" style="${acctUI.addType===t?'background:#1c2028;color:#f1f1f3;border:1px solid rgba(255,255,255,0.08)':'background:transparent;color:#6b7280;border:1px solid transparent'}">${t==='bank'?'🏦 Bank':t==='ewallet'?'📱 E-Wallet':'💵 Cash'}</button>`).join('')}
        </div>
        <div class="grid gap-3 mb-3" style="grid-template-columns:56px 1fr">
          <div><div class="field-label">ICON</div><input id="acct-icon" type="hidden" value="${acctUI.addType==='bank'?'🏦':acctUI.addType==='ewallet'?'📱':'💵'}">
          <button type="button" id="acct-icon-btn" onclick="iconPickerOpen('acct-icon',acctUI.addType)" onmouseover="this.style.borderColor='#6366f1'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'" style="width:100%;height:44px;background:#16191f;border:1px solid rgba(255,255,255,0.08);border-radius:10px;font-size:24px;cursor:pointer;line-height:1;transition:border-color 0.15s">${acctUI.addType==='bank'?'🏦':acctUI.addType==='ewallet'?'📱':'💵'}</button></div>
          <div><div class="field-label">NAME *</div><input id="acct-name" type="text" placeholder="e.g. BDO Savings" class="field-input"></div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-5">
          <div><div class="field-label">BALANCE (₱)</div><input id="acct-balance" type="number" step="0.01" min="0" placeholder="0.00" class="field-input"></div>
          <div><div class="field-label">MAINTAINING BAL. (₱)</div><input id="acct-mbalance" type="number" step="0.01" min="0" placeholder="0.00" class="field-input" title="Min balance to keep in account"></div>
        </div>
        <div id="acct-err" class="text-red-400 text-xs mb-3"></div>
        <div class="flex gap-3">
          <button onclick="acctSave()" class="flex-1 rounded-xl py-3 font-semibold text-white text-sm" style="background:#6366f1;border:none;cursor:pointer">Add Account</button>
          <button onclick="acctCloseAdd()" class="flex-1 rounded-xl py-3 text-sm" style="background:#16191f;border:1px solid rgba(255,255,255,0.08);color:#9ca3af;cursor:pointer">Cancel</button>
        </div>
      </div>
    </div>` : '';

  const addCCModal = acctUI.showAddCC ? `
    <div class="fixed inset-0 flex items-end sm:items-center justify-center" style="z-index:200;background:rgba(0,0,0,0.8)" onclick="ccCloseAdd()">
      <div class="w-full sm:w-96 rounded-t-3xl sm:rounded-2xl p-6" style="background:#1c2028;border:1px solid rgba(255,255,255,0.08);max-height:92vh;overflow-y:auto" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between mb-5">
          <div class="text-lg font-bold">Add Credit Card</div>
          <button onclick="ccCloseAdd()" style="background:none;border:none;color:#6b7280;cursor:pointer;font-size:22px;line-height:1">×</button>
        </div>
        <div class="grid gap-3 mb-3" style="grid-template-columns:56px 1fr">
          <div><div class="field-label">ICON</div><input type="hidden" id="cc-icon" value="💳">
          <button type="button" onclick="iconPickerOpen('cc-icon','cc')" id="cc-icon-btn" onmouseover="this.style.borderColor='#6366f1'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'" style="width:100%;height:44px;background:#16191f;border:1px solid rgba(255,255,255,0.08);border-radius:10px;font-size:24px;cursor:pointer;line-height:1;transition:border-color 0.15s">💳</button></div>
          <div><div class="field-label">NAME *</div><input id="cc-name" type="text" placeholder="e.g. BPI Credit Card" class="field-input"></div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div><div class="field-label">OUTSTANDING (₱)</div><input id="cc-owed" type="number" step="0.01" min="0" placeholder="0.00" class="field-input"></div>
          <div><div class="field-label">CREDIT LIMIT (₱)</div><input id="cc-lim" type="number" step="0.01" min="0" placeholder="0.00" class="field-input"></div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div><div class="field-label">CUT-OFF DAY</div><input id="cc-cutoff" type="number" min="1" max="31" placeholder="22" class="field-input" title="Last day of billing cycle (from your statement)"></div>
          <div><div class="field-label">DUE DAY</div><input id="cc-due" type="number" min="1" max="31" placeholder="8" class="field-input"></div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div><div class="field-label">STATEMENT BAL. (₱)</div><input id="cc-last-stmt" type="number" step="0.01" min="0" placeholder="0.00" class="field-input" title="Total Amount Due from your last statement"></div>
          <div><div class="field-label">MIN. AMOUNT DUE (₱)</div><input id="cc-min-due" type="number" step="0.01" min="0" placeholder="0.00" class="field-input"></div>
        </div>
        <div id="cc-err" class="text-red-400 text-xs mb-3"></div>
        <div class="flex gap-3">
          <button onclick="ccSave()" class="flex-1 rounded-xl py-3 font-semibold text-white text-sm" style="background:#6366f1;border:none;cursor:pointer">Add Card</button>
          <button onclick="ccCloseAdd()" class="flex-1 rounded-xl py-3 text-sm" style="background:#16191f;border:1px solid rgba(255,255,255,0.08);color:#9ca3af;cursor:pointer">Cancel</button>
        </div>
      </div>
    </div>` : '';

  return `${renderNav()}
    <div class="text-2xl font-bold mb-5">Accounts</div>
    <div class="rounded-2xl p-5 mb-6" style="background:linear-gradient(135deg,#1e3461 0%,#312e81 100%);border:1px solid rgba(99,102,241,0.3)">
      <div class="text-xs mb-1" style="color:rgba(255,255,255,0.55)">Net Worth</div>
      <div class="text-4xl font-bold mb-4">${fmt2(nw)}</div>
      <div class="grid grid-cols-2 gap-4">
        <div><div class="text-xs mb-1" style="color:rgba(255,255,255,0.5)">Total Assets</div><div class="text-lg font-semibold text-emerald-400">${fmt2(totalDebit)}</div></div>
        <div><div class="text-xs mb-1" style="color:rgba(255,255,255,0.5)">Total Owed</div><div class="text-lg font-semibold text-red-400">${fmt2(totalOwed)}</div></div>
      </div>
      ${totalMaintaining>0?`<div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.1);display:flex;justify-content:space-between;align-items:center"><div style="font-size:11px;color:rgba(255,255,255,0.45)">Spendable (excl. maintaining bal.)</div><div style="font-size:14px;font-weight:600;color:#fbbf24">${fmt2(totalSpendable)}</div></div>`:''}
    </div>
    ${section('Banks', banks, 'bank', sumB)}
    ${section('E-Wallets', ewallets, 'ewallet', sumE)}
    ${section('Cash', cashList, 'cash', sumC)}
    <div class="rounded-2xl p-4 mb-4" style="background:#1c2028">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span>💳</span><span class="font-semibold">Credit Cards</span>
          <span class="text-xs px-2 py-0.5 rounded-full font-medium" style="background:rgba(245,158,11,0.12);color:#f59e0b">${state.creditCards.length}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm font-semibold text-red-400">Owed ${fmt2(totalOwed)}</span>
          <button onclick="ccOpenAdd()" class="text-xs px-3 py-1.5 rounded-lg font-semibold text-white" style="background:#6366f1;border:none;cursor:pointer">+ Add</button>
        </div>
      </div>
      ${state.creditCards.map(c=>ccCard(c)).join('')}
      ${state.creditCards.length===0?`<div class="text-center py-4 text-sm" style="color:#6b7280">No credit cards added yet</div>`:''}
    </div>
    ${addAcctModal}${addCCModal}`;
}


window.fabOpen = () => {
  currentView = 'transactions';
  txUI.showModal = true;
  txUI.editId = null;
  txUI.deleteId = null;
  render();
  setTimeout(() => document.getElementById('tx-desc')?.focus(), 60);
};

// ═══════════════════════════════════════════════════════
// RENDER BOTTOM NAV
// ═══════════════════════════════════════════════════════
function renderBottomNav() {
  const inTxSection = ['transactions','categories','recurring'].includes(currentView);
  const isActive = v => v==='dashboard' ? currentView==='dashboard' : v==='transactions' ? inTxSection : currentView===v;
  const tab = (k,ic,lbl) => `<button class="bnav-item${isActive(k)?' active':''}" onclick="setView('${k}')"><div class="bnav-pill"></div><span class="bnav-icon">${ic}</span><span class="bnav-label">${lbl}</span></button>`;
  const fab = `<div class="bnav-fab-wrap"><button class="bnav-fab" onclick="fabOpen()" title="Add transaction">+</button></div>`;
  return `<div class="bottom-nav"><div class="bottom-nav-inner">${tab('dashboard','🏠','Home')}${tab('transactions','💸','Txns')}${fab}${tab('accounts','🏦','Accts')}${tab('goals','🎯','Goals')}</div></div>`;
}


function render() {
  if (isLoading) {
    document.getElementById('app').innerHTML = renderLoadingScreen();
    document.getElementById('bottom-nav').innerHTML = '';
    return;
  }
  if (!currentUser) {
    document.getElementById('app').innerHTML = renderLoginScreen();
    document.getElementById('bottom-nav').innerHTML = '';
    let pill = document.getElementById('user-pill-root');
    if (pill) pill.innerHTML = '';
    return;
  }
  let html;
  if      (currentView==='transactions') html=renderTransactions();
  else if (currentView==='categories')   html=renderCategories();
  else if (currentView==='accounts')     html=renderAccounts();
  else if (currentView==='goals')        html=renderGoals();
  else if (currentView==='recurring')    html=renderRecurring();
  else                                   html=renderDashboard();
  document.getElementById('app').innerHTML = html;
  document.getElementById('bottom-nav').innerHTML = renderBottomNav();
  // Inject user pill into body (outside #app so it's always visible)
  let pill = document.getElementById('user-pill-root');
  if (!pill) { pill = document.createElement('div'); pill.id='user-pill-root'; document.body.appendChild(pill); }
  pill.innerHTML = renderUserPill();
  attachEdits();
}
