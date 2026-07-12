// ═══════════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════════
window.setView     = v => { currentView=v; render(); window.scrollTo(0,0); };
window.showImportPanel = () => { const p=document.getElementById('import-panel'); if(p) p.style.display=p.style.display==='none'?'':'none'; };
window.setForecast = d => { state.forecastDays=d; save(); render(); };
// ── Shared date-range picker (Transactions + Insights) ──
let rangeTarget = 'tx';
const rangeUI = () => rangeTarget === 'ins' ? insUI : txUI;
window.rangeOpen = t => { rangeTarget = t; rangeUI().showRange = true; render(); };
window.rangeClose = () => { txUI.showRange = false; insUI.showRange = false; render(); };
window.rangeSetPreset = p => { const ui = rangeUI(); ui.range = makeRange(p); ui.showRange = false; render(); };
window.rangeApplyCustom = () => {
  const s = document.getElementById('range-start')?.value;
  const e = document.getElementById('range-end')?.value;
  if (!s || !e) { const err = document.getElementById('range-err'); if (err) err.textContent = 'Pick both dates.'; return; }
  const ui = rangeUI();
  ui.range = { preset: 'custom', start: s <= e ? s : e, end: s <= e ? e : s };
  ui.showRange = false; render();
};
window.txSetTypeFilter = f => { txUI.typeFilter = f; render(); };
window.insSetTrendCat = id => { insUI.trendCatId = id; render(); };

// ═══════════════════════════════════════════════════════
// CATEGORY ACTIONS
// ═══════════════════════════════════════════════════════
window.catSetTab        = t  => { catUI.tab=t; catUI.expanded=null; render(); };
window.catToggleExpand  = id => { catUI.expanded=catUI.expanded===id?null:id; render(); };
window.catOpenModal     = () => { catUI.showModal=true; render(); setTimeout(()=>document.getElementById('modal-name')?.focus(),60); };
window.catCloseModal    = () => { catUI.showModal=false; render(); };
window.catToggle = id => { const c=state.categories.find(x=>x.id===id); if(c){c.active=!c.active;save();render();} };
window.catToggleSub = (cid,sid) => { const c=state.categories.find(x=>x.id===cid); if(c){const s=c.subs.find(x=>x.id===sid);if(s){s.active=!s.active;save();render();}} };
window.catDeleteSub = (cid,sid) => { const c=state.categories.find(x=>x.id===cid); if(c){c.subs=c.subs.filter(x=>x.id!==sid);save();render();} };
window.catAddFromModal = () => {
  const name=document.getElementById('modal-name').value.trim();
  const icon=document.getElementById('modal-icon').value.trim()||'🗂️';
  if(!name)return;
  state.categories.push({id:'c'+Date.now(),name,icon,type:catUI.tab,active:true,subs:[]});
  save(); catUI.showModal=false; render();
};
window.catAddSub = cid => {
  const inp=document.getElementById('new-sub-'+cid); if(!inp)return;
  const name=inp.value.trim(); if(!name)return;
  const c=state.categories.find(x=>x.id===cid);
  if(c){c.subs.push({id:'s'+Date.now(),name,active:true});save();catUI.expanded=cid;render();}
};
window.catStartRenameCategory = id => {
  const c=state.categories.find(x=>x.id===id); if(!c)return;
  const el=document.getElementById('cat-name-'+id); if(!el)return;
  const inp=document.createElement('input');
  inp.className='cat-input'; inp.value=c.name; inp.style.cssText='font-size:14px;font-weight:600;width:150px';
  el.replaceWith(inp); inp.focus(); inp.select();
  const done=()=>{c.name=inp.value.trim()||c.name;save();render();};
  inp.onblur=done; inp.onkeydown=e=>{if(e.key==='Enter')done();if(e.key==='Escape')render();};
};
window.catStartRenameIcon = id => {
  const c=state.categories.find(x=>x.id===id); if(!c)return;
  const el=document.getElementById('cat-icon-'+id); if(!el)return;
  const inp=document.createElement('input');
  inp.className='cat-input'; inp.value=c.icon; inp.style.cssText='font-size:20px;width:44px;text-align:center;padding:4px';
  el.innerHTML=''; el.appendChild(inp); inp.focus(); inp.select();
  const done=()=>{c.icon=inp.value.trim()||c.icon;save();render();};
  inp.onblur=done; inp.onkeydown=e=>{if(e.key==='Enter')done();if(e.key==='Escape')render();};
};
window.catStartRenameSub = (cid,sid) => {
  const c=state.categories.find(x=>x.id===cid); if(!c)return;
  const s=c.subs.find(x=>x.id===sid); if(!s)return;
  const el=document.getElementById('sub-name-'+sid); if(!el)return;
  const inp=document.createElement('input');
  inp.className='cat-input'; inp.value=s.name; inp.style.cssText='font-size:12px;width:110px';
  el.replaceWith(inp); inp.focus(); inp.select();
  const done=()=>{s.name=inp.value.trim()||s.name;save();catUI.expanded=cid;render();};
  inp.onblur=done; inp.onkeydown=e=>{if(e.key==='Enter')done();if(e.key==='Escape'){catUI.expanded=cid;render();}};
};

