// ═══════════════════════════════════════════════════════
// UI STATE
// ═══════════════════════════════════════════════════════
let currentView = 'dashboard';
let catUI  = { tab:'expense', expanded:null, showModal:false };
let txUI   = { typeFilter:'all', range:makeRange('thisMonth'), showModal:false, showRange:false, deleteId:null, editId:null };
let acctUI = { showAddAcct:false, addType:'bank', editAcctId:null, deleteAcctId:null, showAddCC:false, editCCId:null, deleteCCId:null, paymentCCId:null };
let goalUI = { tab:'goals', showAddGoal:false, editGoalId:null, deleteGoalId:null, depositGoalId:null, expandedGoalId:null, deleteDepositKey:null,
               showAddLoan:false, editLoanId:null, deleteLoanId:null, paymentLoanId:null, expandedLoanId:null, deleteLoanPaymentKey:null };
let recUI  = { showAddRec:false, editRecId:null, deleteRecId:null };
let assetUI = { showAddAsset:false, editAssetId:null, deleteAssetId:null };
let insUI  = { range:makeRange('thisMonth'), showRange:false, trendCatId:'' };
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
// Non-cash assets (car, property) — count toward net worth but NOT spendable.
const assetsValue    = () => (state.assets||[]).reduce((s,a)=>s+(a.value||0),0);
const spendableAssets= () => state.accounts.reduce((s,a)=>s+(a.balance-(a.maintainingBalance||0)),0);
const totalLiab      = () => state.creditCards.reduce((s,c)=>s+c.outstanding,0)
                           + state.loans.reduce((s,l)=>s+loanTotals(l).remainingPrincipal,0);
const netWorth       = () => totalAssets()+assetsValue()-totalLiab();
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
  const total = (g.deposits||[]).reduce((s,d)=>s+d.amount,0);
  return { total };
}

// ── Loan math — PH add-on/factor-rate style ──
// Interest each month = monthlyRate% of the ORIGINAL principal (flat), so the
// default payment is principal/term + that flat interest. The bank's "effective
// interest rate p.a." (EIR) is higher than monthlyRate×12 because you keep
// paying interest on the full principal even as the balance shrinks.
function loanTotals(l) {
  const monthlyInterest = l.principal * (l.monthlyRate||0) / 100;
  const defaultPayment  = (l.termMonths>0 ? l.principal/l.termMonths : 0) + monthlyInterest;
  const monthlyPayment  = l.monthlyPayment || defaultPayment;
  const totalPayable    = monthlyPayment * (l.termMonths||0);
  const totalInterest   = Math.max(totalPayable - l.principal, 0);
  const paid            = (l.payments||[]).reduce((s,p)=>s+p.amount,0);
  const remaining       = Math.max(totalPayable - paid, 0);
  // Remaining PRINCIPAL (what you'd owe to clear the loan today, excluding
  // future interest) — split each payment proportionally into principal/interest.
  // At disbursement (paid=0) this equals the full principal, so net worth stays
  // neutral when the borrowed cash lands in an account.
  const remainingPrincipal = totalPayable>0 ? l.principal * (remaining/totalPayable) : 0;
  // Epsilon guards float noise (e.g. 35.0000003 must not round up to 36)
  const paymentsLeft    = monthlyPayment>0 ? Math.min(l.termMonths||0, Math.ceil(remaining/monthlyPayment - 1e-7)) : 0;
  const pctPaid         = totalPayable>0 ? Math.min((paid/totalPayable)*100,100) : 0;
  return { monthlyInterest, defaultPayment, monthlyPayment, totalPayable, totalInterest,
           interestPct: l.principal>0 ? (totalInterest/l.principal)*100 : 0,
           paid, remaining, remainingPrincipal, paymentsLeft, pctPaid };
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
  const palette = ['var(--accent)','var(--amber)','var(--green-strong)','#3b82f6','#ec4899','#8b5cf6','#06b6d4'];
  const topCats = Object.entries(catMap)
    .sort((a,b)=>b[1]-a[1]).slice(0,5)
    .map(([cid,amt],i) => {
      const cat = state.categories.find(c=>c.id===cid);
      return { id:'mc_'+cid, name:cat?.name||'Other', icon:cat?.icon||'❓', amount:Math.round(amt), color:palette[i]||'var(--text-3)' };
    });
  return { ...fallbackMonthly, label: currentMonthLabel, income, expenses, categories: topCats.length ? topCats : fallbackMonthly.categories };
}

