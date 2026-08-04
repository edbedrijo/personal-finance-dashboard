// ═══════════════════════════════════════════════════════
// RENDER NAV
// ═══════════════════════════════════════════════════════
function renderNav() {
  const inTxSection = ['transactions','categories','recurring','insights'].includes(currentView);
  const isActive = v => v==='dashboard' ? currentView==='dashboard' : v==='transactions' ? inTxSection : currentView===v;
  const items = [['dashboard','🏠','Home'],['transactions','💸','Transactions'],['accounts','🏦','Accounts'],['goals','🎯','Goals']];
  const subNav = inTxSection ? `
    <div class="nav-scroll mb-5" style="margin-top:0">
      <nav class="subnav-pill">
        ${[['transactions','Transactions'],['categories','Categories'],['recurring','Recurring'],['insights','📊 Insights']].map(([k,lbl])=>`
        <span class="nav-item ${currentView===k?'active':''}" onclick="setView('${k}')">${lbl}</span>`).join('')}
      </nav>
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
    </div>` : `<div class="flex items-center gap-2 text-lg font-bold mb-2 cursor-pointer select-none" onclick="setView('dashboard')" title="Back to Dashboard" style="color:var(--text);letter-spacing:-0.01em">💰 Personal Finance</div>`}
    <div class="top-nav-wrap">
      <nav class="nav-scroll nav-pill text-sm">
        ${items.map(([k,ic,lbl])=>`<span class="nav-item ${isActive(k)?'active':''}" onclick="setView('${k}')" style="${isActive(k)?'':'color:var(--text-3)'}">${ic} ${lbl}</span>`).join('')}
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
  list = list.filter(t => inRange(t, txUI.range));
  if (txUI.typeFilter !== 'all') list = list.filter(t => t.type === txUI.typeFilter);

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
        <div class="tx-row" style="background:var(--danger-surface);border-radius:10px;padding:10px 12px;margin:4px 0;border:1px solid var(--danger-border)">
          <div class="flex-1 text-sm" style="color:var(--danger-text)">Delete <strong>${tx.description}</strong> (${fmt(tx.amount)})? This cannot be undone.</div>
          <div class="flex gap-2 flex-shrink-0">
            <button onclick="txConfirmDelete()" class="text-xs px-3 py-1.5 rounded-lg font-semibold" style="background:var(--red-strong);border:none;color:#fff;cursor:pointer">Delete</button>
            <button onclick="txCancelDelete()" class="text-xs px-3 py-1.5 rounded-lg" style="background:var(--btn-ghost);border:none;color:var(--text-2);cursor:pointer">Cancel</button>
          </div>
        </div>`;
      return `
        <div class="tx-row">
          <div class="tx-icon">${cat?.icon||'💸'}</div>
          <div class="flex-1 min-w-0">
            <div class="text-sm font-medium truncate" style="color:var(--text)">${tx.description}</div>
            <div class="text-xs mt-0.5" style="color:var(--text-3)">${tx.type==='transfer'?(tx.notes==='Goal deposit'?'🎯 Goal deposit':tx.notes==='Loan payment'?'🏦 Loan payment':tx.notes==='Loan disbursement'?`💵 Loan proceeds → ${findAccount(tx.toAccountId)?.name||'?'}`:`🔄 Transfer → ${findAccount(tx.toAccountId)?.name||'?'}`):cat?.name||''}${subcat?' · '+subcat.name:''}${(() => { const a=findAccount(tx.accountId); return a ? ` · <span style="color:${state.creditCards.find(c=>c.id===tx.accountId)?'var(--amber)':'var(--text-3)'}">${a.icon||''}${state.creditCards.find(c=>c.id===tx.accountId)?' CC':''} ${a.name}</span>` : ''; })()}</div>
          </div>
          <div class="flex items-center gap-2 flex-shrink-0">
            <div class="text-sm font-semibold ${tx.type==='income'?'text-pos':tx.type==='transfer'?'text-accent':'text-neg'}">
              ${tx.type==='income'?'+':tx.type==='transfer'?'⇄':'-'}${fmt(tx.amount)}
            </div>
            <button onclick="txOpenEdit('${tx.id}')" class="text-dimmer hover:text-accent transition-colors text-sm leading-none" style="background:none;border:none;cursor:pointer;padding:2px 4px" title="Edit">✏️</button>
            <button onclick="txAskDelete('${tx.id}')" class="text-dimmer hover:text-neg transition-colors text-base leading-none" style="background:none;border:none;cursor:pointer;padding:2px 4px">×</button>
          </div>
        </div>`;
    }).join('');
    return `
      <div class="mb-4">
        <div class="section-label mb-2">${fmtDate(date)}</div>
        ${rows}
      </div>`;
  }).join('');




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
      ? `background:var(--surface);border:1px solid var(--border);color:${t==='income'?'var(--green)':t==='expense'?'var(--red)':'var(--accent-text)'}`
      : 'background:transparent;border:1px solid transparent;color:var(--text-3)';
    modalHtml = `
    <div class="modal-overlay fixed inset-0 flex items-end sm:items-center justify-center" style="z-index:200;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px)" onclick="txCloseModal()">
      <div class="w-full sm:w-96 rounded-t-3xl sm:rounded-2xl p-6" style="background:var(--surface);border:1px solid var(--border);max-height:92vh;overflow-y:auto;box-shadow:0 -8px 40px rgba(0,0,0,0.4)" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between mb-5">
          <div class="text-lg font-bold">${isEdit?'Edit Transaction':'Add Transaction'}</div>
          <button onclick="txCloseModal()" style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:20px;line-height:1">×</button>
        </div>

        <div class="field-label">TYPE</div>
        <div class="inline-flex p-1 rounded-xl mb-4 gap-1 w-full" style="background:var(--surface2);border:1px solid var(--border2)">
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

        <div id="tx-error" class="text-neg text-xs mb-3"></div>

        <div class="flex gap-3">
          <button onclick="txSave()" class="flex-1 rounded-xl py-3 font-semibold text-white text-sm" style="background:var(--accent);border:none;cursor:pointer;box-shadow:0 2px 12px var(--accent-glow);letter-spacing:0.01em">${isEdit?'Update Transaction':'Save Transaction'}</button>
          <button onclick="txCloseModal()" class="flex-1 rounded-xl py-3 text-sm" style="background:var(--surface2);border:1px solid var(--border);color:var(--text-2);cursor:pointer">Cancel</button>
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
        style="background:var(--accent);border:none;cursor:pointer">+ Add</button>
    </div>
    <div class="section-label mb-5">${state.transactions.length} Total &nbsp;&middot;&nbsp; ${list.length} In View</div>

    <!-- Summary bar -->
    <div class="grid grid-cols-3 gap-3 mb-5">
      <div class="rounded-xl p-3 text-center" style="background:var(--surface)">
        <div class="section-label mb-1">INCOME</div>
        <div class="font-bold text-pos text-sm">${fmt(totalIncome)}</div>
      </div>
      <div class="rounded-xl p-3 text-center" style="background:var(--surface)">
        <div class="section-label mb-1">EXPENSES</div>
        <div class="font-bold text-neg text-sm">${fmt(totalExpense)}</div>
      </div>
      <div class="rounded-xl p-3 text-center" style="background:var(--surface)">
        <div class="section-label mb-1">NET</div>
        <div class="font-bold text-sm ${net>=0?'text-pos':'text-neg'}">${net>=0?'+':''}${fmt(net)}</div>
      </div>
    </div>

    <!-- Filters: date range + type -->
    <div class="flex gap-2 mb-5 flex-wrap items-center">
      <button onclick="rangeOpen('tx')" class="text-xs px-3 py-1.5 rounded-full font-semibold transition-all"
        style="background:var(--accent);color:var(--on-accent);border:1px solid var(--card-border);cursor:pointer">
        📅 ${rangeLabel(txUI.range)} ▾
      </button>
      ${[['all','All'],['expense','Expenses'],['income','Income'],['transfer','Transfers']].map(([f,lbl])=>`
        <button onclick="txSetTypeFilter('${f}')" class="text-xs px-3 py-1.5 rounded-full transition-all"
          style="${txUI.typeFilter===f?'background:var(--surface3);color:var(--text);border:1px solid var(--card-border);font-weight:600':'background:var(--surface);color:var(--text-2);border:1px solid var(--border)'};cursor:pointer">
          ${lbl}
        </button>`).join('')}
    </div>

    <!-- Transaction list -->
    <div class="rounded-2xl p-4" style="background:var(--surface)">
      ${list.length === 0
        ? `<div class="text-center py-12" style="color:var(--text-3)">
            <div class="text-4xl mb-3">💸</div>
            <div class="font-semibold mb-1" style="color:var(--text-2)">No transactions</div>
            <div class="text-sm">Click "+ Add" to log your first one.</div>
          </div>`
        : rowsHTML}
    </div>
    ${modal}
    ${txUI.showRange ? renderRangeModal('tx') : ''}`;
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
    const toggleBg=cat.active?'var(--green-strong)':'var(--border)', knobLeft=cat.active?'19px':'3px';
    const subsSection=isExpanded?`
      <div style="background:var(--surface2);border-top:1px solid var(--border2)" class="px-4 pt-3 pb-4 rounded-b-2xl">
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
          <button onclick="catAddSub('${cat.id}')" class="text-xs px-3 py-1.5 rounded-full text-white font-semibold" style="background:var(--accent);border:none;cursor:pointer">Add</button>
        </div>
      </div>`:'' ;
    return `<div class="rounded-2xl overflow-hidden" style="background:var(--surface);${cat.active?'':'opacity:0.5'}">
      <div class="flex items-center gap-3 p-4">
        <div id="cat-icon-${cat.id}" onclick="catStartRenameIcon('${cat.id}')" class="flex-shrink-0 flex items-center justify-center rounded-xl text-xl cursor-pointer" style="width:44px;height:44px;background:var(--surface2);border:1px solid var(--border2)">${cat.icon}</div>
        <div class="flex-1 min-w-0">
          <div id="cat-name-${cat.id}" ondblclick="catStartRenameCategory('${cat.id}')" class="font-semibold text-sm truncate" style="color:var(--text);cursor:text">${cat.name}</div>
          <div class="text-xs mt-0.5" style="color:var(--text-3)">${activeSubs}/${cat.subs.length} subcategories</div>
        </div>
        <div class="flex items-center gap-3 flex-shrink-0">
          <div class="cat-toggle" onclick="catToggle('${cat.id}')" style="width:38px;height:22px;background:${toggleBg}"><div class="cat-toggle-knob" style="left:${knobLeft}"></div></div>
          <button onclick="catToggleExpand('${cat.id}')" style="background:none;border:none;cursor:pointer;color:var(--text-2);font-size:20px;line-height:1;padding:0;transform:rotate(${isExpanded?'180':'0'}deg);transition:transform 0.2s">⌄</button>
        </div>
      </div>${subsSection}</div>`;
  }).join('');
  const modal=catUI.showModal?`
    <div class="fixed inset-0 z-50 flex items-center justify-center" style="background:rgba(0,0,0,0.8)" onclick="catCloseModal()">
      <div class="rounded-2xl p-7 w-80" style="background:var(--surface);border:1px solid var(--border)" onclick="event.stopPropagation()">
        <div class="text-lg font-bold mb-1">New ${catUI.tab==='expense'?'Expense':'Income'} Category</div>
        <div class="text-sm mb-5" style="color:var(--text-3)">Fill in the details below.</div>
        <div class="section-label mb-1.5">EMOJI ICON</div>
        <input id="modal-icon" placeholder="🗂️" class="w-full rounded-xl p-3 mb-4 text-2xl" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);outline:none;font-family:inherit">
        <div class="section-label mb-1.5">CATEGORY NAME</div>
        <input id="modal-name" placeholder="e.g. Education" onkeydown="if(event.key==='Enter')catAddFromModal();if(event.key==='Escape')catCloseModal()" class="w-full rounded-xl p-3 mb-6" style="background:var(--surface2);border:1px solid var(--border);color:var(--text);outline:none;font-size:15px;font-family:inherit">
        <div class="flex gap-3">
          <button onclick="catAddFromModal()" class="flex-1 rounded-xl py-3 text-sm font-semibold text-white" style="background:var(--accent);border:none;cursor:pointer">Add Category</button>
          <button onclick="catCloseModal()" class="flex-1 rounded-xl py-3 text-sm" style="background:var(--surface2);border:1px solid var(--border);color:var(--text-2);cursor:pointer">Cancel</button>
        </div>
      </div>
    </div>`:'' ;
  return `${renderNav()}
    <div class="flex items-center justify-between mb-1">
      <div class="text-2xl font-bold">Categories</div>
      <button onclick="catOpenModal()" class="rounded-xl px-4 py-2.5 text-sm font-semibold text-white flex-shrink-0" style="background:var(--accent);border:none;cursor:pointer">+ Add</button>
    </div>
    <div class="section-label mb-5">${expCount} Expense &nbsp;&middot;&nbsp; ${incCount} Income &nbsp;&middot;&nbsp; ${activeCount} Active</div>
    <div class="inline-flex p-1 rounded-xl mb-5 gap-1" style="background:var(--surface2);border:1px solid var(--border2)">
      <button onclick="catSetTab('expense')" class="rounded-lg px-5 py-2 text-sm font-medium" style="${catUI.tab==='expense'?'background:var(--surface);color:var(--text);border:1px solid var(--border)':'background:transparent;color:var(--text-3);border:1px solid transparent'}">💸 Expense (${expCount})</button>
      <button onclick="catSetTab('income')" class="rounded-lg px-5 py-2 text-sm font-medium" style="${catUI.tab==='income'?'background:var(--surface);color:var(--text);border:1px solid var(--border)':'background:transparent;color:var(--text-3);border:1px solid transparent'}">💰 Income (${incCount})</button>
    </div>
    <div class="text-xs mb-4" style="color:var(--text-3)">💡 Double-click to rename &nbsp;·&nbsp; Click emoji to change</div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">${filtered.length===0?`<div class="col-span-2 text-center py-16" style="color:var(--text-3)"><div class="text-5xl mb-3">🗂️</div><div class="font-semibold mb-1" style="color:var(--text-2)">No categories</div></div>`:cards}</div>
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
      <div class="text-sm max-w-xs" style="color:var(--text-3)">${note}</div>
      <div class="mt-5 text-xs px-4 py-2 rounded-full" style="color:var(--text-3);border:1px solid var(--border2)">Coming soon</div>
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
        <div style="font-size:20px;font-weight:700;color:var(--text);margin-bottom:8px">Welcome to Personal Finance</div>
        <div style="color:var(--text-3);font-size:14px;line-height:1.7;margin-bottom:32px">Get started by adding your bank accounts,<br>or import your existing data below.</div>
        <div style="display:flex;flex-direction:column;gap:12px;max-width:300px;margin:0 auto">
          <button onclick="setView('accounts')" style="padding:14px;border-radius:12px;background:var(--accent);border:none;color:#fff;font-size:14px;font-weight:600;cursor:pointer">🏦 Add My Accounts</button>
          <button onclick="showImportPanel()" style="padding:14px;border-radius:12px;background:var(--surface);border:1px solid var(--border);color:var(--text-2);font-size:14px;font-weight:600;cursor:pointer">📥 Import Existing Data</button>
        </div>
        <div id="import-panel" style="display:none;margin-top:24px;background:var(--surface);border:1px solid var(--border);border-radius:16px;padding:20px;text-align:left">
          <div style="font-weight:600;margin-bottom:4px;color:var(--text)">Import Your Data</div>
          <div style="color:var(--text-3);font-size:12px;margin-bottom:16px">CSV is the easiest — works from Excel, Google Sheets, or any app</div>
          <div style="display:flex;flex-direction:column;gap:10px">
            <button onclick="importCSV()" style="padding:12px 14px;border-radius:10px;background:var(--accent);border:none;color:#fff;font-size:13px;cursor:pointer;text-align:left;font-weight:600">
              📊 Import Transactions from CSV
            </button>
            <button onclick="importData()" style="padding:12px 14px;border-radius:10px;background:var(--surface2);border:1px solid var(--border);color:var(--text-2);font-size:13px;cursor:pointer;text-align:left">
              🗂 Restore from JSON Backup
            </button>
          </div>
          <div id="import-status" style="margin-top:12px;font-size:13px"></div>
          <details style="margin-top:16px">
            <summary style="color:var(--text-3);font-size:12px;cursor:pointer;user-select:none">📋 CSV Format Guide</summary>
            <div style="margin-top:10px;background:var(--surface2);border-radius:8px;padding:12px;font-size:11px;color:var(--text-2);font-family:monospace;overflow-x:auto;white-space:nowrap">
              Date,Description,Type,Amount,Category,Subcategory,Account,Notes<br>
              2026-05-01,Jollibee,expense,150,Food,Fast Food,GCash,Lunch<br>
              2026-05-07,Upwork,income,50000,Freelance,Upwork,Unionbank,<br>
              2026-06-01,Rent,expense,22000,Housing,,Unionbank,June rent
            </div>
            <div style="margin-top:10px;color:var(--text-3);font-size:11px;line-height:1.7">
              <strong style="color:var(--text-2)">Required:</strong> Date (YYYY-MM-DD), Description, Type (expense/income/transfer), Amount<br>
              <strong style="color:var(--text-2)">Optional:</strong> Category, Subcategory, Account, Notes<br>
              <strong style="color:var(--text-2)">Tip:</strong> Category and Account names must match what you set up in this app
            </div>
          </details>
        </div>
      </div>`;
  }

  const nw=netWorth(), assets=totalAssets(), assetsVal=assetsValue(), spendable=spendableAssets(), liab=totalLiab();
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
  // Loan monthly payments — same treatment as CC dues. Loans store no due-day, so
  // derive it from the start date's day-of-month; skip fully-paid loans.
  const loanNextDue = l => {
    const start = l.startDate || todayISO;
    // Never schedule a payment before the loan starts — for a future-dated loan the
    // floor is its start date, otherwise today.
    const floor = start > todayISO ? start : todayISO;
    const day = new Date(start+'T00:00:00').getDate();
    const fd = new Date(floor+'T00:00:00');
    const d = new Date(fd.getFullYear(), fd.getMonth(), day);
    let due = toLocalISO(d);
    if (due < floor) { d.setMonth(d.getMonth()+1); due = toLocalISO(d); }
    return due;
  };
  const loanDueForecast = (state.loans||[])
    .map(l=>({l, t:loanTotals(l)}))
    .filter(x=>x.t.paymentsLeft>0)
    .map(x=>({l:x.l, amount:x.t.monthlyPayment, due:loanNextDue(x.l)}));
  const loanForecastExp = loanDueForecast
    .filter(x=>x.due>=todayISO && x.due<=forecastEnd)
    .reduce((s,x)=>s+x.amount,0);
  const allLoanDue = loanDueForecast.reduce((s,x)=>s+x.amount,0);
  // Projected everyday (non-scheduled) CASH spending across the window. Two things
  // are already counted elsewhere and must be excluded to avoid double-counting:
  //   1. Expenses charged to a credit card → captured by the CC due line above.
  //   2. Recurring bills → itemized under Scheduled Expenses above.
  // So the burn base here is cash-paid, non-recurring expenses only.
  const freqToMonthly = {daily:30, weekly:4.3333, biweekly:2.1667, monthly:1, quarterly:1/3, yearly:1/12};
  const ccIds = new Set((state.creditCards||[]).map(c=>c.id));
  const autoAvgCashExp = (() => {
    const months = [];
    for (let i=1; i<=3; i++) {
      const mo = (now.getMonth()-i+12)%12, yr = now.getMonth()-i<0?now.getFullYear()-1:now.getFullYear();
      const sum = (state.transactions||[]).filter(t=>{ const d=new Date(t.date+'T00:00:00'); return t.type==='expense'&&!ccIds.has(t.accountId)&&d.getFullYear()===yr&&d.getMonth()===mo; }).reduce((s,t)=>s+t.amount,0);
      if (sum>0) months.push(sum);
    }
    return months.length>0 ? months.reduce((a,b)=>a+b,0)/months.length : 0;
  })();
  const monthlyRecurringCashExp = (state.recurring||[])
    .filter(r=>r.type==='expense'&&r.active&&!ccIds.has(r.accountId))
    .reduce((s,r)=>s+r.amount*(freqToMonthly[r.frequency]||1),0);
  const variableDaily = Math.max(0, autoAvgCashExp - monthlyRecurringCashExp)/30;
  const projectedVariable = variableDaily * (state.forecastDays||7);
  // Planned monthly goal savings, prorated to the window — money you intend to set
  // aside isn't free to spend.
  const plannedSavings = (state.goals||[]).reduce((s,g)=>s+(g.monthlyPlan||0),0) * (state.forecastDays||7)/30;
  // Personal cash floor: a buffer you never want to dip below.
  const cashFloor = state.cashFloor||0;
  const available=spendable+forecastIncome-forecastExpense-ccForecastExp-loanForecastExp-projectedVariable-plannedSavings-cashFloor;
  // Stricter bottom line: subtract EVERY unpaid CC due and next loan payment, even
  // outside the window — that money is already spoken for, whatever the window says.
  const allCCDue=ccDueForecast.reduce((s,c)=>s+ccDueAmount(c),0);
  const afterAllCC=spendable+forecastIncome-forecastExpense-allCCDue-allLoanDue-projectedVariable-plannedSavings-cashFloor;
  const healthRatio=spendable>0?afterAllCC/spendable:(afterAllCC>=0?1:-1);
  const weather=afterAllCC<0
    ? {icon:'⛈️', label:'Stormy', note:'Obligations exceed your available funds'}
    : healthRatio<0.25 ? {icon:'🌧️', label:'Rainy', note:'Most of your funds are already spoken for'}
    : healthRatio<0.6  ? {icon:'⛅', label:'Partly cloudy', note:'Covered, but spend with care'}
    :                    {icon:'☀️', label:'Sunny', note:'Obligations covered with room to spare'};
  // Upcoming bills strip — everything payable in the next 7 days
  const next7=toLocalISO(new Date(now.getTime()+7*86400000));
  const upcomingBills=[
    ...(state.recurring||[]).filter(r=>r.active&&r.type==='expense'&&r.nextDue<=next7).map(r=>({icon:r.icon||'🔁',name:r.name,date:r.nextDue,amount:r.amount})),
    ...ccDueForecast.map(c=>({icon:'💳',name:c.name,date:ccCycleDates(c.id)?.due,amount:ccDueAmount(c)})).filter(b=>b.date&&b.date<=next7),
    ...loanDueForecast.map(x=>({icon:x.l.icon||'🏦',name:x.l.name,date:x.due,amount:x.amount})).filter(b=>b.date&&b.date<=next7),
  ].sort((a,b)=>a.date.localeCompare(b.date));
  // Compute vs Last Month dynamically
  const curMo=now.getMonth(), curYr=now.getFullYear();
  const prevMo=curMo===0?11:curMo-1, prevYr=curMo===0?curYr-1:curYr;
  const lastMoExp=state.transactions.filter(t=>{const d=new Date(t.date+'T00:00:00');return t.type==='expense'&&d.getFullYear()===prevYr&&d.getMonth()===prevMo;}).reduce((s,t)=>s+t.amount,0);
  const vsLastMo = lastMoExp>0 ? (((m.expenses-lastMoExp)/lastMoExp)*100).toFixed(0) : null;
  const vsLastMoLabel = vsLastMo===null ? '—' : (vsLastMo>=0?`↑ ${vsLastMo}%`:`↓ ${Math.abs(vsLastMo)}%`);
  const vsLastMoColor = vsLastMo===null ? 'text-dim' : (vsLastMo>=0 ? 'text-neg' : 'text-pos');

  return `${renderNav()}
    <div class="rounded-2xl p-6 mb-6" style="background:var(--hero-gradient)">
      <div class="flex items-center justify-between mb-1">
        <div class="text-sm font-medium" style="color:rgba(28,25,23,0.85)">Net worth</div>
        <button onclick="toggleNetWorth()" title="${hideNetWorth?'Show amounts':'Hide amounts'}" style="background:rgba(28,25,23,0.1);border:1px solid rgba(28,25,23,0.3);border-radius:10px;padding:4px 10px;cursor:pointer;font-size:14px;line-height:1">${hideNetWorth?'🙈':'👁️'}</button>
      </div>
      <div class="text-5xl font-bold tracking-tight mb-5">${maskAmt(fmt2(nw))}</div>
      <div class="flex gap-10">
        <div><div class="text-xs font-medium mb-0.5" style="color:rgba(28,25,23,0.8)">Assets</div><div class="text-lg font-semibold">${maskAmt(fmt2(assets+assetsVal))}</div></div>
        <div><div class="text-xs font-medium mb-0.5" style="color:rgba(28,25,23,0.8)">Liabilities</div><div class="text-lg font-semibold">${maskAmt(fmt2(liab))}</div></div>
      </div>
      ${spendable!==assets?`<div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(28,25,23,0.25);display:flex;justify-content:space-between;align-items:center"><div class="text-xs font-medium" style="color:rgba(28,25,23,0.8)">Spendable (excl. maintaining bal.)</div><div class="text-sm font-bold">${maskAmt(fmt2(spendable))}</div></div>`:''}
    </div>
    <div class="bg-surface rounded-2xl p-5 mb-4">
      <div class="flex items-center justify-between mb-3"><div class="section-label">DEBIT ACCOUNTS</div><div class="text-xs text-pos font-medium">${fmt2(assets)}</div></div>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
        ${state.accounts.map(a=>`<div class="rounded-xl p-4 cursor-pointer" style="background:var(--bg)" onclick="setView('accounts')"><div class="flex items-center gap-2 mb-2"><div style="width:24px;height:24px;border-radius:7px;overflow:hidden;flex-shrink:0;font-size:14px;display:flex;align-items:center;justify-content:center">${brandBadge(a.name, a.icon||'')}</div><div class="text-xs text-dim truncate">${a.name}</div></div><div class="text-lg font-semibold">${editable(a.balance,`accounts.${a.id}.balance`,fmt)}</div></div>`).join('')}
      </div>
      <div class="flex items-center justify-between mb-3 mt-5 pt-4 border-t border-line"><div class="section-label">CREDIT CARDS</div><div class="text-xs text-neg font-medium">OWED ${fmt2(state.creditCards.reduce((s,c)=>s+c.outstanding,0))}</div></div>
      <div class="space-y-3">
        ${state.creditCards.map(c=>{
          const blockedCredit=(state.loans||[]).filter(l=>l.cardId===c.id).reduce((s,l)=>s+loanTotals(l).remainingPrincipal,0);
          const avail=c.limit-c.outstanding-blockedCredit, pct=c.limit>0?Math.min(((Math.max(c.outstanding,0)+blockedCredit)/c.limit)*100,100):0;
          return `<div class="rounded-xl p-4 cursor-pointer" style="background:var(--bg)" onclick="setView('accounts')">
            <div class="flex justify-between items-start mb-3">
              <div class="flex items-center gap-3"><div style="width:32px;height:32px;border-radius:9px;overflow:hidden;flex-shrink:0;font-size:18px;display:flex;align-items:center;justify-content:center">${brandBadge(c.name, c.icon||'💳')}</div><div><div class="font-medium">${c.name}</div><div class="text-xs text-dim mt-0.5">${(()=>{const dd=ccCycleDates(c.id);return dd?`Due ${fmtDateShort(dd.due)} · ${dd.daysToDue} days away`:`Due ${c.dueDay}${sfx(c.dueDay)}`})()}</div></div></div>
              <div class="text-right"><div class="${c.outstanding<0?'text-pos':'text-neg'} font-semibold">${fmt2(c.outstanding)}</div><div class="text-xs text-dim">${c.outstanding<0?'overpaid (credit)':'avl. '+fmt2(avail)}</div></div>
            </div>
            <div class="bg-surface2 rounded-full overflow-hidden" style="height:3px"><div style="width:${pct}%;height:3px;background:var(--red-strong);border-radius:2px"></div></div>
          </div>`;}).join('')}
      </div>
    </div>
    ${upcomingBills.length?`
    <div class="bg-surface rounded-2xl p-5 mb-4">
      <div class="flex items-center gap-2 mb-3"><span>📅</span><span class="font-semibold">Due in the next 7 days</span></div>
      ${upcomingBills.map(b=>`<div class="flex justify-between items-center py-1.5"><div class="text-sm flex items-center gap-2"><span>${b.icon}</span>${b.name}<span class="text-xs" style="color:${b.date<=todayISO?'var(--red)':'var(--text-3)'}">${b.date<=todayISO?'due today':fmtDateShort(b.date)}</span></div><div class="text-sm text-neg">− ${fmt(b.amount)}</div></div>`).join('')}
      <div class="flex justify-between items-center pt-3 mt-2 border-t border-line"><span class="text-sm font-semibold">Total due</span><span class="font-bold text-neg">− ${fmt(upcomingBills.reduce((s,b)=>s+b.amount,0))}</span></div>
    </div>`:''}
    <div class="bg-surface rounded-2xl p-5 mb-4">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-2"><span>📊</span><span class="font-semibold">${m.label}</span></div>
        <div class="text-xs px-2.5 py-1 rounded-full font-semibold ${net>=0?'pill-pos':'pill-neg'}">${net>=0?'+':''}${fmt(net)}</div>
      </div>
      <div class="space-y-3">
        <div>
          <div class="flex justify-between text-sm mb-1.5"><span class="text-dim">Income</span><span class="text-pos font-medium">${fmt2(m.income)}</span></div>
          <div class="bg-surface2 rounded-full overflow-hidden" style="height:6px"><div style="width:${incomeW}%;height:6px;background:linear-gradient(90deg,var(--green-strong),var(--green));border-radius:3px"></div></div>
        </div>
        <div>
          <div class="flex justify-between text-sm mb-1.5"><span class="text-dim">Expenses</span><span class="text-neg font-medium">${fmt2(m.expenses)}</span></div>
          <div class="bg-surface2 rounded-full overflow-hidden" style="height:6px"><div style="width:${expW}%;height:6px;background:linear-gradient(90deg,var(--red-strong),var(--red));border-radius:3px"></div></div>
        </div>
      </div>
      <div class="flex gap-4 mt-4 pt-4 border-t border-line">
        <div class="flex-1 text-center"><div class="text-xs text-dim mb-0.5">Net Income</div><div class="font-bold ${net>=0?'text-pos':'text-neg'}">${fmt(net)}</div></div>
        <div class="flex-1 text-center border-l border-line"><div class="text-xs text-dim mb-0.5">Savings Rate</div><div class="font-bold ${savingsRate>=20?'text-pos':'text-accent'}">${savingsRate}%</div></div>
        <div class="flex-1 text-center border-l border-line"><div class="text-xs text-dim mb-0.5">vs Last Month</div><div class="font-bold ${vsLastMoColor}">${vsLastMoLabel}</div></div>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-3 mb-4">
      <div class="bg-surface rounded-2xl p-5">
        <div class="text-xs text-dim mb-1">🔥 Daily Burn Rate</div>
        <div class="text-2xl font-bold">${fmt(dailyBurn)}</div>
        <div class="text-xs text-dimmer mt-1">per day</div>
        <div class="mt-3 pt-3 border-t border-line"><div class="text-xs text-dim">3-mo avg spend</div><div class="text-sm font-medium mt-0.5">${fmt(autoAvgExp)}</div></div>
      </div>
      <div class="bg-surface rounded-2xl p-5">
        <div class="text-xs text-dim mb-1">⏱️ Cash Runway</div>
        <div class="text-2xl font-bold ${runway<14?'text-neg':runway<30?'text-accent':'text-pos'}">${runway}</div>
        <div class="text-xs text-dimmer mt-1">days, if no income comes in</div>
        <div class="mt-3 pt-3 border-t border-line"><div class="text-xs ${runway<14?'text-neg':runway<30?'text-accent':'text-dim'}">${runway<14?'⚠️ Income needed soon':runway<30?'Moderate cushion':'Good buffer'}</div></div>
      </div>
    </div>
    <div class="bg-surface rounded-2xl p-5 mb-4">
      <div class="flex items-center gap-2 mb-4"><span>🏆</span><span class="font-semibold">Top Spending — ${m.label}</span></div>
      <div class="space-y-3">
        ${m.categories.map((c,i)=>{
          const pct=(c.amount/maxCat)*100;
          return `<div>
            <div class="flex justify-between items-center mb-1.5">
              <div class="flex items-center gap-2 text-sm"><span class="text-base">${c.icon}</span><span>${c.name}</span><span class="text-xs text-dimmer">#${i+1}</span></div>
              <span class="text-sm font-medium">${fmt(c.amount)}</span>
            </div>
            <div class="bg-surface2 rounded-full overflow-hidden" style="height:5px"><div style="width:${pct}%;height:5px;background:${c.color};border-radius:3px;opacity:0.85"></div></div>
          </div>`;}).join('')}
      </div>
    </div>
    <div class="bg-surface rounded-2xl p-5 mb-4">
      <div class="flex items-center justify-between mb-1">
        <div class="flex items-center gap-2"><span>🪙</span><span class="font-semibold">Spending Forecast</span></div>
        <div class="text-sm font-semibold flex items-center gap-1.5"><span style="font-size:18px">${weather.icon}</span>${weather.label}</div>
      </div>
      <div class="text-xs mb-4" style="color:var(--text-3)">${weather.note}</div>
      <div class="flex gap-2 mb-5 flex-wrap">
        ${[7,14,21,30].map(d=>`<button class="tab-btn text-xs px-3 py-1.5 rounded-full ${state.forecastDays===d?'active':'bg-surface2 text-dim'}" onclick="setForecast(${d})">${d} days</button>`).join('')}
      </div>
      <div class="flex justify-between py-2.5 border-b border-line"><span class="text-sm">Spendable funds${spendable!==assets?' <span class="text-xs text-dimmer">(excl. maintaining bal.)</span>':''}</span><span class="font-semibold">${fmt2(spendable)}</span></div>
      <div class="text-xs text-dimmer font-semibold tracking-wider mt-4 mb-2">SCHEDULED INCOME</div>
      ${forecastItems.income.length===0?`<div class="text-xs text-dimmer py-1.5">None in this window</div>`:forecastItems.income.map(r=>`<div class="flex justify-between items-center py-1.5"><div class="text-sm flex items-center gap-2"><span>${r.icon}</span>${r.name}</div><div class="text-sm ${r.amount===0?'text-dimmer':'text-pos'}">${r.amount===0?'—':'+ '+fmt(r.amount)}</div></div>`).join('')}
      <div class="text-xs text-dimmer font-semibold tracking-wider mt-4 mb-2">SCHEDULED EXPENSES</div>
      ${forecastItems.expense.length===0&&ccForecastExp===0&&allLoanDue===0?`<div class="text-xs text-dimmer py-1.5">None in this window</div>`:forecastItems.expense.map(r=>`<div class="flex justify-between items-center py-1.5"><div class="text-sm flex items-center gap-2"><span>${r.icon}</span>${r.name}</div><div class="text-sm text-neg">− ${fmt(r.amount)}</div></div>`).join('')}
      ${ccDueForecast.map(c=>{ const dates=ccCycleDates(c.id); const inWindow=dates&&dates.due<=forecastEnd; return `<div class="flex justify-between items-center py-1.5"><div class="text-sm flex items-center gap-2"><span>💳</span>${c.name}<span class="text-xs ml-1" style="color:${inWindow?'var(--amber)':'var(--text-3)'}">due ${dates?fmtDateShort(dates.due):'—'}${inWindow?'':' · outside window'}</span></div><div class="text-sm" style="color:${inWindow?'var(--red)':'var(--text-3)'}">− ${fmt(ccDueAmount(c))}</div></div>`; }).join('')}
      ${loanDueForecast.map(x=>{ const inWindow=x.due<=forecastEnd; return `<div class="flex justify-between items-center py-1.5"><div class="text-sm flex items-center gap-2"><span>${x.l.icon||'🏦'}</span>${x.l.name}<span class="text-xs ml-1" style="color:${inWindow?'var(--amber)':'var(--text-3)'}">due ${fmtDateShort(x.due)}${inWindow?'':' · outside window'}</span></div><div class="text-sm" style="color:${inWindow?'var(--red)':'var(--text-3)'}">− ${fmt(x.amount)}</div></div>`; }).join('')}
      ${projectedVariable>0?`<div class="text-xs text-dimmer font-semibold tracking-wider mt-4 mb-2">EVERYDAY SPENDING (projected)</div>
      <div class="flex justify-between items-center py-1.5"><div class="text-sm flex items-center gap-2"><span>🔥</span>Est. daily spend<span class="text-xs ml-1" style="color:var(--text-3)">${fmt(variableDaily)}/day × ${state.forecastDays||7}d</span></div><div class="text-sm text-neg">− ${fmt(projectedVariable)}</div></div>`:''}
      ${plannedSavings>0||cashFloor>0?`<div class="text-xs text-dimmer font-semibold tracking-wider mt-4 mb-2">SET ASIDE</div>`:''}
      ${plannedSavings>0?`<div class="flex justify-between items-center py-1.5"><div class="text-sm flex items-center gap-2"><span>🎯</span>Planned savings<span class="text-xs ml-1" style="color:var(--text-3)">for goals</span></div><div class="text-sm text-neg">− ${fmt(plannedSavings)}</div></div>`:''}
      ${cashFloor>0?`<div class="flex justify-between items-center py-1.5"><div class="text-sm flex items-center gap-2"><span>🛡️</span>Cash buffer</div><div class="text-sm text-neg">− ${fmt(cashFloor)}</div></div>`:''}
      <div class="flex items-center justify-between py-1.5 mt-1">
        <div class="text-xs" style="color:var(--text-3)">🛡️ Keep a buffer of</div>
        <div class="flex items-center gap-1"><span class="text-xs" style="color:var(--text-3)">₱</span><input id="cash-floor-input" type="number" step="100" value="${cashFloor}" onchange="setCashFloor(this.value)" class="field-input" style="width:110px;padding:4px 8px;font-size:13px;text-align:right"></div>
      </div>
      <div class="flex justify-between items-center pt-4 mt-3 border-t border-line"><span class="text-sm" style="color:var(--text-2)">Available to spend <span class="text-xs text-dimmer">(this window)</span></span><span class="font-semibold ${available>=0?'text-pos':'text-neg'}">${fmt2(available)}</span></div>
      <div class="flex justify-between items-center pt-2.5"><span class="font-semibold">After all dues <span class="text-xs text-dimmer font-normal">(safe to spend)</span></span><span class="text-lg font-bold ${afterAllCC>=0?'text-pos':'text-neg'}">${fmt2(afterAllCC)}</span></div>
    </div>
    <div class="bg-surface rounded-2xl p-5 mb-4">
      <div class="flex items-center gap-2 mb-4"><span>🎯</span><span class="font-semibold">Financial Goals</span></div>
      <div class="space-y-3">
      ${state.goals.length===0?`<div class="text-xs text-dimmer py-1.5">No goals yet.</div>`:state.goals.map(g=>{
        const gs=computeGoalSaved(g);
        const remaining=Math.max(g.target-gs.total,0), months=monthsBetween(g.targetDate), monthly=months>0?remaining/months:remaining, daily=monthly/30;
        const pct=g.target>0?Math.min((gs.total/g.target)*100,100):0;
        const dateLabel=new Date(g.targetDate+'T00:00:00').toLocaleDateString('en-US',{month:'short',year:'numeric'});
        return `<div class="rounded-xl p-4 cursor-pointer" style="background:var(--bg)" onclick="setView('goals')">
          <div class="flex justify-between items-start mb-3">
            <div><div class="font-semibold">${g.icon} ${g.name}</div><div class="text-xs text-dim mt-0.5">Target: ${dateLabel} · ${months} months away</div></div>
            <div class="text-xs px-2 py-1 rounded-full" style="background:var(--accent-dim);color:var(--accent-text)">${pct.toFixed(1)}%</div>
          </div>
          <div class="flex justify-between text-sm mb-1.5"><span class="text-dim">Saved so far</span><span class="font-semibold text-pos">${fmt(gs.total)} <span class="text-dim">of ${fmt(g.target)}</span></span></div>
          <div class="bg-surface2 rounded-full overflow-hidden mb-4" style="height:6px"><div style="width:${pct.toFixed(1)}%;height:6px;background:linear-gradient(90deg,var(--amber),var(--amber-2));border-radius:3px"></div></div>
          <div class="grid grid-cols-3 gap-2">
            <div class="rounded-lg p-3" style="background:var(--surface2)"><div class="text-xs text-dim">Remaining</div><div class="font-semibold mt-0.5 text-sm">${fmt(remaining)}</div></div>
            <div class="rounded-lg p-3" style="background:var(--surface2)"><div class="text-xs text-dim">Monthly needed</div><div class="font-semibold mt-0.5 text-sm">${fmt(monthly)}</div></div>
            <div class="rounded-lg p-3" style="background:var(--surface2)"><div class="text-xs text-dim">Daily needed</div><div class="font-semibold mt-0.5 text-sm">${fmt(daily)}</div></div>
          </div>
        </div>`;}).join('')}
      </div>
      ${(state.loans||[]).length?`
      <div class="text-xs text-dimmer font-semibold tracking-wider mt-4 mb-2">LOANS</div>
      ${state.loans.map(l=>{ const lt=loanTotals(l); return `
        <div class="flex justify-between items-center py-1.5 cursor-pointer" onclick="goalUI.tab='loans';setView('goals')">
          <div class="text-sm flex items-center gap-2"><span>${l.icon||'🏦'}</span>${l.name}<span class="text-xs text-dimmer">${lt.paymentsLeft} payment${lt.paymentsLeft!==1?'s':''} left</span></div>
          <div class="text-sm text-neg">− ${fmt(lt.remaining)}</div>
        </div>`;}).join('')}`:''}
      <button onclick="goalAddFromHome()" class="w-full text-sm text-dimmer mt-3 py-3 px-4 border border-dashed border-line rounded-xl hover:border-gray-600 hover:text-dim transition-colors" style="background:none;cursor:pointer">+ Add another goal</button>
    </div>
    <div class="text-center text-xs text-dimmer mt-8 pb-4">Click any number to edit · Changes saved automatically · <span class="cursor-pointer hover:text-accent" onclick="setView('transactions')">View all transactions →</span></div>`;
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
        <div class="w-full sm:w-96 rounded-t-3xl sm:rounded-2xl p-6" style="background:var(--surface);border:1px solid var(--border);max-height:92vh;overflow-y:auto" onclick="event.stopPropagation()">
          <div class="flex items-center justify-between mb-5">
            <div class="text-lg font-bold">${title}</div>
            <button onclick="${onClose}" style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:22px;line-height:1">×</button>
          </div>
          <div class="grid gap-3 mb-3" style="grid-template-columns:56px 1fr">
            <div><div class="field-label">ICON</div><input type="hidden" id="${pfx}rec-icon" value="${r?r.icon||'🔁':'🔁'}">
              <button type="button" onclick="iconPickerOpen('${pfx}rec-icon','rec')" id="${pfx}rec-icon-btn" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'" style="width:100%;height:44px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;font-size:24px;cursor:pointer;line-height:1;transition:border-color 0.15s">${r?r.icon||'🔁':'🔁'}</button></div>
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
          ${errId?`<div id="${errId}" class="text-neg text-xs mb-3"></div>`:''}
          <div class="flex gap-3">
            <button onclick="${onSave}" class="flex-1 rounded-xl py-3 font-semibold text-white text-sm" style="background:var(--accent);border:none;cursor:pointer">${isEdit?'Save Changes':'Add Recurring'}</button>
            <button onclick="${onClose}" class="flex-1 rounded-xl py-3 text-sm" style="background:var(--surface2);border:1px solid var(--border);color:var(--text-2);cursor:pointer">Cancel</button>
          </div>
        </div>
      </div>`;
  }

  function recCard(r) {
    const cat=r.categoryId?state.categories.find(c=>c.id===r.categoryId):null;
    const sub=cat&&r.subcategoryId?cat.subs.find(s=>s.id===r.subcategoryId):null;
    const acct=r.accountId?findAccount(r.accountId):null;
    const isOverdue=r.nextDue<todayISO, isDueToday=r.nextDue===todayISO;
    const typeColor=r.type==='income'?'var(--green)':'var(--red)';
    const typeBg=r.type==='income'?'var(--green-dim)':'var(--red-dim)';

    if (recUI.deleteRecId===r.id) return `
      <div class="rounded-2xl p-4 mb-3" style="background:var(--surface);border:1px solid var(--danger-border)">
        <div class="text-sm mb-3" style="color:var(--danger-text)">Delete <strong>${r.icon} ${r.name}</strong>? Cannot be undone.</div>
        <div class="flex gap-2">
          <button onclick="recConfirmDelete()" class="rounded-lg px-5 py-2 text-sm font-semibold" style="background:var(--red-strong);border:none;color:#fff;cursor:pointer">Delete</button>
          <button onclick="recCancelDelete()" class="rounded-lg px-5 py-2 text-sm" style="background:var(--btn-ghost);border:none;color:var(--text-2);cursor:pointer">Cancel</button>
        </div>
      </div>`;

    return `
      <div class="rounded-2xl p-4 mb-3" style="background:var(--surface);${!r.active?'opacity:0.6':''}">
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0 flex items-center justify-center rounded-xl text-xl" style="width:42px;height:42px;background:${typeBg}">${r.icon||'🔁'}</div>
            <div>
              <div class="font-semibold text-sm" style="color:var(--text)">${r.name}</div>
              <div class="flex items-center gap-2 mt-1 flex-wrap">
                <span class="text-xs px-2 py-0.5 rounded-full font-medium" style="background:${typeBg};color:${typeColor}">${r.type==='income'?'💰 Income':'💸 Expense'}</span>
                <span class="text-xs px-2 py-0.5 rounded-full" style="background:var(--surface2);color:var(--text-2)">${FREQ[r.frequency]||r.frequency}</span>
                ${!r.active?`<span class="text-xs px-2 py-0.5 rounded-full" style="background:var(--btn-ghost);color:var(--text-2)">⏸ Paused</span>`:''}
                ${isOverdue&&r.active?`<span class="text-xs px-2 py-0.5 rounded-full font-semibold" style="background:var(--red-dim);color:var(--red)">⚠️ Overdue</span>`:''}
                ${isDueToday?`<span class="text-xs px-2 py-0.5 rounded-full font-semibold" style="background:var(--amber-dim);color:var(--amber-2)">⚡ Due today</span>`:''}
              </div>
            </div>
          </div>
          <div class="text-right flex-shrink-0 ml-2">
            <div class="font-bold text-sm" style="color:${typeColor}">${r.type==='income'?'+':'-'}${fmt2(r.amount)}</div>
            <div class="flex gap-1 mt-1 justify-end">
              <button onclick="recToggleActive('${r.id}')" title="${r.active?'Pause':'Resume'}" style="background:var(--surface2);border:none;color:var(--text-2);cursor:pointer;border-radius:8px;padding:5px 7px;font-size:13px">${r.active?'⏸':'▶'}</button>
              <button onclick="recDuplicate('${r.id}')" title="Duplicate" style="background:var(--surface2);border:none;color:var(--text-2);cursor:pointer;border-radius:8px;padding:5px 7px;font-size:13px">⧉</button>
              <button onclick="recOpenEdit('${r.id}')" style="background:var(--surface2);border:none;color:var(--text-2);cursor:pointer;border-radius:8px;padding:5px 7px;font-size:13px">✏️</button>
              <button onclick="recAskDelete('${r.id}')" style="background:var(--surface2);border:none;color:var(--text-2);cursor:pointer;border-radius:8px;padding:5px 7px;font-size:13px">🗑️</button>
            </div>
          </div>
        </div>
        <div class="flex items-center gap-4 text-xs flex-wrap" style="color:var(--text-3)">
          <span style="color:${isOverdue?'var(--red)':isDueToday?'var(--amber-2)':'var(--text-3)'}">📅 ${isOverdue?'Overdue · ':isDueToday?'Today · ':'Next: '}${fmtDate(r.nextDue)}</span>
          ${cat?`<span>${cat.icon} ${cat.name}${sub?' › '+sub.name:''}</span>`:''}
          ${acct?`<span>${acct.icon||'💳'} ${acct.name}</span>`:''}
        </div>
      </div>`;
  }

  const editRec = recUI.editRecId ? recs.find(r=>r.id===recUI.editRecId) : null;

  return `${renderNav()}
    <div class="flex items-center justify-between mb-1">
      <div class="text-2xl font-bold">Recurring</div>
      <button onclick="recOpenAdd()" class="rounded-xl px-4 py-2.5 text-sm font-semibold text-white flex-shrink-0" style="background:var(--accent);border:none;cursor:pointer">+ Add</button>
    </div>
    <div class="section-label mb-4">${recs.length} item${recs.length!==1?'s':''} · ${active.length} active</div>

    ${recAutoPostedCount>0?`
    <div class="flex items-center gap-3 rounded-xl p-3 mb-4 text-sm" style="background:var(--green-dim);border:1px solid var(--green-dim)">
      <span>⚡</span>
      <span style="color:var(--green)"><strong>${recAutoPostedCount} transaction${recAutoPostedCount>1?'s':''}</strong> were auto-posted since your last visit</span>
    </div>`:''}

    <div class="grid grid-cols-2 gap-3 mb-5">
      <div class="rounded-2xl p-4" style="background:var(--surface)">
        <div class="text-xs mb-1" style="color:var(--text-3)">Monthly Expenses</div>
        <div class="text-xl font-bold text-neg">-${fmt2(monthlyExp)}</div>
        <div class="text-xs mt-0.5" style="color:var(--text-3)">${active.filter(r=>r.type==='expense').length} items</div>
      </div>
      <div class="rounded-2xl p-4" style="background:var(--surface)">
        <div class="text-xs mb-1" style="color:var(--text-3)">Monthly Income</div>
        <div class="text-xl font-bold text-pos">+${fmt2(monthlyInc)}</div>
        <div class="text-xs mt-0.5" style="color:var(--text-3)">${active.filter(r=>r.type==='income').length} items</div>
      </div>
    </div>

    ${recs.length===0?`
      <div class="flex flex-col items-center justify-center py-20 text-center">
        <div class="text-5xl mb-4">🔁</div>
        <div class="text-xl font-bold mb-2">No recurring items</div>
        <div class="text-sm max-w-xs mb-5" style="color:var(--text-3)">Add your regular bills, salaries, and income so they post automatically.</div>
        <button onclick="recOpenAdd()" class="rounded-xl px-6 py-3 text-sm font-semibold text-white" style="background:var(--accent);border:none;cursor:pointer">+ Add your first item</button>
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
    const barColor=pct>=66?'linear-gradient(90deg,var(--green-strong),var(--green))':pct>=33?'linear-gradient(90deg,var(--amber),var(--amber-2))':'linear-gradient(90deg,var(--accent),var(--accent-text))';
    const pctColor=pct>=66?'var(--green)':pct>=33?'var(--amber-2)':'var(--accent-text)';
    const dateLabel=new Date(g.targetDate).toLocaleDateString('en-US',{month:'short',year:'numeric'});
    const deposits=g.deposits||[];
    const isDepositOpen=goalUI.depositGoalId===g.id;
    const isHistoryOpen=goalUI.expandedGoalId===g.id;

    if (goalUI.deleteGoalId===g.id) return `
      <div class="rounded-2xl p-5 mb-4" style="background:var(--surface);border:1px solid var(--danger-border)">
        <div class="text-sm mb-3" style="color:var(--danger-text)">Delete <strong>${g.icon} ${g.name}</strong>? All deposit history will be lost (transfers already made stay in Transactions). Cannot be undone.</div>
        <div class="flex gap-2">
          <button onclick="goalConfirmDelete()" class="rounded-lg px-5 py-2 text-sm font-semibold" style="background:var(--red-strong);border:none;color:#fff;cursor:pointer">Delete Goal</button>
          <button onclick="goalCancelDelete()" class="rounded-lg px-5 py-2 text-sm" style="background:var(--btn-ghost);border:none;color:var(--text-2);cursor:pointer">Cancel</button>
        </div>
      </div>`;

    const depositForm=isDepositOpen?`
      <div class="mt-4 pt-4" style="border-top:1px solid var(--border)">
        <div class="section-label mb-3">ADD DEPOSIT</div>
        <div class="grid grid-cols-2 gap-2 mb-2">
          <div><div class="field-label">AMOUNT (₱) *</div><input id="dep-amt-${g.id}" type="number" step="0.01" min="0" placeholder="0.00" class="field-input"></div>
          <div><div class="field-label">DATE</div><input id="dep-date-${g.id}" type="date" value="${todayISO}" class="field-input"></div>
        </div>
        <div class="mb-2"><div class="field-label">FROM ACCOUNT (optional)</div>
          <select id="dep-acct-${g.id}" class="field-select">
            <option value="">— No account (manual entry) —</option>
            ${state.accounts.map(a=>`<option value="${a.id}">${a.icon||''} ${a.name} · ${fmt(a.balance)}</option>`).join('')}
          </select>
          <div class="text-xs mt-1" style="color:var(--text-3)">Picking an account deducts the amount and logs it as a transfer.</div>
        </div>
        <div class="mb-3"><div class="field-label">NOTE (optional)</div><input id="dep-note-${g.id}" type="text" placeholder="e.g. Monthly savings" class="field-input"></div>
        <div class="flex gap-2">
          <button onclick="goalAddDeposit('${g.id}')" class="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style="background:var(--accent);border:none;cursor:pointer">Save Deposit</button>
          <button onclick="goalCloseDeposit()" class="flex-1 rounded-xl py-2.5 text-sm" style="background:var(--btn-ghost);border:none;color:var(--text-2);cursor:pointer">Cancel</button>
        </div>
      </div>`:'';

    const historyRows=deposits.slice().reverse().map(d=>{
      const isDel=goalUI.deleteDepositKey&&goalUI.deleteDepositKey.goalId===g.id&&goalUI.deleteDepositKey.depositId===d.id;
      if(isDel) return `
        <div class="flex items-center gap-3 py-2" style="border-bottom:1px solid var(--border2)">
          <div class="flex-1 text-xs" style="color:var(--danger-text)">Remove ${fmt(d.amount)} deposit?</div>
          <button onclick="goalConfirmDeleteDeposit()" class="text-xs px-3 py-1 rounded-lg" style="background:var(--red-strong);border:none;color:#fff;cursor:pointer">Remove</button>
          <button onclick="goalCancelDeleteDeposit()" class="text-xs px-3 py-1 rounded-lg" style="background:var(--btn-ghost);border:none;color:var(--text-2);cursor:pointer">Keep</button>
        </div>`;
      return `
        <div class="flex items-center gap-3 py-2" style="border-bottom:1px solid var(--border2)">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-pos">+${fmt(d.amount)}</div>
            <div class="text-xs truncate" style="color:var(--text-3)">${fmtDate(d.date)}${d.accountId?' · '+(findAccount(d.accountId)?.name||'account'):''}${d.note?' · '+d.note:''}</div>
          </div>
          <button onclick="goalAskDeleteDeposit('${g.id}','${d.id}')" style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:18px;padding:0 4px;line-height:1;flex-shrink:0">×</button>
        </div>`;
    }).join('');

    const historySection=isHistoryOpen?`
      <div class="mt-4 pt-4" style="border-top:1px solid var(--border)">
        <div class="section-label mb-2">DEPOSIT HISTORY</div>
        ${deposits.length===0
          ?`<div class="text-sm text-center py-3" style="color:var(--text-3)">No manual deposits yet.</div>`
          :historyRows}
      </div>`:'';

    return `
      <div class="rounded-2xl p-5 mb-4" style="background:var(--surface)">
        <div class="flex items-start justify-between mb-4">
          <div>
            <div class="flex items-center gap-2 text-lg font-bold">${g.icon} ${g.name}</div>
            <div class="text-xs mt-0.5" style="color:var(--text-3)">Target ${dateLabel} · ${months} month${months!==1?'s':''} away</div>
          </div>
          <div class="flex gap-1 flex-shrink-0">
            <button onclick="goalOpenEdit('${g.id}')" style="background:var(--surface2);border:none;color:var(--text-2);cursor:pointer;border-radius:8px;padding:6px 8px;font-size:13px">✏️</button>
            <button onclick="goalAskDelete('${g.id}')" style="background:var(--surface2);border:none;color:var(--text-2);cursor:pointer;border-radius:8px;padding:6px 8px;font-size:13px">🗑️</button>
          </div>
        </div>

        <div class="flex items-center gap-3 mb-4">
          <div class="flex-1 rounded-full overflow-hidden" style="height:9px;background:var(--surface2)">
            <div style="width:${pct.toFixed(1)}%;height:9px;background:${barColor};border-radius:5px;transition:width 0.5s ease"></div>
          </div>
          <span class="text-sm font-bold flex-shrink-0" style="min-width:48px;text-align:right;color:${pctColor}">${pct.toFixed(1)}%</span>
        </div>

        <div class="grid grid-cols-3 gap-2 mb-3">
          <div class="rounded-xl p-3 text-center" style="background:var(--surface2)">
            <div class="text-xs mb-1" style="color:var(--text-3)">Saved</div>
            <div class="font-bold text-sm text-pos">${fmt(gs.total)}</div>
          </div>
          <div class="rounded-xl p-3 text-center" style="background:var(--surface2)">
            <div class="text-xs mb-1" style="color:var(--text-3)">Target</div>
            <div class="font-bold text-sm">${fmt(g.target)}</div>
          </div>
          <div class="rounded-xl p-3 text-center" style="background:var(--surface2)">
            <div class="text-xs mb-1" style="color:var(--text-3)">Remaining</div>
            <div class="font-bold text-sm text-accent">${fmt(remaining)}</div>
          </div>
        </div>

        <div class="rounded-xl p-3 mb-3" style="background:var(--surface2)">
          <div class="flex justify-between text-sm mb-1.5">
            <span style="color:var(--text-3)">Monthly needed</span><span class="font-semibold">${fmt(monthly)}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span style="color:var(--text-3)">Daily needed</span><span class="font-semibold">${fmt(daily)}</span>
          </div>
        </div>

        <div class="flex gap-2">
          <button onclick="goalOpenDeposit('${g.id}')" class="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style="background:var(--accent);border:none;cursor:pointer">+ Deposit</button>
          <button onclick="goalToggleHistory('${g.id}')" class="flex-1 rounded-xl py-2.5 text-sm font-semibold" style="background:var(--surface2);border:1px solid ${isHistoryOpen?'var(--accent)':'var(--border)'};color:${isHistoryOpen?'var(--accent-text)':'var(--text-2)'};cursor:pointer">📋 History (${deposits.length})</button>
        </div>
        ${depositForm}${historySection}
      </div>`;
  }

  const editGoal=goalUI.editGoalId?state.goals.find(g=>g.id===goalUI.editGoalId):null;
  const addModal=goalUI.showAddGoal?`
    <div class="fixed inset-0 flex items-end sm:items-center justify-center" style="z-index:200;background:rgba(0,0,0,0.8)" onclick="goalCloseAdd()">
      <div class="w-full sm:w-96 rounded-t-3xl sm:rounded-2xl p-6" style="background:var(--surface);border:1px solid var(--border);max-height:92vh;overflow-y:auto" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between mb-5">
          <div class="text-lg font-bold">New Goal</div>
          <button onclick="goalCloseAdd()" style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:22px;line-height:1">×</button>
        </div>
        <div class="mb-3"><div class="field-label">QUICK PICK</div>
          <div class="flex flex-wrap gap-1.5">
            ${GOAL_PRESETS.map(p=>`<button type="button" onclick="goalApplyPreset('${p.name}','${p.icon}')" class="text-xs px-2.5 py-1.5 rounded-full" style="background:var(--surface2);border:1px solid var(--border);color:var(--text-2);cursor:pointer">${p.icon} ${p.name}</button>`).join('')}
          </div>
        </div>
        <div class="grid gap-3 mb-3" style="grid-template-columns:56px 1fr">
          <div><div class="field-label">ICON</div><input type="hidden" id="goal-icon" value="🎯">
          <button type="button" onclick="iconPickerOpen('goal-icon','goal')" id="goal-icon-btn" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'" style="width:100%;height:44px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;font-size:24px;cursor:pointer;line-height:1;transition:border-color 0.15s">🎯</button></div>
          <div><div class="field-label">GOAL NAME *</div><input id="goal-name" type="text" placeholder="e.g. Emergency Fund" class="field-input"></div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-5">
          <div><div class="field-label">TARGET (₱) *</div><input id="goal-target" type="number" step="0.01" min="0" placeholder="0.00" class="field-input"></div>
          <div><div class="field-label">TARGET DATE *</div><input id="goal-date" type="date" class="field-input"></div>
        </div>
        <div class="mb-5"><div class="field-label">MONTHLY SAVINGS PLAN (₱)</div><input id="goal-plan" type="number" step="0.01" min="0" placeholder="0.00" class="field-input"><div class="text-xs mt-1" style="color:var(--text-3)">Optional — reserved from your forecast's "safe to spend".</div></div>
        <div id="goal-err" class="text-neg text-xs mb-3"></div>
        <div class="flex gap-3">
          <button onclick="goalSave()" class="flex-1 rounded-xl py-3 font-semibold text-white text-sm" style="background:var(--accent);border:none;cursor:pointer">Create Goal</button>
          <button onclick="goalCloseAdd()" class="flex-1 rounded-xl py-3 text-sm" style="background:var(--surface2);border:1px solid var(--border);color:var(--text-2);cursor:pointer">Cancel</button>
        </div>
      </div>
    </div>`:'';

  const editModal=editGoal?`
    <div class="fixed inset-0 flex items-end sm:items-center justify-center" style="z-index:200;background:rgba(0,0,0,0.8)" onclick="goalCancelEdit()">
      <div class="w-full sm:w-96 rounded-t-3xl sm:rounded-2xl p-6" style="background:var(--surface);border:1px solid var(--border);max-height:92vh;overflow-y:auto" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between mb-5">
          <div class="text-lg font-bold">Edit Goal</div>
          <button onclick="goalCancelEdit()" style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:22px;line-height:1">×</button>
        </div>
        <div class="grid gap-3 mb-3" style="grid-template-columns:56px 1fr">
          <div><div class="field-label">ICON</div><input type="hidden" id="edit-goal-icon" value="${editGoal.icon||'🎯'}">
          <button type="button" onclick="iconPickerOpen('edit-goal-icon','goal')" id="edit-goal-icon-btn" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'" style="width:100%;height:44px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;font-size:24px;cursor:pointer;line-height:1;transition:border-color 0.15s">${editGoal.icon||'🎯'}</button></div>
          <div><div class="field-label">GOAL NAME *</div><input id="edit-goal-name" type="text" value="${editGoal.name}" class="field-input"></div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-5">
          <div><div class="field-label">TARGET (₱) *</div><input id="edit-goal-target" type="number" step="0.01" value="${editGoal.target}" class="field-input"></div>
          <div><div class="field-label">TARGET DATE *</div><input id="edit-goal-date" type="date" value="${editGoal.targetDate}" class="field-input"></div>
        </div>
        <div class="mb-5"><div class="field-label">MONTHLY SAVINGS PLAN (₱)</div><input id="edit-goal-plan" type="number" step="0.01" min="0" value="${editGoal.monthlyPlan||0}" class="field-input"><div class="text-xs mt-1" style="color:var(--text-3)">Optional — reserved from your forecast's "safe to spend".</div></div>
        <div class="flex gap-3">
          <button onclick="goalUpdate('${editGoal.id}')" class="flex-1 rounded-xl py-3 font-semibold text-white text-sm" style="background:var(--accent);border:none;cursor:pointer">Save Changes</button>
          <button onclick="goalCancelEdit()" class="flex-1 rounded-xl py-3 text-sm" style="background:var(--surface2);border:1px solid var(--border);color:var(--text-2);cursor:pointer">Cancel</button>
        </div>
      </div>
    </div>`:'';

  // ── Loans tab ──
  function loanCard(l) {
    const lt=loanTotals(l);
    const isPayOpen=goalUI.paymentLoanId===l.id;
    const isHistOpen=goalUI.expandedLoanId===l.id;
    const payments=l.payments||[];

    if (goalUI.deleteLoanId===l.id) return `
      <div class="rounded-2xl p-5 mb-4" style="background:var(--surface);border:1px solid var(--danger-border)">
        <div class="text-sm mb-3" style="color:var(--danger-text)">Delete <strong>${l.icon} ${l.name}</strong>? All payment history will be lost (transfers already made stay in Transactions). Cannot be undone.</div>
        <div class="flex gap-2">
          <button onclick="loanConfirmDelete()" class="rounded-lg px-5 py-2 text-sm font-semibold" style="background:var(--red-strong);border:none;color:#fff;cursor:pointer">Delete Loan</button>
          <button onclick="loanCancelDelete()" class="rounded-lg px-5 py-2 text-sm" style="background:var(--btn-ghost);border:none;color:var(--text-2);cursor:pointer">Cancel</button>
        </div>
      </div>`;

    const payForm=isPayOpen?`
      <div class="mt-4 pt-4" style="border-top:1px solid var(--border)">
        <div class="section-label mb-3">RECORD PAYMENT</div>
        <div class="grid grid-cols-2 gap-2 mb-2">
          <div><div class="field-label">AMOUNT (₱) *</div><input id="pay-amt-${l.id}" type="number" step="0.01" min="0" value="${lt.monthlyPayment>0?lt.monthlyPayment.toFixed(2):''}" class="field-input"></div>
          <div><div class="field-label">DATE</div><input id="pay-date-${l.id}" type="date" value="${todayISO}" class="field-input"></div>
        </div>
        <div class="mb-2"><div class="field-label">FROM ACCOUNT (optional)</div>
          <select id="pay-acct-${l.id}" class="field-select">
            <option value="">— No account (manual entry) —</option>
            ${state.accounts.map(a=>`<option value="${a.id}">${a.icon||''} ${a.name} · ${fmt(a.balance)}</option>`).join('')}
          </select>
          <div class="text-xs mt-1" style="color:var(--text-3)">Picking an account deducts the amount and logs it as a transfer.</div>
        </div>
        <div class="mb-3"><div class="field-label">NOTE (optional)</div><input id="pay-note-${l.id}" type="text" placeholder="e.g. July amortization" class="field-input"></div>
        <div class="flex gap-2">
          <button onclick="loanAddPayment('${l.id}')" class="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style="background:var(--accent);border:none;cursor:pointer">Save Payment</button>
          <button onclick="loanClosePayment()" class="flex-1 rounded-xl py-2.5 text-sm" style="background:var(--btn-ghost);border:none;color:var(--text-2);cursor:pointer">Cancel</button>
        </div>
      </div>`:'';

    const histRows=payments.slice().reverse().map(p=>{
      const isDel=goalUI.deleteLoanPaymentKey&&goalUI.deleteLoanPaymentKey.loanId===l.id&&goalUI.deleteLoanPaymentKey.paymentId===p.id;
      if(isDel) return `
        <div class="flex items-center gap-3 py-2" style="border-bottom:1px solid var(--border2)">
          <div class="flex-1 text-xs" style="color:var(--danger-text)">Remove ${fmt(p.amount)} payment?</div>
          <button onclick="loanConfirmDeletePayment()" class="text-xs px-3 py-1 rounded-lg" style="background:var(--red-strong);border:none;color:#fff;cursor:pointer">Remove</button>
          <button onclick="loanCancelDeletePayment()" class="text-xs px-3 py-1 rounded-lg" style="background:var(--btn-ghost);border:none;color:var(--text-2);cursor:pointer">Keep</button>
        </div>`;
      return `
        <div class="flex items-center gap-3 py-2" style="border-bottom:1px solid var(--border2)">
          <div class="flex-1 min-w-0">
            <div class="text-sm font-semibold text-pos">−${fmt(p.amount)}</div>
            <div class="text-xs truncate" style="color:var(--text-3)">${fmtDate(p.date)}${p.accountId?' · '+(findAccount(p.accountId)?.name||'account'):''}${p.note?' · '+p.note:''}</div>
          </div>
          <button onclick="loanAskDeletePayment('${l.id}','${p.id}')" style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:18px;padding:0 4px;line-height:1;flex-shrink:0">×</button>
        </div>`;
    }).join('');

    const histSection=isHistOpen?`
      <div class="mt-4 pt-4" style="border-top:1px solid var(--border)">
        <div class="section-label mb-2">PAYMENT HISTORY</div>
        ${payments.length===0?`<div class="text-sm text-center py-3" style="color:var(--text-3)">No payments recorded yet.</div>`:histRows}
      </div>`:'';

    const barColor='linear-gradient(90deg,var(--green-strong),var(--green))';
    return `
      <div class="rounded-2xl p-5 mb-4" style="background:var(--surface)">
        <div class="flex items-start justify-between mb-4">
          <div>
            <div class="flex items-center gap-2 text-lg font-bold">${l.icon} ${l.name}</div>
            <div class="text-xs mt-0.5" style="color:var(--text-3)">${fmt(l.principal)} principal · ${l.termMonths} months${l.monthlyRate?` · ${l.monthlyRate}%/mo add-on`:''}${l.annualEIR?` · ${l.annualEIR}% EIR p.a.`:''}${l.cardId?` · 💳 ${state.creditCards.find(c=>c.id===l.cardId)?.name||'card'}`:''}</div>
          </div>
          <div class="flex gap-1 flex-shrink-0">
            <button onclick="loanOpenEdit('${l.id}')" style="background:var(--surface2);border:none;color:var(--text-2);cursor:pointer;border-radius:8px;padding:6px 8px;font-size:13px">✏️</button>
            <button onclick="loanAskDelete('${l.id}')" style="background:var(--surface2);border:none;color:var(--text-2);cursor:pointer;border-radius:8px;padding:6px 8px;font-size:13px">🗑️</button>
          </div>
        </div>

        <div class="flex items-center gap-3 mb-4">
          <div class="flex-1 rounded-full overflow-hidden" style="height:9px;background:var(--surface2)">
            <div style="width:${lt.pctPaid.toFixed(1)}%;height:9px;background:${barColor};border-radius:5px;transition:width 0.5s ease"></div>
          </div>
          <span class="text-sm font-bold flex-shrink-0" style="min-width:48px;text-align:right;color:var(--green)">${lt.pctPaid.toFixed(1)}%</span>
        </div>

        <div class="grid grid-cols-3 gap-2 mb-3">
          <div class="rounded-xl p-3 text-center" style="background:var(--surface2)">
            <div class="text-xs mb-1" style="color:var(--text-3)">Paid</div>
            <div class="font-bold text-sm text-pos">${fmt(lt.paid)}</div>
          </div>
          <div class="rounded-xl p-3 text-center" style="background:var(--surface2)">
            <div class="text-xs mb-1" style="color:var(--text-3)">Total payable</div>
            <div class="font-bold text-sm">${fmt(lt.totalPayable)}</div>
          </div>
          <div class="rounded-xl p-3 text-center" style="background:var(--surface2)">
            <div class="text-xs mb-1" style="color:var(--text-3)">Remaining</div>
            <div class="font-bold text-sm text-neg">${fmt(lt.remaining)}</div>
          </div>
        </div>

        <div class="rounded-xl p-3 mb-3" style="background:var(--surface2)">
          <div class="flex justify-between text-sm mb-1.5">
            <span style="color:var(--text-3)">Monthly payment</span><span class="font-semibold">${fmt2(lt.monthlyPayment)}</span>
          </div>
          <div class="flex justify-between text-sm mb-1.5">
            <span style="color:var(--text-3)">Total interest cost</span><span class="font-semibold text-neg">${fmt(lt.totalInterest)} (${lt.interestPct.toFixed(1)}%)</span>
          </div>
          <div class="flex justify-between text-sm">
            <span style="color:var(--text-3)">Payments left</span><span class="font-semibold">${lt.paymentsLeft} of ${l.termMonths}</span>
          </div>
        </div>

        <div class="flex gap-2">
          <button onclick="loanOpenPayment('${l.id}')" class="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white" style="background:var(--accent);border:none;cursor:pointer">+ Record Payment</button>
          <button onclick="loanToggleHistory('${l.id}')" class="flex-1 rounded-xl py-2.5 text-sm font-semibold" style="background:var(--surface2);border:1px solid ${isHistOpen?'var(--accent)':'var(--border)'};color:${isHistOpen?'var(--accent-text)':'var(--text-2)'};cursor:pointer">📋 History (${payments.length})</button>
        </div>
        ${payForm}${histSection}
      </div>`;
  }

  function loanModal(l) {
    const isEdit=!!l, pfx=isEdit?'edit-':'', title=isEdit?'Edit Loan':'New Loan';
    const onClose=isEdit?'loanCancelEdit()':'loanCloseAdd()';
    const onSave=isEdit?`loanUpdate('${l.id}')`:'loanSave()';
    const lt=l?loanTotals(l):null;
    return `
    <div class="fixed inset-0 flex items-end sm:items-center justify-center" style="z-index:200;background:rgba(0,0,0,0.8)" onclick="${onClose}">
      <div class="w-full sm:w-96 rounded-t-3xl sm:rounded-2xl p-6" style="background:var(--surface);border:1px solid var(--border);max-height:92vh;overflow-y:auto" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between mb-5">
          <div class="text-lg font-bold">${title}</div>
          <button onclick="${onClose}" style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:22px;line-height:1">×</button>
        </div>
        <div class="grid gap-3 mb-3" style="grid-template-columns:56px 1fr">
          <div><div class="field-label">ICON</div><input type="hidden" id="${pfx}loan-icon" value="${l?l.icon||'🏦':'🏦'}">
          <button type="button" onclick="iconPickerOpen('${pfx}loan-icon','loan')" id="${pfx}loan-icon-btn" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'" style="width:100%;height:44px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;font-size:24px;cursor:pointer;line-height:1;transition:border-color 0.15s">${l?l.icon||'🏦':'🏦'}</button></div>
          <div><div class="field-label">LOAN NAME *</div><input id="${pfx}loan-name" type="text" ${l?`value="${l.name}"`:'placeholder="e.g. Car Loan"'} class="field-input"></div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div><div class="field-label">PRINCIPAL (₱) *</div><input id="${pfx}loan-principal" type="number" step="0.01" min="0" ${l?`value="${l.principal}"`:'placeholder="300000"'} class="field-input" oninput="loanRecalc('${pfx}')"></div>
          <div><div class="field-label">TERM (MONTHS) *</div><input id="${pfx}loan-term" type="number" step="1" min="1" ${l?`value="${l.termMonths}"`:'placeholder="36"'} class="field-input" oninput="loanRecalc('${pfx}')"></div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-1">
          <div><div class="field-label">MONTHLY RATE (%)</div><input id="${pfx}loan-rate" type="number" step="0.01" min="0" ${l?`value="${l.monthlyRate||''}"`:'placeholder="0.49"'} class="field-input" oninput="loanRecalc('${pfx}')"></div>
          <div><div class="field-label">EIR % P.A. (optional)</div><input id="${pfx}loan-eir" type="number" step="0.01" min="0" ${l?`value="${l.annualEIR||''}"`:'placeholder="11.32"'} class="field-input"></div>
        </div>
        <div class="text-xs mb-3" style="color:var(--text-3)">Monthly rate = the bank's add-on/factor rate charged on the original principal each month. EIR is the true annual cost — informational only.</div>
        <div class="grid grid-cols-2 gap-3 mb-2">
          <div><div class="field-label">START DATE</div><input id="${pfx}loan-start" type="date" value="${l?.startDate||todayISO}" class="field-input"></div>
          <div><div class="field-label">MONTHLY PAYMENT (₱)</div><input id="${pfx}loan-payment" type="number" step="0.01" min="0" ${l?`value="${lt.monthlyPayment.toFixed(2)}"`:'placeholder="auto"'} class="field-input" oninput="this.dataset.touched=1"></div>
        </div>
        <div id="${pfx}loan-summary" class="text-xs font-semibold mb-3" style="color:var(--accent-text)">${l?`Total payable ${fmt(lt.totalPayable)} · Total interest ${fmt(lt.totalInterest)} (${lt.interestPct.toFixed(1)}% of principal)`:''}</div>
        ${state.creditCards.length?`<div class="mb-3">
          <div class="field-label">CREDIT-TO-CASH FROM CARD (optional)</div>
          <select id="${pfx}loan-card" class="field-input"><option value="">— Not a card loan —</option>${state.creditCards.map(c=>`<option value="${c.id}" ${l&&l.cardId===c.id?'selected':''}>${c.name}</option>`).join('')}</select>
          <div class="text-xs mt-1" style="color:var(--text-3)">If this loan draws cash from a card's credit limit, that card's available credit drops by the remaining balance.</div>
        </div>`:''}
        ${isEdit?'':`<div class="mb-3">
          <div class="field-label">DEPOSIT PROCEEDS TO (optional)</div>
          <select id="loan-deposit-acct" class="field-input"><option value="">— Don't record cash-in —</option>${(state.accounts||[]).map(a=>`<option value="${a.id}">${a.icon||''} ${a.name}</option>`).join('')}</select>
          <div class="text-xs mt-1" style="color:var(--text-3)">Credits this account with the principal and logs it as a loan disbursement — not counted as income.</div>
        </div>`}
        ${isEdit?'':'<div id="loan-err" class="text-neg text-xs mb-3"></div>'}
        <div class="flex gap-3">
          <button onclick="${onSave}" class="flex-1 rounded-xl py-3 font-semibold text-white text-sm" style="background:var(--accent);border:none;cursor:pointer">${isEdit?'Save Changes':'Add Loan'}</button>
          <button onclick="${onClose}" class="flex-1 rounded-xl py-3 text-sm" style="background:var(--surface2);border:1px solid var(--border);color:var(--text-2);cursor:pointer">Cancel</button>
        </div>
      </div>
    </div>`;
  }

  const loans=state.loans||[];
  const editLoan=goalUI.editLoanId?loans.find(l=>l.id===goalUI.editLoanId):null;
  const isLoans=goalUI.tab==='loans';
  const totalSaved=state.goals.reduce((s,g)=>s+computeGoalSaved(g).total,0);
  const totalTarget=state.goals.reduce((s,g)=>s+g.target,0);
  const totalOwed=loans.reduce((s,l)=>s+loanTotals(l).remaining,0);

  const subNav=`
    <div class="nav-scroll mb-5" style="margin-top:0">
      <nav class="subnav-pill">
        <span class="nav-item ${!isLoans?'active':''}" onclick="goalSetTab('goals')">🎯 Savings Goals</span>
        <span class="nav-item ${isLoans?'active':''}" onclick="goalSetTab('loans')">🏦 Loans</span>
      </nav>
    </div>`;

  return `${renderNav()}
    <div class="flex items-center justify-between mb-1">
      <div class="text-2xl font-bold">Goals</div>
      <button onclick="${isLoans?'loanOpenAdd()':'goalOpenAdd()'}" class="rounded-xl px-4 py-2.5 text-sm font-semibold text-white flex-shrink-0" style="background:var(--accent);border:none;cursor:pointer">${isLoans?'+ Add Loan':'+ Add Goal'}</button>
    </div>
    <div class="section-label mb-4">${isLoans
      ?`${loans.length} Loan${loans.length!==1?'s':''} · ${fmt(totalOwed)} still owed`
      :`${state.goals.length} Goal${state.goals.length!==1?'s':''} · ${fmt(totalSaved)} saved of ${fmt(totalTarget)}`}</div>
    ${subNav}
    ${isLoans
      ? (loans.length===0?`
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <div class="text-5xl mb-4">🏦</div>
          <div class="text-xl font-bold mb-2">No loans tracked</div>
          <div class="text-sm max-w-xs mb-5" style="color:var(--text-3)">Record a loan to track payments, remaining balance, and the real interest cost.</div>
          <button onclick="loanOpenAdd()" class="rounded-xl px-6 py-3 text-sm font-semibold text-white" style="background:var(--accent);border:none;cursor:pointer">+ Track your first loan</button>
        </div>`:loans.map(l=>loanCard(l)).join(''))
      : (state.goals.length===0?`
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <div class="text-5xl mb-4">🎯</div>
          <div class="text-xl font-bold mb-2">No goals yet</div>
          <div class="text-sm max-w-xs mb-5" style="color:var(--text-3)">Set a savings goal and track your progress.</div>
          <button onclick="goalOpenAdd()" class="rounded-xl px-6 py-3 text-sm font-semibold text-white" style="background:var(--accent);border:none;cursor:pointer">+ Create your first goal</button>
        </div>`:state.goals.map(g=>goalCard(g)).join(''))}
    ${addModal}${editModal}
    ${goalUI.showAddLoan?loanModal(null):''}${editLoan?loanModal(editLoan):''}`;
}