// ═══════════════════════════════════════════════════════
// TRANSACTION ACTIONS
// ═══════════════════════════════════════════════════════
window.txOpenModal  = () => { txUI.showModal=true; txUI.editId=null; txUI.deleteId=null; render(); setTimeout(()=>document.getElementById('tx-desc')?.focus(),60); };
window.txOpenEdit   = id  => { txUI.editId=id; txUI.showModal=true; txUI.deleteId=null; render(); setTimeout(()=>document.getElementById('tx-desc')?.focus(),60); };
window.txCloseModal = () => { txUI.showModal=false; txUI.editId=null; render(); };
window.txSetType    = t   => {
  const inp = document.getElementById('tx-type'); if (inp) inp.value = t;
  const colors = {income:'var(--green)', expense:'var(--red)', transfer:'var(--accent-text)'};
  ['expense','income','transfer'].forEach(k => {
    const btn = document.getElementById('btn-'+k); if (!btn) return;
    if (k===t) { btn.style.background='var(--surface)'; btn.style.borderColor='var(--border)'; btn.style.color=colors[k]; }
    else       { btn.style.background='transparent'; btn.style.borderColor='transparent'; btn.style.color='var(--text-3)'; }
  });
  const isTransfer = t==='transfer';
  const catWrap   = document.getElementById('tx-cat-wrap');
  const subWrap   = document.getElementById('tx-subcat-wrap');
  const toAccWrap = document.getElementById('tx-toaccount-wrap');
  if (catWrap)   catWrap.style.display    = isTransfer ? 'none' : '';
  if (subWrap)   subWrap.style.display    = isTransfer ? 'none' : '';
  if (toAccWrap) toAccWrap.style.display  = isTransfer ? ''     : 'none';
  txUpdateCatDropdown();
};

window.txUpdateCatDropdown = () => {
  const type = document.getElementById('tx-type').value;
  const catSel = document.getElementById('tx-cat');
  const subSel = document.getElementById('tx-subcat');
  const catWrap    = document.getElementById('tx-cat-wrap');
  const subWrap    = document.getElementById('tx-subcat-wrap');
  const toAccWrap  = document.getElementById('tx-toaccount-wrap');
  const isTransfer = type === 'transfer';
  if (catWrap)   catWrap.style.display   = isTransfer ? 'none' : '';
  if (subWrap)   subWrap.style.display   = isTransfer ? 'none' : '';
  if (toAccWrap) toAccWrap.style.display = isTransfer ? '' : 'none';
  if (!catSel) return;
  const filterType = type === 'income' ? 'income' : 'expense';
  catSel.innerHTML = '<option value="">— Select category —</option>';
  state.categories.filter(c=>c.type===filterType && c.active).forEach(c => {
    catSel.innerHTML += `<option value="${c.id}">${c.icon} ${c.name}</option>`;
  });
  if (subSel) subSel.innerHTML = '<option value="">— Select subcategory —</option>';
};

window.txUpdateSubDropdown = () => {
  const catId = document.getElementById('tx-cat').value;
  const subSel = document.getElementById('tx-subcat');
  if (!subSel) return;
  const cat = state.categories.find(c=>c.id===catId);
  subSel.innerHTML = '<option value="">— Select subcategory (optional) —</option>';
  if (cat) cat.subs.filter(s=>s.active).forEach(s => {
    subSel.innerHTML += `<option value="${s.id}">${s.name}</option>`;
  });
};

