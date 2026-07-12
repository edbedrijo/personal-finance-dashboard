// ═══════════════════════════════════════════════════════
// UI STATE
// ═══════════════════════════════════════════════════════
let currentView = 'dashboard';
let catUI  = { tab:'expense', expanded:null, showModal:false };
let txUI   = { filter:'month', showModal:false, deleteId:null, editId:null };
let acctUI = { showAddAcct:false, addType:'bank', editAcctId:null, deleteAcctId:null, showAddCC:false, editCCId:null, deleteCCId:null, paymentCCId:null };
let goalUI = { showAddGoal:false, editGoalId:null, deleteGoalId:null, depositGoalId:null, expandedGoalId:null, deleteDepositKey:null };
let recUI  = { showAddRec:false, editRecId:null, deleteRecId:null };
let iconPickerUI = { targetId:null, anchorRect:null };
let recAutoPostedCount = 0;
let recurringChecked   = false;
const _sessionSublineIndex = Math.floor(Math.random() * 20);

// ═══════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════
const fmt  = n => '₱' + Math.round(n).toLocaleString('en-PH');
const fmt2 = n => '₱' + n.toLocaleString('en-PH', {minimumFractionDigits:2, maximumFractionDigits:2});
const sfx  = d => d>3&&d<21?'th':{1:'st',2:'nd',3:'rd'}[d%10]||'th';
const totalAssets    = () => state.accounts.reduce((s,a)=>s+a.balance,0);
const spendableAssets= () => state.accounts.reduce((s,a)=>s+(a.balance-(a.maintainingBalance||0)),0);
const totalLiab      = () => state.creditCards.reduce((s,c)=>s+c.outstanding,0);
const netWorth       = () => totalAssets()-totalLiab();
// Find any account OR credit card by id — used wherever a transaction's accountId may be a CC
const findAccount = id => state.accounts.find(a=>a.id===id) || state.creditCards.find(c=>c.id===id) || null;

function monthsBetween(ds) {
  const t = new Date(ds + 'T00:00:00');
  return Math.max((t.getFullYear()-now.getFullYear())*12+(t.getMonth()-now.getMonth()),0);
}
function fmtDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { month:'short', day:'numeric', year:'numeric' });
}
function fmtDateShort(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('en-PH', { month:'short', day:'numeric' });
}

function advanceDue(dateStr, freq) {
  const d = new Date(dateStr + 'T00:00:00');
  switch(freq) {
    case 'daily':     d.setDate(d.getDate()+1); break;
    case 'weekly':    d.setDate(d.getDate()+7); break;
    case 'biweekly':  d.setDate(d.getDate()+14); break;
    case 'monthly':   d.setMonth(d.getMonth()+1); break;
    case 'quarterly': d.setMonth(d.getMonth()+3); break;
    case 'yearly':    d.setFullYear(d.getFullYear()+1); break;
  }
  return toLocalISO(d);
}

function checkAndPostRecurring() {
  if (recurringChecked) return 0;
  recurringChecked = true;
  if (!state.recurring?.length) return 0;
  let posted = 0;
  state.recurring.forEach(r => {
    if (!r.active || !r.nextDue) return;
    let safety = 0;
    while (r.nextDue <= todayISO && safety < 24) {
      safety++;
      state.transactions.push({
        id: 'tx_auto_' + Date.now() + '_' + (Math.random()*99999|0),
        date: r.nextDue,
        type: r.type,
        amount: r.amount,
        description: r.name,
        categoryId: r.categoryId||'',
        subcategoryId: r.subcategoryId||'',
        accountId: r.accountId||'',
        notes: 'Auto-posted'
      });
      const acct = findAccount(r.accountId);
      if (acct) adjustAccount(r.accountId, r.type, r.amount, +1);
      r.lastPosted = r.nextDue;
      r.nextDue = advanceDue(r.nextDue, r.frequency);
      posted++;
    }
  });
  if (posted > 0) { recAutoPostedCount = posted; save(); }
  return posted;
}