function renderAccounts() {
  const TC = {
    bank:    { label:'Bank',     icon:'🏦', color:'#3b82f6', bg:'rgba(59,130,246,0.13)'  },
    ewallet: { label:'E-Wallet', icon:'📱', color:'#8b5cf6', bg:'rgba(139,92,246,0.13)'  },
    cash:    { label:'Cash',     icon:'💵', color:'var(--green-strong)', bg:'var(--green-dim)'  },
  };
  const banks    = state.accounts.filter(a=>(a.type||'bank')==='bank');
  const ewallets = state.accounts.filter(a=>a.type==='ewallet');
  const cashList = state.accounts.filter(a=>a.type==='cash');
  const sumB=banks.reduce((s,a)=>s+a.balance,0), sumE=ewallets.reduce((s,a)=>s+a.balance,0), sumC=cashList.reduce((s,a)=>s+a.balance,0);
  // Hero uses the shared netWorth()/totalLiab() (incl. loans) so it matches Home.
  // totalOwed stays CC-only — it's reused for the Credit Cards section header below.
  const totalDebit=sumB+sumE+sumC, totalOwed=state.creditCards.reduce((s,c)=>s+c.outstanding,0), heroLiab=totalLiab(), nw=netWorth(), assetsVal=assetsValue();
  const totalMaintaining=state.accounts.reduce((s,a)=>s+(a.maintainingBalance||0),0);
  const totalSpendable=totalDebit-totalMaintaining;

  function acctCard(a) {
    const conf=TC[a.type||'bank'];
    if (acctUI.deleteAcctId===a.id) return `
      <div class="rounded-xl p-4 mb-2" style="background:var(--danger-surface);border:1px solid var(--danger-border)">
        <div class="text-sm mb-3" style="color:var(--danger-text)">Delete <strong>${a.name}</strong>? Cannot be undone.</div>
        <div class="flex gap-2">
          <button onclick="acctConfirmDelete()" class="text-xs px-4 py-2 rounded-lg font-semibold" style="background:var(--red-strong);border:none;color:#fff;cursor:pointer">Delete</button>
          <button onclick="acctCancelDelete()" class="text-xs px-4 py-2 rounded-lg" style="background:var(--btn-ghost);border:none;color:var(--text-2);cursor:pointer">Cancel</button>
        </div>
      </div>`;
    if (acctUI.editAcctId===a.id) return `
      <div class="rounded-xl p-4 mb-2" style="background:var(--surface2);border:1px solid var(--accent)">
        <div class="grid gap-3 mb-3" style="grid-template-columns:56px 1fr">
          <div><div class="field-label">ICON</div><input type="hidden" id="edit-acct-icon-${a.id}" value="${a.icon||conf.icon}">
          <button type="button" onclick="iconPickerOpen('edit-acct-icon-${a.id}','${a.type||'bank'}')" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'" id="edit-acct-icon-${a.id}-btn" style="width:100%;height:44px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;font-size:24px;cursor:pointer;line-height:1;transition:border-color 0.15s">${a.icon||conf.icon}</button></div>
          <div><div class="field-label">NAME</div><input id="edit-acct-name-${a.id}" value="${a.name}" class="field-input"></div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div><div class="field-label">BALANCE (₱)</div><input id="edit-acct-bal-${a.id}" type="number" step="0.01" value="${a.balance}" class="field-input"></div>
          <div><div class="field-label">MAINTAINING BAL. (₱)</div><input id="edit-acct-mbal-${a.id}" type="number" step="0.01" value="${a.maintainingBalance||0}" class="field-input" title="Amount that must stay in account"></div>
        </div>
        <div class="flex gap-2">
          <button onclick="acctUpdate('${a.id}')" class="flex-1 rounded-lg py-2 text-sm font-semibold text-white" style="background:var(--accent);border:none;cursor:pointer">Save</button>
          <button onclick="acctCancelEdit()" class="flex-1 rounded-lg py-2 text-sm" style="background:var(--btn-ghost);border:none;color:var(--text-2);cursor:pointer">Cancel</button>
        </div>
      </div>`;
    return `
      <div class="flex items-center gap-3 p-3 rounded-xl mb-2" style="background:var(--surface2)">
        <div class="flex-shrink-0 flex items-center justify-center rounded-xl text-xl overflow-hidden" style="width:42px;height:42px;background:${conf.bg}">${brandBadge(a.name, a.icon||conf.icon)}</div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold" style="color:var(--text)">${a.name}</div>
          <div class="text-xs" style="color:var(--text-3)">${conf.label}${a.maintainingBalance>0?` · <span style="color:var(--amber)">min ${fmt(a.maintainingBalance)}</span>`:''}</div>
        </div>
        <div class="font-semibold text-sm flex-shrink-0">${fmt2(a.balance)}</div>
        <div class="flex gap-1 flex-shrink-0">
          <button onclick="acctOpenEdit('${a.id}')" style="background:var(--surface);border:none;color:var(--text-2);cursor:pointer;border-radius:8px;padding:5px 8px;font-size:13px">✏️</button>
          <button onclick="acctAskDelete('${a.id}')" style="background:var(--surface);border:none;color:var(--text-2);cursor:pointer;border-radius:8px;padding:5px 8px;font-size:13px">🗑️</button>
        </div>
      </div>`;
  }

  function section(title, list, type, total) {
    const conf=TC[type];
    return `
      <div class="rounded-2xl p-4 mb-4" style="background:var(--surface)">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span>${conf.icon}</span><span class="font-semibold">${title}</span>
            <span class="text-xs px-2 py-0.5 rounded-full font-medium" style="background:${conf.bg};color:${conf.color}">${list.length}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm font-semibold" style="color:var(--text-2)">${fmt2(total)}</span>
            <button onclick="acctOpenAdd('${type}')" class="text-xs px-3 py-1.5 rounded-lg font-semibold text-white" style="background:var(--accent);border:none;cursor:pointer">+ Add</button>
          </div>
        </div>
        ${list.map(a=>acctCard(a)).join('')}
        ${list.length===0?`<div class="text-center py-4 text-sm" style="color:var(--text-3)">No ${title.toLowerCase()} added yet</div>`:''}
      </div>`;
  }

  const ASSET_ICON = { vehicle:'🚗', property:'🏠', other:'📦' };
  function assetCard(a) {
    if (assetUI.deleteAssetId===a.id) return `
      <div class="rounded-xl p-4 mb-2" style="background:var(--danger-surface);border:1px solid var(--danger-border)">
        <div class="text-sm mb-3" style="color:var(--danger-text)">Delete <strong>${a.name}</strong>? ${a.purchase?'The cash paid from your account will be returned.':'This cannot be undone.'}</div>
        <div class="flex gap-2">
          <button onclick="assetConfirmDelete()" class="text-xs px-4 py-2 rounded-lg font-semibold" style="background:var(--red-strong);border:none;color:#fff;cursor:pointer">Delete</button>
          <button onclick="assetCancelDelete()" class="text-xs px-4 py-2 rounded-lg" style="background:var(--btn-ghost);border:none;color:var(--text-2);cursor:pointer">Cancel</button>
        </div>
      </div>`;
    if (assetUI.editAssetId===a.id) return `
      <div class="rounded-xl p-4 mb-2" style="background:var(--surface2);border:1px solid var(--accent)">
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div><div class="field-label">NAME</div><input id="edit-asset-name-${a.id}" value="${a.name}" class="field-input"></div>
          <div><div class="field-label">TYPE</div><select id="edit-asset-type-${a.id}" class="field-input">${Object.keys(ASSET_ICON).map(t=>`<option value="${t}" ${a.type===t?'selected':''}>${ASSET_ICON[t]} ${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}</select></div>
        </div>
        <div class="mb-3"><div class="field-label">CURRENT VALUE (₱)</div><input id="edit-asset-value-${a.id}" type="number" step="0.01" value="${a.value}" class="field-input"></div>
        <div class="flex gap-2">
          <button onclick="assetUpdate('${a.id}')" class="flex-1 rounded-lg py-2 text-sm font-semibold text-white" style="background:var(--accent);border:none;cursor:pointer">Save</button>
          <button onclick="assetCancelEdit()" class="flex-1 rounded-lg py-2 text-sm" style="background:var(--btn-ghost);border:none;color:var(--text-2);cursor:pointer">Cancel</button>
        </div>
      </div>`;
    return `
      <div class="flex items-center gap-3 p-3 rounded-xl mb-2" style="background:var(--surface2)">
        <div class="flex-shrink-0 flex items-center justify-center rounded-xl text-xl" style="width:42px;height:42px;background:var(--bg)">${a.icon||ASSET_ICON[a.type]||'📦'}</div>
        <div class="flex-1 min-w-0">
          <div class="text-sm font-semibold" style="color:var(--text)">${a.name}</div>
          <div class="text-xs" style="color:var(--text-3)">${(a.type||'other').charAt(0).toUpperCase()+(a.type||'other').slice(1)}${a.purchase?' · bought':''}</div>
        </div>
        <div class="font-semibold text-sm flex-shrink-0">${fmt2(a.value)}</div>
        <div class="flex gap-1 flex-shrink-0">
          <button onclick="assetOpenEdit('${a.id}')" style="background:var(--surface);border:none;color:var(--text-2);cursor:pointer;border-radius:8px;padding:5px 8px;font-size:13px">✏️</button>
          <button onclick="assetAskDelete('${a.id}')" style="background:var(--surface);border:none;color:var(--text-2);cursor:pointer;border-radius:8px;padding:5px 8px;font-size:13px">🗑️</button>
        </div>
      </div>`;
  }

  function assetsSection() {
    const list = state.assets||[];
    const cashAccts = state.accounts;
    const addForm = assetUI.showAddAsset ? `
      <div class="rounded-xl p-4 mb-2" style="background:var(--surface2);border:1px solid var(--accent)">
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div><div class="field-label">NAME</div><input id="asset-name" placeholder="e.g. Honda Civic" class="field-input"></div>
          <div><div class="field-label">TYPE</div><select id="asset-type" class="field-input">${Object.keys(ASSET_ICON).map(t=>`<option value="${t}">${ASSET_ICON[t]} ${t.charAt(0).toUpperCase()+t.slice(1)}</option>`).join('')}</select></div>
        </div>
        <div class="mb-3"><div class="field-label">VALUE (₱)</div><input id="asset-value" type="number" step="0.01" placeholder="0.00" class="field-input"></div>
        <div class="mb-3"><div class="field-label">PAID FROM (optional)</div><select id="asset-pay-acct" class="field-input"><option value="">— Not from an account (already owned) —</option>${cashAccts.map(a=>`<option value="${a.id}">${a.name} (${fmt(a.balance)})</option>`).join('')}</select><div class="text-xs mt-1" style="color:var(--text-3)">If chosen, the value is moved out of that account as a purchase (not an expense).</div></div>
        <div id="asset-err" class="text-neg text-xs mb-2"></div>
        <div class="flex gap-2">
          <button onclick="assetSave()" class="flex-1 rounded-lg py-2 text-sm font-semibold text-white" style="background:var(--accent);border:none;cursor:pointer">Add Asset</button>
          <button onclick="assetCloseAdd()" class="flex-1 rounded-lg py-2 text-sm" style="background:var(--btn-ghost);border:none;color:var(--text-2);cursor:pointer">Cancel</button>
        </div>
      </div>` : '';
    return `
      <div class="rounded-2xl p-4 mb-4" style="background:var(--surface)">
        <div class="flex items-center justify-between mb-3">
          <div class="flex items-center gap-2">
            <span>🚗</span><span class="font-semibold">Assets</span>
            <span class="text-xs px-2 py-0.5 rounded-full font-medium" style="background:var(--amber-dim);color:var(--amber)">${list.length}</span>
          </div>
          <div class="flex items-center gap-3">
            <span class="text-sm font-semibold" style="color:var(--text-2)">${fmt2(assetsValue())}</span>
            <button onclick="assetOpenAdd()" class="text-xs px-3 py-1.5 rounded-lg font-semibold text-white" style="background:var(--accent);border:none;cursor:pointer">+ Add</button>
          </div>
        </div>
        ${addForm}
        ${list.map(a=>assetCard(a)).join('')}
        ${list.length===0&&!assetUI.showAddAsset?`<div class="text-center py-4 text-sm" style="color:var(--text-3)">No assets tracked yet (car, property, etc.)</div>`:''}
      </div>`;
  }

  function ccCard(c) {
    // Credit-to-cash loans linked to this card block part of the limit until repaid.
    const blockedCredit = (state.loans||[]).filter(l=>l.cardId===c.id).reduce((s,l)=>s+loanTotals(l).remainingPrincipal,0);
    const avail=c.limit-c.outstanding-blockedCredit, pct=c.limit>0?Math.min(((c.outstanding+blockedCredit)/c.limit)*100,100):0;
    const isPaid = c.outstanding<=0;
    const dates = ccCycleDates(c.id) || {};
    const newCharges = ccCycleSpend(c.id);
    const currentBalance = c.lastStatement + newCharges;
    const stmtPayments = ccStatementPayments(c.id);
    const stmtRemaining = c.lastStatement > 0 ? Math.max(0, c.lastStatement - stmtPayments) : 0;
    const stmtFullyPaid = c.lastStatement > 0 && stmtRemaining === 0;
    const barColor = pct>80?'var(--red-strong)':pct>50?'var(--amber)':'var(--green-strong)';

    // ── DELETE confirm ────────────────────────────────────
    if (acctUI.deleteCCId===c.id) return `
      <div class="rounded-xl p-4 mb-3" style="background:var(--danger-surface);border:1px solid var(--danger-border)">
        <div class="text-sm mb-3" style="color:var(--danger-text)">Delete <strong>${c.name}</strong>? Cannot be undone.</div>
        <div class="flex gap-2">
          <button onclick="ccConfirmDelete()" class="text-xs px-4 py-2 rounded-lg font-semibold" style="background:var(--red-strong);border:none;color:#fff;cursor:pointer">Delete</button>
          <button onclick="ccCancelDelete()" class="text-xs px-4 py-2 rounded-lg" style="background:var(--btn-ghost);border:none;color:var(--text-2);cursor:pointer">Cancel</button>
        </div>
      </div>`;

    // ── EDIT form ─────────────────────────────────────────
    if (acctUI.editCCId===c.id) return `
      <div class="rounded-xl p-4 mb-3" style="background:var(--surface2);border:1px solid var(--accent)">
        <div class="grid gap-3 mb-3" style="grid-template-columns:56px 1fr">
          <div><div class="field-label">ICON</div><input type="hidden" id="edit-cc-icon-${c.id}" value="${c.icon||'💳'}">
          <button type="button" onclick="iconPickerOpen('edit-cc-icon-${c.id}','cc')" id="edit-cc-icon-${c.id}-btn" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'" style="width:100%;height:44px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;font-size:24px;cursor:pointer;line-height:1;transition:border-color 0.15s">${c.icon||'💳'}</button></div>
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
        <div class="mb-3">
          <div class="field-label">STATEMENT BALANCE (₱)</div><input id="edit-cc-last-stmt-${c.id}" type="number" step="0.01" value="${c.lastStatement||0}" class="field-input" title="Auto-filled after each cut-off. Edit to override with the exact figure from your bank statement.">
          <div class="text-xs mt-1" style="color:var(--text-3)">Auto-updates after each cut-off. Edit to match your bank exactly.</div>
        </div>
        <div class="flex gap-2">
          <button onclick="ccUpdate('${c.id}')" class="flex-1 rounded-lg py-2 text-sm font-semibold text-white" style="background:var(--accent);border:none;cursor:pointer">Save</button>
          <button onclick="ccCancelEdit()" class="flex-1 rounded-lg py-2 text-sm" style="background:var(--btn-ghost);border:none;color:var(--text-2);cursor:pointer">Cancel</button>
        </div>
      </div>`;

    // ── PAYMENT form ──────────────────────────────────────
    if (acctUI.paymentCCId===c.id) return `
      <div class="rounded-xl p-4 mb-3" style="background:var(--surface2);border:1px solid var(--green-strong)">
        <div class="flex items-center gap-2 mb-4">
          <span style="font-size:20px">💳</span>
          <div>
            <div class="font-semibold text-sm" style="color:var(--text)">Record Payment — ${c.name}</div>
            <div class="text-xs" style="color:var(--text-3)">Current Balance: <span style="color:var(--red);font-weight:600">${fmt(c.outstanding)}</span></div>
          </div>
        </div>
        <div class="mb-3">
          <div class="field-label">PAYMENT DATE</div>
          <input id="cc-pay-date" type="date" value="${todayISO}" class="field-input">
        </div>
        <div class="mb-3">
          <div class="field-label">PAYMENT AMOUNT (₱)</div>
          <input id="cc-pay-amt" type="number" step="0.01" min="0" value="${c.lastStatement>0?c.lastStatement:c.outstanding}" class="field-input" style="font-size:18px;font-weight:700;color:var(--green)">
          <div class="flex gap-2 mt-2 flex-wrap">
            <button onclick="document.getElementById('cc-pay-amt').value='${c.outstanding}'" class="text-xs px-3 py-1.5 rounded-lg" style="background:var(--surface2);border:1px solid var(--border);color:var(--text-2);cursor:pointer">Current bal · ${fmt(c.outstanding)}</button>
            ${c.lastStatement>0?`<button onclick="document.getElementById('cc-pay-amt').value='${c.lastStatement}'" class="text-xs px-3 py-1.5 rounded-lg" style="background:var(--surface2);border:1px solid var(--amber-border);color:var(--amber-2);cursor:pointer">Stmt bal · ${fmt(c.lastStatement)}</button>`:''}
          </div>
        </div>
        <div class="mb-4">
          <div class="field-label">PAY FROM ACCOUNT</div>
          <select id="cc-pay-from" class="field-select">
            <option value="">— Select account —</option>
            ${state.accounts.map(a=>`<option value="${a.id}">${a.icon||'🏦'} ${a.name}</option>`).join('')}
          </select>
        </div>
        <div id="cc-pay-err" class="text-neg text-xs mb-3"></div>
        <div class="flex gap-2">
          <button onclick="ccRecordPayment('${c.id}')" class="flex-1 rounded-lg py-2.5 text-sm font-semibold text-white" style="background:var(--green-strong);border:none;cursor:pointer">✅ Record Payment</button>
          <button onclick="ccCancelPayment()" class="flex-1 rounded-lg py-2.5 text-sm" style="background:var(--btn-ghost);border:none;color:var(--text-2);cursor:pointer">Cancel</button>
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
      <div class="rounded-xl p-4 mb-3" style="background:var(--surface2);border:1px solid ${isPaid?'var(--green-dim)':'transparent'}">

        <!-- Header -->
        <div class="flex items-start justify-between mb-3">
          <div class="flex items-center gap-3">
            <div class="flex-shrink-0 flex items-center justify-center rounded-xl text-xl overflow-hidden" style="width:42px;height:42px;background:var(--amber-dim)">${brandBadge(c.name, c.icon||'💳')}</div>
            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <div class="font-semibold text-sm" style="color:var(--text)">${c.name}</div>
                ${isPaid?`<span class="text-xs px-2 py-0.5 rounded-full font-semibold" style="background:var(--green-dim);color:var(--green)">✅ Paid</span>`:''}
                ${nearDue&&!isPaid?`<span class="text-xs px-2 py-0.5 rounded-full font-semibold" style="background:var(--red-dim);color:var(--red)">⚠️ Due soon</span>`:''}
              </div>
              <div class="text-xs mt-0.5" style="color:var(--text-3)">Cut-off ${c.cutoffDay||22}${sfx(c.cutoffDay||22)} · Due ${c.dueDay}${sfx(c.dueDay)}</div>
            </div>
          </div>
          <div class="flex gap-1 flex-shrink-0">
            <button onclick="ccOpenPayment('${c.id}')" title="Record Payment" style="background:var(--green-dim);border:1px solid var(--green-dim);color:var(--green);cursor:pointer;border-radius:8px;padding:5px 8px;font-size:12px;font-weight:600">Pay</button>
            <button onclick="ccOpenEdit('${c.id}')" style="background:var(--surface);border:none;color:var(--text-2);cursor:pointer;border-radius:8px;padding:5px 8px;font-size:13px">✏️</button>
            <button onclick="ccAskDelete('${c.id}')" style="background:var(--surface);border:none;color:var(--text-2);cursor:pointer;border-radius:8px;padding:5px 8px;font-size:13px">🗑️</button>
          </div>
        </div>

        <!-- Billing Cycle Timeline -->
        <div class="rounded-lg p-3 mb-3" style="background:var(--bg);border:1px solid var(--border2)">
          <div class="flex items-center justify-between text-xs mb-2" style="color:var(--text-3)">
            <span>📅 Billing Cycle</span>
            <span style="color:${nearCutoff?'var(--red)':'var(--text-3)'}">${pastCutoff?'Grace period':''+daysToC+' days to cut-off'}</span>
          </div>
          <div class="flex items-center gap-1 text-xs">
            <div class="text-center flex-1">
              <div style="color:var(--accent-text);font-weight:600">${startLabel}</div>
              <div style="color:var(--text-3);margin-top:1px">Cycle start</div>
            </div>
            <div style="flex:2;height:2px;background:linear-gradient(90deg,var(--accent),${pastCutoff?'var(--accent)':'var(--border2)'});border-radius:1px;position:relative">
              ${!pastCutoff?`<div style="position:absolute;top:-3px;width:8px;height:8px;border-radius:50%;background:var(--accent);left:${Math.min(95,Math.max(2,100-(daysToC/(daysToC+(now.getDate()-parseInt(dates.cycleStart?.split('-')[2]||1)+1||1))*100)))}%;transform:translateX(-50%)"></div>`:''}
            </div>
            <div class="text-center flex-1">
              <div style="color:${pastCutoff?'var(--green)':nearCutoff?'var(--red)':'var(--text-2)'};font-weight:600">${cutoffLabel}</div>
              <div style="color:var(--text-3);margin-top:1px">Cut-off</div>
            </div>
            <div style="flex:1;height:2px;background:${pastCutoff?'linear-gradient(90deg,var(--green-strong),var(--border2))':'var(--border2)'};border-radius:1px"></div>
            <div class="text-center flex-1">
              <div style="color:${nearDue?'var(--red)':'var(--text-2)'};font-weight:600">${dueLabel}</div>
              <div style="color:var(--text-3);margin-top:1px">Due date</div>
            </div>
          </div>
          <div class="flex justify-between text-xs mt-2" style="color:var(--text-3)">
            <span>${pastCutoff?'Statement closed':'Charges here → this bill'}</span>
            <span style="color:${nearDue?'var(--red)':'var(--text-3)'}">${daysToD}d to pay</span>
          </div>
        </div>

        <!-- Balance Grid -->
        <div class="grid grid-cols-2 gap-2 mb-3">
          <div class="rounded-lg p-3" style="background:var(--surface)">
            <div class="text-xs mb-1" style="color:var(--text-3)">Statement Balance</div>
            ${c.lastStatement>0?`
            <div class="flex items-start justify-between">
              <div>
                <div class="text-sm font-bold text-accent">${fmt(c.lastStatement)}</div>
                <div class="text-xs mt-0.5" style="color:var(--text-3)">Last billed amount</div>
              </div>
              <div class="text-right">
                ${stmtFullyPaid
                  ? `<div class="text-xs px-2 py-1 rounded-lg font-semibold" style="background:var(--green-dim);color:var(--green)">✅ Fully Paid</div>`
                  : `<div class="text-xs" style="color:var(--text-2)">Paid <span style="color:var(--green);font-weight:600">${fmt(stmtPayments)}</span></div>
                     <div class="text-xs mt-0.5" style="color:var(--red);font-weight:600">Still owed ${fmt(stmtRemaining)}</div>`
                }
              </div>
            </div>
            ${stmtPayments>0&&!stmtFullyPaid?`
            <div class="mt-2 rounded-full overflow-hidden" style="height:3px;background:var(--btn-ghost)">
              <div style="width:${Math.min(100,(stmtPayments/c.lastStatement)*100).toFixed(1)}%;height:3px;background:var(--green);border-radius:2px"></div>
            </div>`:''}`
            :`<div class="text-sm font-bold" style="color:var(--text-3)">—</div>
            <div class="text-xs mt-0.5" style="color:var(--text-3)">No statement set</div>`}
          </div>
          <div class="rounded-lg p-3" style="background:var(--surface)">
            <div class="text-xs mb-1" style="color:var(--text-3)">Current Balance</div>
            <div class="text-sm font-bold ${isPaid?'text-pos':'text-neg'}">${isPaid?'Paid ✓':fmt(c.outstanding)}</div>
            <div class="text-xs mt-0.5" style="color:var(--text-3)">${newCharges>0?`+${fmt(newCharges)} new charges`:'No new charges'}</div>
          </div>
          <div class="rounded-lg p-3" style="background:var(--surface)">
            <div class="text-xs mb-1" style="color:var(--text-3)">Available Credit</div>
            <div class="text-base font-bold ${avail<0?'text-neg':'text-pos'}">${fmt(avail)}</div>
            ${blockedCredit>0?`<div class="text-xs mt-0.5" style="color:var(--text-3)">−${fmt(blockedCredit)} credit-to-cash</div>`:''}
          </div>
          <div class="rounded-lg p-3" style="background:var(--surface)">
            <div class="text-xs mb-1" style="color:var(--text-3)">Credit Limit</div>
            <div class="text-base font-bold" style="color:var(--text)">${fmt(c.limit)}</div>
          </div>
        </div>

        <!-- Utilization bar -->
        <div class="flex items-center gap-2">
          <div class="flex-1 rounded-full overflow-hidden" style="height:5px;background:var(--surface)">
            <div style="width:${pct.toFixed(1)}%;height:5px;background:${isPaid?'var(--green-strong)':barColor};border-radius:3px;transition:width 0.3s"></div>
          </div>
          <span class="text-xs flex-shrink-0" style="color:var(--text-3)">${pct.toFixed(1)}% used</span>
        </div>
      </div>`;
  }
  const addAcctModal = acctUI.showAddAcct ? `
    <div class="fixed inset-0 flex items-end sm:items-center justify-center" style="z-index:200;background:rgba(0,0,0,0.8)" onclick="acctCloseAdd()">
      <div class="w-full sm:w-96 rounded-t-3xl sm:rounded-2xl p-6" style="background:var(--surface);border:1px solid var(--border);max-height:92vh;overflow-y:auto" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between mb-5">
          <div class="text-lg font-bold">Add Account</div>
          <button onclick="acctCloseAdd()" style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:22px;line-height:1">×</button>
        </div>
        <div class="inline-flex p-1 rounded-xl mb-4 gap-1 w-full" style="background:var(--surface2);border:1px solid var(--border2)">
          ${['bank','ewallet','cash'].map(t=>`<button onclick="acctSetAddType('${t}')" class="flex-1 rounded-lg py-2 text-xs font-medium" style="${acctUI.addType===t?'background:var(--surface);color:var(--text);border:1px solid var(--border)':'background:transparent;color:var(--text-3);border:1px solid transparent'}">${t==='bank'?'🏦 Bank':t==='ewallet'?'📱 E-Wallet':'💵 Cash'}</button>`).join('')}
        </div>
        <div class="grid gap-3 mb-3" style="grid-template-columns:56px 1fr">
          <div><div class="field-label">ICON</div><input id="acct-icon" type="hidden" value="${acctUI.addType==='bank'?'🏦':acctUI.addType==='ewallet'?'📱':'💵'}">
          <button type="button" id="acct-icon-btn" onclick="iconPickerOpen('acct-icon',acctUI.addType)" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'" style="width:100%;height:44px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;font-size:24px;cursor:pointer;line-height:1;transition:border-color 0.15s">${acctUI.addType==='bank'?'🏦':acctUI.addType==='ewallet'?'📱':'💵'}</button></div>
          <div><div class="field-label">NAME *</div><input id="acct-name" type="text" placeholder="e.g. BDO Savings" class="field-input"></div>
        </div>
        <div class="grid grid-cols-2 gap-3 mb-5">
          <div><div class="field-label">BALANCE (₱)</div><input id="acct-balance" type="number" step="0.01" min="0" placeholder="0.00" class="field-input"></div>
          <div><div class="field-label">MAINTAINING BAL. (₱)</div><input id="acct-mbalance" type="number" step="0.01" min="0" placeholder="0.00" class="field-input" title="Min balance to keep in account"></div>
        </div>
        <div id="acct-err" class="text-neg text-xs mb-3"></div>
        <div class="flex gap-3">
          <button onclick="acctSave()" class="flex-1 rounded-xl py-3 font-semibold text-white text-sm" style="background:var(--accent);border:none;cursor:pointer">Add Account</button>
          <button onclick="acctCloseAdd()" class="flex-1 rounded-xl py-3 text-sm" style="background:var(--surface2);border:1px solid var(--border);color:var(--text-2);cursor:pointer">Cancel</button>
        </div>
      </div>
    </div>` : '';

  const addCCModal = acctUI.showAddCC ? `
    <div class="fixed inset-0 flex items-end sm:items-center justify-center" style="z-index:200;background:rgba(0,0,0,0.8)" onclick="ccCloseAdd()">
      <div class="w-full sm:w-96 rounded-t-3xl sm:rounded-2xl p-6" style="background:var(--surface);border:1px solid var(--border);max-height:92vh;overflow-y:auto" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between mb-5">
          <div class="text-lg font-bold">Add Credit Card</div>
          <button onclick="ccCloseAdd()" style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:22px;line-height:1">×</button>
        </div>
        <div class="grid gap-3 mb-3" style="grid-template-columns:56px 1fr">
          <div><div class="field-label">ICON</div><input type="hidden" id="cc-icon" value="💳">
          <button type="button" onclick="iconPickerOpen('cc-icon','cc')" id="cc-icon-btn" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'" style="width:100%;height:44px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;font-size:24px;cursor:pointer;line-height:1;transition:border-color 0.15s">💳</button></div>
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
        <div class="mb-3">
          <div class="field-label">STATEMENT BAL. (₱)</div><input id="cc-last-stmt" type="number" step="0.01" min="0" placeholder="0.00" class="field-input" title="Leave 0 — auto-fills after your first cut-off. Or enter your current statement's Total Amount Due.">
        </div>
        <div id="cc-err" class="text-neg text-xs mb-3"></div>
        <div class="flex gap-3">
          <button onclick="ccSave()" class="flex-1 rounded-xl py-3 font-semibold text-white text-sm" style="background:var(--accent);border:none;cursor:pointer">Add Card</button>
          <button onclick="ccCloseAdd()" class="flex-1 rounded-xl py-3 text-sm" style="background:var(--surface2);border:1px solid var(--border);color:var(--text-2);cursor:pointer">Cancel</button>
        </div>
      </div>
    </div>` : '';

  return `${renderNav()}
    <div class="text-2xl font-bold mb-5">Accounts</div>
    <div class="rounded-2xl p-5 mb-6" style="background:var(--hero-gradient);border:1px solid var(--accent-border)">
      <div class="flex items-center justify-between mb-1">
        <div class="text-xs font-medium" style="color:rgba(28,25,23,0.85)">Net Worth</div>
        <button onclick="toggleNetWorth()" title="${hideNetWorth?'Show amounts':'Hide amounts'}" style="background:rgba(28,25,23,0.1);border:1px solid rgba(28,25,23,0.3);border-radius:10px;padding:4px 10px;cursor:pointer;font-size:14px;line-height:1">${hideNetWorth?'🙈':'👁️'}</button>
      </div>
      <div class="text-4xl font-bold mb-4">${maskAmt(fmt2(nw))}</div>
      <div class="grid grid-cols-2 gap-4">
        <div><div class="text-xs font-medium mb-1" style="color:rgba(28,25,23,0.8)">Total Assets</div><div class="text-lg font-semibold">${maskAmt(fmt2(totalDebit+assetsVal))}</div></div>
        <div><div class="text-xs font-medium mb-1" style="color:rgba(28,25,23,0.8)">Total Owed</div><div class="text-lg font-semibold">${maskAmt(fmt2(heroLiab))}</div></div>
      </div>
      ${totalMaintaining>0?`<div style="margin-top:12px;padding-top:12px;border-top:1px solid rgba(28,25,23,0.25);display:flex;justify-content:space-between;align-items:center"><div class="text-xs font-medium" style="color:rgba(28,25,23,0.8)">Spendable (excl. maintaining bal.)</div><div style="font-size:14px;font-weight:700;color:var(--on-accent)">${maskAmt(fmt2(totalSpendable))}</div></div>`:''}
    </div>
    ${section('Banks', banks, 'bank', sumB)}
    ${section('E-Wallets', ewallets, 'ewallet', sumE)}
    ${section('Cash', cashList, 'cash', sumC)}
    ${assetsSection()}
    <div class="rounded-2xl p-4 mb-4" style="background:var(--surface)">
      <div class="flex items-center justify-between mb-3">
        <div class="flex items-center gap-2">
          <span>💳</span><span class="font-semibold">Credit Cards</span>
          <span class="text-xs px-2 py-0.5 rounded-full font-medium" style="background:var(--amber-dim);color:var(--amber)">${state.creditCards.length}</span>
        </div>
        <div class="flex items-center gap-3">
          <span class="text-sm font-semibold text-neg">Owed ${fmt2(totalOwed)}</span>
          <button onclick="ccOpenAdd()" class="text-xs px-3 py-1.5 rounded-lg font-semibold text-white" style="background:var(--accent);border:none;cursor:pointer">+ Add</button>
        </div>
      </div>
      ${state.creditCards.map(c=>ccCard(c)).join('')}
      ${state.creditCards.length===0?`<div class="text-center py-4 text-sm" style="color:var(--text-3)">No credit cards added yet</div>`:''}
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
  const inTxSection = ['transactions','categories','recurring','insights'].includes(currentView);
  const isActive = v => v==='dashboard' ? currentView==='dashboard' : v==='transactions' ? inTxSection : currentView===v;
  const tab = (k,ic,lbl) => `<button class="bnav-item${isActive(k)?' active':''}" onclick="setView('${k}')"><div class="bnav-pill"></div><span class="bnav-icon">${ic}</span><span class="bnav-label">${lbl}</span></button>`;
  const fab = `<div class="bnav-fab-wrap"><button class="bnav-fab" onclick="fabOpen()" title="Add transaction">+</button></div>`;
  return `<div class="bottom-nav"><div class="bottom-nav-inner">${tab('dashboard','🏠','Home')}${tab('transactions','💸','Txns')}${fab}${tab('accounts','🏦','Accts')}${tab('goals','🎯','Goals')}</div></div>`;
}


// ═══════════════════════════════════════════════════════
// SHARED DATE-RANGE PICKER (Transactions + Insights)
// ═══════════════════════════════════════════════════════
function renderRangeModal(target) {
  const ui = target === 'ins' ? insUI : txUI;
  const r = ui.range;
  return `
    <div class="modal-overlay fixed inset-0 flex items-end sm:items-center justify-center" style="z-index:200;background:rgba(0,0,0,0.75);backdrop-filter:blur(4px)" onclick="rangeClose()">
      <div class="w-full sm:w-96 rounded-t-3xl sm:rounded-2xl p-6" style="background:var(--surface);border:1.5px solid var(--card-border);box-shadow:3px 4px 0 var(--card-shadow);max-height:92vh;overflow-y:auto" onclick="event.stopPropagation()">
        <div class="flex items-center justify-between mb-1">
          <div class="text-lg font-bold">📅 Date Range</div>
          <button onclick="rangeClose()" style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:20px;line-height:1">×</button>
        </div>
        <div class="text-sm mb-4" style="color:var(--accent-text);font-weight:600">${rangeLabel(r)}${r.preset!=='all'&&r.preset!=='custom'?` · ${fmtDateShort(r.start)} – ${fmtDate(r.end)}`:''}</div>

        <div class="grid grid-cols-2 gap-2 mb-5">
          ${RANGE_PRESETS.map(([k,lbl])=>`
            <button onclick="rangeSetPreset('${k}')" class="text-sm py-2.5 rounded-xl transition-all"
              style="${r.preset===k?'background:var(--accent);color:var(--on-accent);border:1px solid var(--card-border);font-weight:600':'background:var(--surface2);color:var(--text-2);border:1px solid var(--border)'};cursor:pointer">
              ${lbl}
            </button>`).join('')}
        </div>

        <div class="section-label mb-3">CUSTOM RANGE</div>
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div><div class="field-label">FROM</div><input id="range-start" type="date" value="${r.preset==='custom'?r.start:''}" class="field-input"></div>
          <div><div class="field-label">TO</div><input id="range-end" type="date" value="${r.preset==='custom'?r.end:''}" class="field-input"></div>
        </div>
        <div id="range-err" class="text-neg text-xs mb-3"></div>
        <button onclick="rangeApplyCustom()" class="w-full rounded-xl py-3 font-semibold text-sm" style="background:${r.preset==='custom'?'var(--accent)':'var(--surface2)'};color:${r.preset==='custom'?'var(--on-accent)':'var(--text)'};border:1px solid var(--card-border);cursor:pointer">✓ Apply custom range</button>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════════════════
// RENDER INSIGHTS
// ═══════════════════════════════════════════════════════
const INS_PALETTE = ['#ffb000','#3b82f6','#10b981','#ef4444','#8b5cf6','#ec4899','#06b6d4','#f97316','#84cc16','#64748b'];
let _insCharts = [];

function renderInsights() {
  if (!state.transactions.length) return `${renderNav()}
    <div class="flex flex-col items-center justify-center py-20 text-center">
      <div class="text-5xl mb-4">📊</div>
      <div class="text-xl font-bold mb-2">No data to analyze yet</div>
      <div class="text-sm max-w-xs" style="color:var(--text-3)">Log a few transactions and your income, spending, and category breakdowns will appear here.</div>
    </div>`;

  const m = insightsMonthly(6);
  const active = m.filter(x => x.inc > 0 || x.exp > 0);
  const avgInc = active.length ? active.reduce((s,x)=>s+x.inc,0)/active.length : 0;
  const avgExp = active.length ? active.reduce((s,x)=>s+x.exp,0)/active.length : 0;
  const rate   = avgInc > 0 ? Math.round(((avgInc-avgExp)/avgInc)*100) : null;
  const cats   = insightsCategories(insUI.range);
  const incs   = insightsCategories(insUI.range, 'income');
  const trendCatId = insUI.trendCatId || topSpendCategoryId();
  const trendCat = state.categories.find(c => c.id === trendCatId);
  const expenseCats = state.categories.filter(c => c.type === 'expense');

  const breakdownRows = b => b.rows.map((r,i) => {
    const pct = b.total > 0 ? (r.amt/b.total)*100 : 0;
    return `
      <div class="flex items-center gap-3 py-2" style="border-bottom:1px solid var(--border2)">
        <span style="width:10px;height:10px;border-radius:3px;background:${INS_PALETTE[i%INS_PALETTE.length]};flex-shrink:0"></span>
        <span class="text-sm flex-1 truncate">${r.name}</span>
        <span class="text-xs" style="color:var(--text-3)">${pct.toFixed(1)}%</span>
        <span class="text-sm font-semibold" style="min-width:80px;text-align:right">${fmt(r.amt)}</span>
      </div>`;
  }).join('');
  const catRows = breakdownRows(cats);
  const incRows = breakdownRows(incs);

  return `${renderNav()}
    <div class="text-2xl font-bold mb-1">Insights</div>
    <div class="section-label mb-5">Last 6 months · averages use months with activity</div>

    <div class="grid grid-cols-3 gap-3 mb-5">
      <div class="rounded-xl p-3 text-center" style="background:var(--surface)">
        <div class="section-label mb-1">AVG INCOME /MO</div>
        <div class="font-bold text-pos text-sm">${fmt(avgInc)}</div>
      </div>
      <div class="rounded-xl p-3 text-center" style="background:var(--surface)">
        <div class="section-label mb-1">AVG SPEND /MO</div>
        <div class="font-bold text-neg text-sm">${fmt(avgExp)}</div>
      </div>
      <div class="rounded-xl p-3 text-center" style="background:var(--surface)">
        <div class="section-label mb-1">SAVINGS RATE</div>
        <div class="font-bold text-sm ${rate===null?'':rate>=20?'text-pos':'text-accent'}">${rate===null?'—':rate+'%'}</div>
      </div>
    </div>

    <div class="rounded-2xl p-5 mb-5" style="background:var(--surface)">
      <div class="font-semibold mb-4">💰 Income vs Expenses</div>
      <div style="height:240px"><canvas id="chart-months"></canvas></div>
    </div>

    <div class="rounded-2xl p-5 mb-5" style="background:var(--surface)">
      <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div class="font-semibold">🏷️ Spending by Category</div>
        <button onclick="rangeOpen('ins')" class="text-xs px-3 py-1.5 rounded-full font-semibold" style="background:var(--accent);color:var(--on-accent);border:1px solid var(--card-border);cursor:pointer">📅 ${rangeLabel(insUI.range)} ▾</button>
      </div>
      <div class="section-label mb-3">${cats.label} · ${fmt(cats.total)} total</div>
      ${cats.rows.length===0
        ? `<div class="text-center py-10 text-sm" style="color:var(--text-3)">No expenses recorded for this range.</div>`
        : `<div class="flex flex-col sm:flex-row gap-5 items-center">
            <div style="width:200px;height:200px;flex-shrink:0"><canvas id="chart-cats"></canvas></div>
            <div class="flex-1 w-full min-w-0">${catRows}</div>
          </div>`}
    </div>

    <div class="rounded-2xl p-5 mb-5" style="background:var(--surface)">
      <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div class="font-semibold">📈 Category Trend</div>
        <select onchange="insSetTrendCat(this.value)" class="field-select" style="width:auto;padding:6px 28px 6px 12px;font-size:12px">
          ${expenseCats.map(c=>`<option value="${c.id}" ${c.id===trendCatId?'selected':''}>${c.icon} ${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="section-label mb-3">${trendCat?trendCat.icon+' '+trendCat.name:'—'} · monthly spend, last 6 months</div>
      <div style="height:200px"><canvas id="chart-trend"></canvas></div>
    </div>

    <div class="rounded-2xl p-5 mb-5" style="background:var(--surface)">
      <div class="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div class="font-semibold">💼 Income by Source</div>
        <button onclick="rangeOpen('ins')" class="text-xs px-3 py-1.5 rounded-full font-semibold" style="background:var(--surface2);color:var(--text-2);border:1px solid var(--border);cursor:pointer">📅 ${rangeLabel(insUI.range)} ▾</button>
      </div>
      <div class="section-label mb-3">${incs.label} · ${fmt(incs.total)} total</div>
      ${incs.rows.length===0
        ? `<div class="text-center py-10 text-sm" style="color:var(--text-3)">No income recorded for this range.</div>`
        : `<div class="flex flex-col sm:flex-row gap-5 items-center">
            <div style="width:200px;height:200px;flex-shrink:0"><canvas id="chart-income"></canvas></div>
            <div class="flex-1 w-full min-w-0">${incRows}</div>
          </div>`}
    </div>
    ${insUI.showRange ? renderRangeModal('ins') : ''}`;
}

function initInsightsCharts() {
  _insCharts.forEach(c => c.destroy());
  _insCharts = [];
  if (typeof Chart === 'undefined') return;
  const css = k => getComputedStyle(document.documentElement).getPropertyValue(k).trim();

  const m = insightsMonthly(6);
  const bar = document.getElementById('chart-months');
  if (bar) _insCharts.push(new Chart(bar, {
    type: 'bar',
    data: {
      labels: m.map(x => x.label),
      datasets: [
        { label: 'Income',   data: m.map(x => x.inc), backgroundColor: css('--green-strong'), borderRadius: 6 },
        { label: 'Expenses', data: m.map(x => x.exp), backgroundColor: css('--red-strong'),   borderRadius: 6 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { labels: { color: css('--text-2'), boxWidth: 12, boxHeight: 12 } } },
      scales: {
        x: { grid: { display: false }, ticks: { color: css('--text-3') } },
        y: { grid: { color: css('--border2') }, ticks: { color: css('--text-3'), callback: v => '₱' + (v >= 1000 ? (v/1000) + 'k' : v) } },
      },
    },
  }));

  const doughnut = (elId, b) => {
    const el = document.getElementById(elId);
    if (el && b.rows.length) _insCharts.push(new Chart(el, {
      type: 'doughnut',
      data: {
        labels: b.rows.map(r => r.name),
        datasets: [{ data: b.rows.map(r => r.amt), backgroundColor: b.rows.map((_, i) => INS_PALETTE[i % INS_PALETTE.length]), borderWidth: 0 }],
      },
      options: { responsive: true, maintainAspectRatio: false, cutout: '62%', plugins: { legend: { display: false } } },
    }));
  };
  doughnut('chart-cats',   insightsCategories(insUI.range));
  doughnut('chart-income', insightsCategories(insUI.range, 'income'));

  const trendCatId = insUI.trendCatId || topSpendCategoryId();
  const trend = insightsCategoryTrend(trendCatId, 6);
  const tr = document.getElementById('chart-trend');
  if (tr) _insCharts.push(new Chart(tr, {
    type: 'line',
    data: {
      labels: trend.map(x => x.label),
      datasets: [{
        data: trend.map(x => x.amt),
        borderColor: css('--accent'),
        backgroundColor: css('--accent-dim'),
        fill: true, tension: 0.35,
        pointBackgroundColor: css('--accent'),
        pointRadius: 4, borderWidth: 2.5,
      }],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: css('--text-3') } },
        y: { beginAtZero: true, grid: { color: css('--border2') }, ticks: { color: css('--text-3'), callback: v => '₱' + (v >= 1000 ? (v/1000) + 'k' : v) } },
      },
    },
  }));
}

function render() {
  // FAB only makes sense inside the app, not on loading/login screens
  const fab = document.querySelector('.desktop-fab');
  if (fab) fab.style.display = (!isLoading && currentUser) ? '' : 'none';
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
  else if (currentView==='insights')     html=renderInsights();
  else                                   html=renderDashboard();
  document.getElementById('app').innerHTML = html;
  if (currentView==='insights') setTimeout(initInsightsCharts, 0);
  document.getElementById('bottom-nav').innerHTML = renderBottomNav();
  // Inject user pill into body (outside #app so it's always visible)
  let pill = document.getElementById('user-pill-root');
  if (!pill) { pill = document.createElement('div'); pill.id='user-pill-root'; document.body.appendChild(pill); }
  pill.innerHTML = renderUserPill();
  attachEdits();
}