window.txSave = () => {
  const desc    = document.getElementById('tx-desc').value.trim();
  const type    = document.getElementById('tx-type').value;
  const date    = document.getElementById('tx-date').value;
  const amt     = parseFloat(document.getElementById('tx-amount').value);
  const catId   = document.getElementById('tx-cat').value;
  const subId   = document.getElementById('tx-subcat').value;
  const accId   = document.getElementById('tx-account').value;
  const notes   = document.getElementById('tx-notes').value.trim();
  const toAccId = document.getElementById('tx-toaccount')?.value || '';
  // Transfers don't require a category; others do
  const needsCat = type !== 'transfer';
  if (!desc || !date || isNaN(amt) || amt <= 0 || !accId || (needsCat && !catId)) {
    document.getElementById('tx-error').textContent = 'Please fill in all required fields.';
    return;
  }
  if (txUI.editId) {
    // Edit existing — reverse old effect, apply new
    const tx = state.transactions.find(t => t.id === txUI.editId);
    if (tx) {
      if (tx.notes==='CC payment') adjustCCPayment(tx, -1);
      else {
        adjustAccount(tx.accountId, tx.type, tx.amount, -1);
        if (tx.type==='transfer') adjustTransferDest(tx.toAccountId, tx.amount, -1);
      }
      tx.date = date; tx.description = desc; tx.type = type; tx.amount = amt;
      tx.categoryId = catId; tx.subcategoryId = subId; tx.accountId = accId;
      tx.notes = notes; tx.toAccountId = toAccId;
      if (tx.notes==='CC payment') adjustCCPayment(tx, +1);
      else {
        adjustAccount(accId, type, amt, +1);
        if (type==='transfer') adjustTransferDest(toAccId, amt, +1);
      }
    }
  } else {
    // Add new
    state.transactions.push({
      id: 'tx_'+Date.now(),
      date, description: desc, type, amount: amt,
      categoryId: catId, subcategoryId: subId, accountId: accId,
      toAccountId: toAccId, notes
    });
    adjustAccount(accId, type, amt, +1);
    if (type==='transfer') adjustTransferDest(toAccId, amt, +1);
  }
  const _wasEdit = !!txUI.editId;
  save(); txUI.showModal=false; txUI.editId=null; render();
  showToast(_wasEdit ? "✓ Transaction updated" : "✓ Transaction saved", "success");
};

// ── CC outstanding auto-adjustment ──────────────────────
function adjustCC(accountId, type, amount, delta) {
  const cc = state.creditCards.find(c=>c.id===accountId);
  if (!cc) return;
  if (type==='expense') cc.outstanding = Math.max(0, cc.outstanding + delta * amount);
  if (type==='income')  cc.outstanding = Math.max(0, cc.outstanding - delta * amount);
}

// ── Debit account balance auto-adjustment ───────────────
// delta: +1 = apply transaction, -1 = reverse transaction
function adjustDebit(accountId, type, amount, delta) {
  const acct = state.accounts.find(a=>a.id===accountId);
  if (!acct) return;
  if (type==='expense')  acct.balance = acct.balance - delta * amount;
  if (type==='income')   acct.balance = acct.balance + delta * amount;
  // transfers: from-account loses money
  if (type==='transfer') acct.balance = acct.balance - delta * amount;
}

// Adjust both CC and debit together (one always a no-op)
function adjustAccount(accountId, type, amount, delta) {
  adjustCC(accountId, type, amount, delta);
  adjustDebit(accountId, type, amount, delta);
}

// For transfers: also credit the destination debit account
function adjustTransferDest(toAccountId, amount, delta) {
  const acct = state.accounts.find(a=>a.id===toAccountId);
  if (acct) acct.balance = acct.balance + delta * amount;
}

// CC payments (notes==='CC payment') are excluded from adjustAccount — their
// balance effects live here: outstanding on the destination CC, cash on the source.
// delta: +1 = apply payment, -1 = reverse it
function adjustCCPayment(tx, delta) {
  const cc = state.creditCards.find(c=>c.id===tx.toAccountId);
  if (cc) cc.outstanding = Math.max(0, cc.outstanding - delta * tx.amount);
  const src = state.accounts.find(a=>a.id===tx.accountId);
  if (src) src.balance = src.balance - delta * tx.amount;
}

window.txAskDelete = id => { txUI.deleteId=id; render(); };
window.txCancelDelete = () => { txUI.deleteId=null; render(); };
window.txConfirmDelete = () => {
  const tx = state.transactions.find(t=>t.id===txUI.deleteId);
  if (tx) {
    if (tx.notes==='CC payment') adjustCCPayment(tx, -1);
    else {
      adjustAccount(tx.accountId, tx.type, tx.amount, -1);
      if (tx.type==='transfer') adjustTransferDest(tx.toAccountId, tx.amount, -1);
    }
  }
  state.transactions = state.transactions.filter(t=>t.id!==txUI.deleteId);
  save(); txUI.deleteId=null; render();
  showToast("Transaction deleted", "error");
};