// ── Date-range presets (shared by Transactions + Insights filters) ──
const RANGE_PRESETS = [
  ['thisWeek','This week'], ['lastWeek','Last week'],
  ['last7','Last 7 days'],  ['last30','Last 30 days'],
  ['thisMonth','This month'], ['lastMonth','Last month'],
  ['thisYear','This year'], ['all','All time'],
];
function rangeFromPreset(p) {
  const t = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dow = t.getDay(); // 0 = Sunday (week starts Sunday, PH convention)
  const d = (base, offset) => { const x = new Date(base); x.setDate(base.getDate() + offset); return x; };
  switch (p) {
    case 'thisWeek':  return { start: toLocalISO(d(t, -dow)), end: toLocalISO(t) };
    case 'lastWeek': { const s = d(t, -dow - 7); return { start: toLocalISO(s), end: toLocalISO(d(s, 6)) }; }
    case 'last7':     return { start: toLocalISO(d(t, -6)),  end: toLocalISO(t) };
    case 'last30':    return { start: toLocalISO(d(t, -29)), end: toLocalISO(t) };
    case 'thisMonth': return { start: toLocalISO(new Date(t.getFullYear(), t.getMonth(), 1)),     end: toLocalISO(new Date(t.getFullYear(), t.getMonth() + 1, 0)) };
    case 'lastMonth': return { start: toLocalISO(new Date(t.getFullYear(), t.getMonth() - 1, 1)), end: toLocalISO(new Date(t.getFullYear(), t.getMonth(), 0)) };
    case 'thisYear':  return { start: toLocalISO(new Date(t.getFullYear(), 0, 1)),  end: toLocalISO(new Date(t.getFullYear(), 11, 31)) };
    case 'lastYear':  return { start: toLocalISO(new Date(t.getFullYear() - 1, 0, 1)), end: toLocalISO(new Date(t.getFullYear() - 1, 11, 31)) };
    default:          return { start: '0000-01-01', end: '9999-12-31' }; // all time
  }
}
function makeRange(preset) { return { preset, ...rangeFromPreset(preset) }; }
function rangeLabel(r) {
  if (r.preset === 'custom') return fmtDateShort(r.start) + ' – ' + fmtDate(r.end);
  return (RANGE_PRESETS.find(x => x[0] === r.preset) || ['','Custom'])[1];
}
function inRange(t, r) { return r.preset === 'all' || (t.date >= r.start && t.date <= r.end); }

// ── Insights data ──
// Income/expense totals per month for the last n months (transfers excluded
// by type, so CC payments never count as spending)
function insightsMonthly(n = 6) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yr = d.getFullYear(), mo = d.getMonth();
    let inc = 0, exp = 0;
    (state.transactions || []).forEach(t => {
      const td = new Date(t.date + 'T00:00:00');
      if (td.getFullYear() !== yr || td.getMonth() !== mo) return;
      if (t.type === 'income') inc += t.amount;
      else if (t.type === 'expense') exp += t.amount;
    });
    out.push({ label: MONTHS[mo].slice(0,3) + (mo === 0 || i === n-1 ? ' ' + String(yr).slice(2) : ''), inc, exp });
  }
  return out;
}

// Category breakdown for a date range — expenses ("where it goes")
// or income ("where it comes from")
function insightsCategories(range, type = 'expense') {
  const map = {};
  let total = 0;
  (state.transactions || []).forEach(t => {
    if (t.type !== type || !inRange(t, range)) return;
    const key = t.categoryId || '_none';
    map[key] = (map[key] || 0) + t.amount;
    total += t.amount;
  });
  const rows = Object.entries(map).map(([cid, amt]) => {
    const c = state.categories.find(x => x.id === cid);
    return { name: c ? `${c.icon} ${c.name}` : '❓ Uncategorized', amt };
  }).sort((a, b) => b.amt - a.amt);
  return { rows, total, label: rangeLabel(range) };
}

// Monthly spend for one expense category over the last n months
function insightsCategoryTrend(catId, n = 6) {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const yr = d.getFullYear(), mo = d.getMonth();
    let sum = 0;
    (state.transactions || []).forEach(t => {
      if (t.type !== 'expense' || t.categoryId !== catId) return;
      const td = new Date(t.date + 'T00:00:00');
      if (td.getFullYear() === yr && td.getMonth() === mo) sum += t.amount;
    });
    out.push({ label: MONTHS[mo].slice(0,3), amt: sum });
  }
  return out;
}

// Expense category with the highest all-time spend — default for the trend chart
function topSpendCategoryId() {
  const map = {};
  (state.transactions || []).forEach(t => {
    if (t.type === 'expense' && t.categoryId) map[t.categoryId] = (map[t.categoryId] || 0) + t.amount;
  });
  return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
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