function computeGoalSaved(g) {
  const manual = (g.deposits||[]).reduce((s,d)=>s+d.amount,0);
  let auto = 0;
  if (g.linkedCategoryId) {
    auto = state.transactions
      .filter(t=>t.categoryId===g.linkedCategoryId && (!g.linkedSubcategoryId||t.subcategoryId===g.linkedSubcategoryId))
      .reduce((s,t)=>s+t.amount,0);
  }
  return { manual, auto, total:manual+auto };
}

// ── Dashboard data: auto-calculate from transactions if available ──
function getMonthlyData() {
  const yr = now.getFullYear(), mo = now.getMonth();
  const fallbackMonthly = { avgMonthlyExpenses: state.monthly?.avgMonthlyExpenses||0, categories: state.monthly?.categories||[] };
  const monthTx = (state.transactions||[]).filter(t => {
    const d = new Date(t.date + 'T00:00:00');
    return d.getFullYear()===yr && d.getMonth()===mo;
  });
  if (monthTx.length === 0) return { income:0, expenses:0, label: currentMonthLabel, ...fallbackMonthly };

  const income   = monthTx.filter(t=>t.type==='income').reduce((s,t)=>s+t.amount, 0);
  const expenses = monthTx.filter(t=>t.type==='expense').reduce((s,t)=>s+t.amount, 0);
  const catMap = {};
  monthTx.filter(t=>t.type==='expense').forEach(t => {
    if (!t.categoryId) return;
    catMap[t.categoryId] = (catMap[t.categoryId]||0) + t.amount;
  });
  const palette = ['#6366f1','#f59e0b','#10b981','#3b82f6','#ec4899','#8b5cf6','#06b6d4'];
  const topCats = Object.entries(catMap)
    .sort((a,b)=>b[1]-a[1]).slice(0,5)
    .map(([cid,amt],i) => {
      const cat = state.categories.find(c=>c.id===cid);
      return { id:'mc_'+cid, name:cat?.name||'Other', icon:cat?.icon||'❓', amount:Math.round(amt), color:palette[i]||'#6b7280' };
    });
  return { ...fallbackMonthly, label: currentMonthLabel, income, expenses, categories: topCats.length ? topCats : fallbackMonthly.categories };
}

function editable(value, path, formatter) {
  const disp = (value===0) ? '—' : (formatter?formatter(value):value);
  return `<span class="editable px-1" data-path="${path}" data-val="${value}">${disp}</span>`;
}
function attachEdits() {
  document.querySelectorAll('[data-path]').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const path = el.dataset.path;
      const inp = document.createElement('input');
      inp.type='number'; inp.step='0.01'; inp.value=parseFloat(el.dataset.val); inp.className='editable-input';
      el.replaceWith(inp); inp.focus(); inp.select();
      const commit = () => { const v=parseFloat(inp.value); if(!isNaN(v)) setPath(path,v); render(); };
      inp.addEventListener('blur', commit);
      inp.addEventListener('keydown', ev => { if(ev.key==='Enter') commit(); if(ev.key==='Escape') render(); });
    });
  });
}
function setPath(path, val) {
  const [col,...rest] = path.split('.');
  if (col==='accounts') {
    const [id,field]=rest; const item=state.accounts.find(x=>x.id===id); if(item) item[field]=val;
  } else if (col==='creditCards') {
    const [id,field]=rest; const item=state.creditCards.find(x=>x.id===id); if(item) item[field]=val;
  } else if (col==='monthly') {
    const [field,id,prop]=rest;
    if (!state.monthly) state.monthly = { avgMonthlyExpenses:0, categories:[] };
    if (field==='categories') { const item=(state.monthly.categories||[]).find(x=>x.id===id); if(item) item[prop]=val; }
    else state.monthly[field]=val;
  } else if (col==='goals') {
    const [id,field]=rest; const item=state.goals.find(x=>x.id===id); if(item) item[field]=val;
  }
  save();
}