// ═══════════════════════════════════════════════════════
// ACCOUNT ACTIONS
// ═══════════════════════════════════════════════════════
window.acctOpenAdd     = (type='bank') => { acctUI.showAddAcct=true; acctUI.addType=type; acctUI.editAcctId=null; render(); setTimeout(()=>document.getElementById('acct-name')?.focus(),60); };
window.acctCloseAdd    = () => { acctUI.showAddAcct=false; render(); };
window.acctSetAddType  = t => { acctUI.addType=t; render(); setTimeout(()=>document.getElementById('acct-name')?.focus(),60); };
window.acctOpenEdit    = id => { acctUI.editAcctId=id; acctUI.showAddAcct=false; acctUI.deleteAcctId=null; render(); setTimeout(()=>document.getElementById('edit-acct-name-'+id)?.focus(),60); };
window.acctCancelEdit  = () => { acctUI.editAcctId=null; render(); };
window.acctAskDelete   = id => { acctUI.deleteAcctId=id; acctUI.editAcctId=null; render(); };
window.acctCancelDelete= () => { acctUI.deleteAcctId=null; render(); };
window.acctUpdate = id => {
  const a=state.accounts.find(x=>x.id===id); if(!a) return;
  const name=document.getElementById('edit-acct-name-'+id)?.value.trim();
  const bal=parseFloat(document.getElementById('edit-acct-bal-'+id)?.value);
  const mbal=parseFloat(document.getElementById('edit-acct-mbal-'+id)?.value);
  const icon=document.getElementById('edit-acct-icon-'+id)?.value.trim();
  if(name) a.name=name; if(!isNaN(bal)) a.balance=bal; if(!isNaN(mbal)) a.maintainingBalance=mbal; if(icon) a.icon=icon;
  save(); acctUI.editAcctId=null; render();
};
window.acctConfirmDelete = () => {
  state.accounts=state.accounts.filter(a=>a.id!==acctUI.deleteAcctId);
  save(); acctUI.deleteAcctId=null; render();
};
window.acctSave = () => {
  const name=document.getElementById('acct-name')?.value.trim();
  const bal=parseFloat(document.getElementById('acct-balance')?.value)||0;
  const mbal=parseFloat(document.getElementById('acct-mbalance')?.value)||0;
  const icon=document.getElementById('acct-icon')?.value.trim()||(acctUI.addType==='bank'?'🏦':acctUI.addType==='ewallet'?'📱':'💵');
  if(!name){document.getElementById('acct-err').textContent='Name is required.';return;}
  state.accounts.push({id:'acct_'+Date.now(),name,balance:bal,maintainingBalance:mbal,type:acctUI.addType,icon});
  save(); acctUI.showAddAcct=false; render();
};

// ═══════════════════════════════════════════════════════
// CREDIT CARD ACTIONS
// ═══════════════════════════════════════════════════════
window.ccOpenAdd    = () => { acctUI.showAddCC=true; acctUI.editCCId=null; render(); setTimeout(()=>document.getElementById('cc-name')?.focus(),60); };
window.ccCloseAdd   = () => { acctUI.showAddCC=false; render(); };
window.ccOpenEdit   = id => { acctUI.editCCId=id; acctUI.showAddCC=false; acctUI.deleteCCId=null; render(); setTimeout(()=>document.getElementById('edit-cc-name-'+id)?.focus(),60); };
window.ccCancelEdit = () => { acctUI.editCCId=null; render(); };
window.ccAskDelete  = id => { acctUI.deleteCCId=id; acctUI.editCCId=null; render(); };
window.ccCancelDelete=() => { acctUI.deleteCCId=null; render(); };
window.ccUpdate = id => {
  const c=state.creditCards.find(x=>x.id===id); if(!c) return;
  const name=document.getElementById('edit-cc-name-'+id)?.value.trim();
  const owed=parseFloat(document.getElementById('edit-cc-owed-'+id)?.value);
  const lim=parseFloat(document.getElementById('edit-cc-lim-'+id)?.value);
  const due=parseInt(document.getElementById('edit-cc-due-'+id)?.value);
  const icon=document.getElementById('edit-cc-icon-'+id)?.value.trim();
  const lastStmtU=parseFloat(document.getElementById('edit-cc-last-stmt-'+id)?.value);
  const cutoffDayU=parseInt(document.getElementById('edit-cc-cutoff-'+id)?.value);
  const minDueU=parseFloat(document.getElementById('edit-cc-min-due-'+id)?.value);
  if(name) c.name=name; if(!isNaN(owed)) c.outstanding=owed;
  if(!isNaN(lim)) c.limit=lim; if(!isNaN(due)&&due>=1&&due<=31) c.dueDay=due;
  if(!isNaN(lastStmtU)) c.lastStatement=lastStmtU;
  if(!isNaN(cutoffDayU)&&cutoffDayU>=1&&cutoffDayU<=31) c.cutoffDay=cutoffDayU;
  if(!isNaN(minDueU)) c.minDue=minDueU;
  if(icon) c.icon=icon;
  save(); acctUI.editCCId=null; render();
};
window.ccConfirmDelete = () => {
  state.creditCards=state.creditCards.filter(c=>c.id!==acctUI.deleteCCId);
  save(); acctUI.deleteCCId=null; render();
};
window.ccSave = () => {
  const name=document.getElementById('cc-name')?.value.trim();
  const owed=parseFloat(document.getElementById('cc-owed')?.value)||0;
  const lim=parseFloat(document.getElementById('cc-lim')?.value)||0;
  const due=parseInt(document.getElementById('cc-due')?.value)||25;
  const cutoffDay=parseInt(document.getElementById('cc-cutoff')?.value)||22;
  const lastStmt=parseFloat(document.getElementById('cc-last-stmt')?.value)||0;
  const minDue=parseFloat(document.getElementById('cc-min-due')?.value)||0;
  const icon=document.getElementById('cc-icon')?.value.trim()||'💳';
  if(!name){document.getElementById('cc-err').textContent='Name is required.';return;}
  state.creditCards.push({id:'cc_'+Date.now(),name,outstanding:owed,lastStatement:lastStmt,minDue,limit:lim,dueDay:due,cutoffDay:cutoffDay,icon});
  save(); acctUI.showAddCC=false; render();
};

// ── CC Payment ───────────────────────────────────────────
window.ccOpenPayment = id => { acctUI.paymentCCId=id; acctUI.editCCId=null; render(); setTimeout(()=>document.getElementById('cc-pay-amt')?.select(),80); };
window.ccCancelPayment = () => { acctUI.paymentCCId=null; render(); };
window.ccRecordPayment = id => {
  const c = state.creditCards.find(x=>x.id===id); if(!c) return;
  const amt   = parseFloat(document.getElementById('cc-pay-amt')?.value);
  const fromId = document.getElementById('cc-pay-from')?.value;
  const date  = document.getElementById('cc-pay-date')?.value || todayISO;
  if(isNaN(amt)||amt<=0){ document.getElementById('cc-pay-err').textContent='Enter a valid amount.'; return; }
  // Log as transfer (not expense) so it doesn't double-count spending
  state.transactions.push({
    id:'tx_'+Date.now(), date, description:`${c.name} Payment`,
    type:'transfer', amount:amt,
    categoryId:'', subcategoryId:'',
    accountId: fromId||'', toAccountId: id,
    notes:'CC payment'
  });
  // Reduce outstanding balance on CC
  c.outstanding = Math.max(0, c.outstanding - amt);
  if(c.outstanding===0) c.lastStatement=0;
  // Also deduct from the source debit account
  const fromAcct = state.accounts.find(a=>a.id===fromId);
  if(fromAcct) fromAcct.balance = fromAcct.balance - amt;
  save(); acctUI.paymentCCId=null; render();
};
// Compute current cycle spending from transactions tagged to this CC
// Compute dates for a CC's billing cycle based on cutoffDay
window.ccCycleDates = id => {
  const c = state.creditCards.find(x=>x.id===id); if(!c) return null;
  const cutoff = c.cutoffDay||22;
  const cycleStartDay = cutoff===31 ? 1 : cutoff+1; // day after cutoff
  const d = now.getDate();
  // Current cycle start: if today >= cycleStartDay, it started this month; else last month
  let cycleStartDate, cutoffDate;
  if(d >= cycleStartDay) {
    cycleStartDate = new Date(now.getFullYear(), now.getMonth(), cycleStartDay);
    cutoffDate     = new Date(now.getFullYear(), now.getMonth(), cutoff);
    // If cutoff < cycleStartDay it's in the same month (e.g. start=23, cutoff=22 → cutoff is next month)
    if(cutoff < cycleStartDay) cutoffDate = new Date(now.getFullYear(), now.getMonth()+1, cutoff);
  } else {
    cycleStartDate = new Date(now.getFullYear(), now.getMonth()-1, cycleStartDay);
    cutoffDate     = new Date(now.getFullYear(), now.getMonth(), cutoff);
  }
  // Due date: dueDay in the month after cutoff
  const cutoffMo = cutoffDate.getMonth(), cutoffYr = cutoffDate.getFullYear();
  const dueDate  = new Date(cutoffYr, cutoffMo+1, c.dueDay||1);
  const daysToC  = Math.ceil((cutoffDate - now + 86400000) / 86400000);
  const daysToD  = Math.ceil((dueDate   - now + 86400000) / 86400000);
  return {
    cycleStart: toLocalISO(cycleStartDate),
    cutoff:     toLocalISO(cutoffDate),
    due:        toLocalISO(dueDate),
    daysToCutoff: Math.max(0, daysToC),
    daysToDue:    Math.max(0, daysToD),
    cycleStartDay, cutoffDay: cutoff
  };
};
// New charges since current cycle start (posted to this CC)
window.ccCycleSpend = id => {
  const dates = ccCycleDates(id); if(!dates) return 0;
  return (state.transactions||[])
    .filter(t=>t.accountId===id && t.type==='expense' && t.date>=dates.cycleStart && t.notes!=='CC payment')
    .reduce((s,t)=>s+t.amount,0);
};

// Sum all payments made toward this CC since the previous cut-off
// (i.e. payments recorded against the current statement balance)
window.ccStatementPayments = id => {
  const dates = ccCycleDates(id); if(!dates) return 0;
  // Previous cut-off = same day last month (approx — when statement was generated)
  const prevCutoff = new Date(now.getFullYear(), now.getMonth()-1, dates.cutoffDay);
  const prevCutoffStr = toLocalISO(prevCutoff);
  return (state.transactions||[])
    .filter(t => t.notes==='CC payment' && t.toAccountId===id && t.date>=prevCutoffStr)
    .reduce((s,t)=>s+t.amount,0);
};

// ═══════════════════════════════════════════════════════
// GOAL ACTIONS
// ═══════════════════════════════════════════════════════
window.goalOpenAdd    = () => { goalUI.showAddGoal=true; goalUI.editGoalId=null; render(); setTimeout(()=>document.getElementById('goal-name')?.focus(),60); };
window.goalCloseAdd   = () => { goalUI.showAddGoal=false; render(); };
window.goalOpenEdit   = id => { goalUI.editGoalId=id; goalUI.showAddGoal=false; goalUI.deleteGoalId=null; render(); };
window.goalCancelEdit = () => { goalUI.editGoalId=null; render(); };
window.goalAskDelete  = id => { goalUI.deleteGoalId=id; goalUI.editGoalId=null; goalUI.depositGoalId=null; render(); };
window.goalCancelDelete=() => { goalUI.deleteGoalId=null; render(); };
window.goalConfirmDelete=() => { state.goals=state.goals.filter(g=>g.id!==goalUI.deleteGoalId); save(); goalUI.deleteGoalId=null; render(); };
window.goalToggleHistory=id => { goalUI.expandedGoalId=goalUI.expandedGoalId===id?null:id; goalUI.depositGoalId=null; render(); };
window.goalOpenDeposit= id => { goalUI.depositGoalId=id; goalUI.expandedGoalId=null; render(); setTimeout(()=>document.getElementById('dep-amt-'+id)?.focus(),60); };
window.goalCloseDeposit=() => { goalUI.depositGoalId=null; render(); };
window.goalUpdateSub  = (catSel, subSel) => {
  const catId=document.getElementById(catSel)?.value;
  const el=document.getElementById(subSel); if(!el) return;
  el.innerHTML='<option value="">— All subcategories —</option>';
  const cat=state.categories.find(c=>c.id===catId);
  if(cat) cat.subs.filter(s=>s.active).forEach(s=>{ el.innerHTML+=`<option value="${s.id}">${s.name}</option>`; });
};
window.goalSave = () => {
  const name=document.getElementById('goal-name')?.value.trim();
  const target=parseFloat(document.getElementById('goal-target')?.value);
  const date=document.getElementById('goal-date')?.value;
  const icon=document.getElementById('goal-icon')?.value.trim()||'🎯';
  const catId=document.getElementById('goal-cat')?.value||'';
  const subId=document.getElementById('goal-subcat')?.value||'';
  if(!name||isNaN(target)||!date){document.getElementById('goal-err').textContent='Name, amount, and date are required.';return;}
  state.goals.push({id:'g_'+Date.now(),name,icon,target,targetDate:date,linkedCategoryId:catId,linkedSubcategoryId:subId,deposits:[]});
  save(); goalUI.showAddGoal=false; render();
};
window.goalUpdate = id => {
  const g=state.goals.find(x=>x.id===id); if(!g) return;
  const name=document.getElementById('edit-goal-name')?.value.trim();
  const target=parseFloat(document.getElementById('edit-goal-target')?.value);
  const date=document.getElementById('edit-goal-date')?.value;
  const icon=document.getElementById('edit-goal-icon')?.value.trim();
  if(name) g.name=name; if(!isNaN(target)) g.target=target; if(date) g.targetDate=date; if(icon) g.icon=icon;
  g.linkedCategoryId=document.getElementById('edit-goal-cat')?.value||'';
  g.linkedSubcategoryId=document.getElementById('edit-goal-subcat')?.value||'';
  save(); goalUI.editGoalId=null; render();
};
window.goalAddDeposit = id => {
  const g=state.goals.find(x=>x.id===id); if(!g) return;
  const amt=parseFloat(document.getElementById('dep-amt-'+id)?.value);
  const date=document.getElementById('dep-date-'+id)?.value||todayISO;
  const note=document.getElementById('dep-note-'+id)?.value.trim()||'';
  if(isNaN(amt)||amt<=0) return;
  if(!g.deposits) g.deposits=[];
  g.deposits.push({id:'d_'+Date.now(),date,amount:amt,note});
  save(); goalUI.depositGoalId=null; goalUI.expandedGoalId=id; render();
};
window.goalAskDeleteDeposit=(goalId,depositId)=>{ goalUI.deleteDepositKey={goalId,depositId}; render(); };
window.goalCancelDeleteDeposit=()=>{ goalUI.deleteDepositKey=null; render(); };
window.goalConfirmDeleteDeposit=()=>{
  const {goalId,depositId}=goalUI.deleteDepositKey;
  const g=state.goals.find(x=>x.id===goalId); if(!g) return;
  g.deposits=g.deposits.filter(d=>d.id!==depositId);
  save(); goalUI.deleteDepositKey=null; render();
};

// ═══════════════════════════════════════════════════════
// RECURRING ACTIONS
// ═══════════════════════════════════════════════════════
window.recOpenAdd     = () => { recUI.showAddRec=true; recUI.editRecId=null; render(); setTimeout(()=>document.getElementById('rec-name')?.focus(),60); };
window.recCloseAdd    = () => { recUI.showAddRec=false; render(); };
window.recOpenEdit    = id => { recUI.editRecId=id; recUI.showAddRec=false; recUI.deleteRecId=null; render(); setTimeout(()=>document.getElementById('edit-rec-name')?.focus(),60); };
window.recCancelEdit  = () => { recUI.editRecId=null; render(); };
window.recAskDelete   = id => { recUI.deleteRecId=id; recUI.editRecId=null; render(); };
window.recCancelDelete= () => { recUI.deleteRecId=null; render(); };
window.recConfirmDelete=() => { state.recurring=state.recurring.filter(r=>r.id!==recUI.deleteRecId); save(); recUI.deleteRecId=null; render(); };
window.recToggleActive= id => { const r=state.recurring.find(x=>x.id===id); if(r) r.active=!r.active; save(); render(); };
window.recDuplicate   = id => {
  const r=state.recurring.find(x=>x.id===id); if(!r) return;
  const copy={...r, id:'rec_'+Date.now(), name:r.name+' (copy)', active:false};
  state.recurring.push(copy); save(); render();
};

// ── Icon Picker ──────────────────────────────────────────
const ICON_SETS = {
  bank:    ['🏦','🏧','💰','💵','💳','🏪','🏢','🏬','🔑','💼'],
  ewallet: ['📱','💜','🟢','🔵','⚡','📲','💸','🪙','📡','🌐'],
  cash:    ['💵','💴','💶','💷','🪙','💰','👛','🤑','💲','🏷️'],
  cc:      ['💳','🔴','🔵','🟡','⬛','🟦','🏦','💜','🟠','💎'],
  rec:     ['🔁','📅','🏠','🚗','💡','📱','🛡️','🐱','🍔','✈️','💼','🎯','🏋️','💈','🌊','🎵','📦','🔒','🌱','⚽'],
  goal:    ['🎯','🏠','🚗','✈️','💍','🎓','🏋️','💻','🌴','🎸','🏖️','👶','🐕','📸','🎨','🍀','🚀','⭐','🏆','💫'],
  general: ['😊','🌟','❤️','🔥','⚡','🎉','🌈','🦋','🌸','🍀','🎵','🎮','📚','🍕','☕','🌙','☀️','🐱','🐶','🦊'],
};
window.iconPickerOpen = (inputId, setKey='general') => {
  iconPickerUI = { targetId: inputId, setKey };
  // render picker overlay
  const existing = document.getElementById('icon-picker-overlay');
  if (existing) existing.remove();
  const icons = ICON_SETS[setKey] || ICON_SETS.general;
  const inp = document.getElementById(inputId);
  const overlay = document.createElement('div');
  overlay.id = 'icon-picker-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,0.6)';
  overlay.innerHTML = `
    <div style="width:100%;max-width:420px;background:var(--surface);border-radius:20px 20px 0 0;padding:20px;border:1px solid var(--border);border-bottom:none" onclick="event.stopPropagation()">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px">
        <div style="font-weight:600;font-size:14px;color:var(--text)">Choose Icon</div>
        <button onclick="iconPickerClose()" style="background:none;border:none;color:var(--text-3);cursor:pointer;font-size:22px;line-height:1">×</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:8px;margin-bottom:12px">
        ${icons.map(ic=>`<button onclick="iconPickerSelect('${inputId}','${ic}')" style="background:var(--surface2);border:2px solid ${inp&&inp.value===ic?'var(--accent)':'transparent'};border-radius:10px;padding:8px;font-size:22px;cursor:pointer;line-height:1;transition:border-color 0.1s" onmouseover="this.style.background='var(--btn-ghost)'" onmouseout="this.style.background='var(--surface2)'">${ic}</button>`).join('')}
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        <input id="icon-picker-custom" placeholder="Or type/paste any emoji…" value="${inp?inp.value:''}" style="flex:1;background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:10px 12px;color:var(--text);font-size:16px;font-family:inherit" oninput="iconPickerPreview(this.value)">
        <button onclick="iconPickerApplyCustom('${inputId}')" style="background:var(--accent);border:none;border-radius:10px;padding:10px 16px;color:#fff;font-size:13px;font-weight:600;cursor:pointer">Use</button>
      </div>
      <div id="icon-preview" style="text-align:center;font-size:40px;margin-top:10px;min-height:50px">${inp?inp.value:''}</div>
    </div>`;
  overlay.addEventListener('click', () => iconPickerClose());
  document.body.appendChild(overlay);
};
window.iconPickerClose = () => { const el=document.getElementById('icon-picker-overlay'); if(el) el.remove(); };
window.iconPickerSelect = (inputId, icon) => {
  const inp = document.getElementById(inputId);
  if (inp) { inp.value = icon; }
  const btn = document.getElementById(inputId+'-btn');
  if (btn) btn.textContent = icon;
  iconPickerClose();
};
window.iconPickerPreview = val => { const p=document.getElementById('icon-preview'); if(p) p.textContent=val; };
window.iconPickerApplyCustom = inputId => {
  const custom=document.getElementById('icon-picker-custom')?.value.trim();
  if (custom) iconPickerSelect(inputId, custom);
};
window.recUpdateSub   = (catSel,subSel) => {
  const catId=document.getElementById(catSel)?.value;
  const el=document.getElementById(subSel); if(!el) return;
  el.innerHTML='<option value="">— All subcategories —</option>';
  const cat=state.categories.find(c=>c.id===catId);
  if(cat) cat.subs.filter(s=>s.active).forEach(s=>{ el.innerHTML+=`<option value="${s.id}">${s.name}</option>`; });
};
window.recSave = () => {
  const name=document.getElementById('rec-name')?.value.trim();
  const amount=parseFloat(document.getElementById('rec-amount')?.value)||0;
  const type=document.getElementById('rec-type')?.value||'expense';
  const freq=document.getElementById('rec-freq')?.value||'monthly';
  const due=document.getElementById('rec-due')?.value||todayISO;
  const icon=document.getElementById('rec-icon')?.value.trim()||'🔁';
  const catId=document.getElementById('rec-cat')?.value||'';
  const subId=document.getElementById('rec-subcat')?.value||'';
  const acctId=document.getElementById('rec-acct')?.value||'';
  if(!name){document.getElementById('rec-err').textContent='Name is required.';return;}
  state.recurring.push({id:'rec_'+Date.now(),name,icon,type,amount,frequency:freq,categoryId:catId,subcategoryId:subId,accountId:acctId,nextDue:due,active:true,lastPosted:null});
  save(); recUI.showAddRec=false; render();
};
window.recUpdate = id => {
  const r=state.recurring.find(x=>x.id===id); if(!r) return;
  const name=document.getElementById('edit-rec-name')?.value.trim();
  const amount=parseFloat(document.getElementById('edit-rec-amount')?.value);
  const type=document.getElementById('edit-rec-type')?.value;
  const freq=document.getElementById('edit-rec-freq')?.value;
  const due=document.getElementById('edit-rec-due')?.value;
  const icon=document.getElementById('edit-rec-icon')?.value.trim();
  if(name) r.name=name; if(!isNaN(amount)) r.amount=amount; if(type) r.type=type;
  if(freq) r.frequency=freq; if(due) r.nextDue=due; if(icon) r.icon=icon;
  r.categoryId=document.getElementById('edit-rec-cat')?.value||'';
  r.subcategoryId=document.getElementById('edit-rec-subcat')?.value||'';
  r.accountId=document.getElementById('edit-rec-acct')?.value||'';
  save(); recUI.editRecId=null; render();
};
