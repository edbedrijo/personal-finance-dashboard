// ═══════════════════════════════════════════════════════
// SUPABASE
// ═══════════════════════════════════════════════════════
const SUPABASE_URL  = 'https://qeknfilbfaojsiiguraf.supabase.co';
const SUPABASE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFla25maWxiZmFvanNpaWd1cmFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NDk1NjIsImV4cCI6MjA5NTUyNTU2Mn0.2kl_jyfxAAbDmmOE89XMI1BcQ3bdCZYvzIbNtexoXx8';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let currentUser = null;
let syncTimeout = null;
let isLoading   = true; // true until initAuth() resolves


// ── Theme (light default / dark) — device preference, stored locally, not synced ──
const THEME_KEY = 'pf_theme';
(function initTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)')?.matches;
  document.documentElement.dataset.theme = saved || (prefersDark ? 'dark' : 'light');
})();
window.toggleTheme = () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem(THEME_KEY, next); } catch(e) {}
  render(); // refresh theme-dependent labels (e.g. the toggle button itself)
};

// ── PH bank / e-wallet brand registry — matched against account names.
// Monogram badges in official brand colors (no logo CDN carries PH banks reliably).
const PH_BRANDS = [
  { abbr:'UB',   match:['unionbank','union bank'],        color:'#f26522' },
  { abbr:'BPI',  match:['bpi'],                           color:'#b11116' },
  { abbr:'BDO',  match:['bdo'],                           color:'#0038a8' },
  { abbr:'MBT',  match:['metrobank','metro bank'],        color:'#0055a5' },
  { abbr:'SB',   match:['security bank','securitybank'],  color:'#007a33' },
  { abbr:'LBP',  match:['landbank','land bank'],          color:'#00703c' },
  { abbr:'PNB',  match:['pnb','philippine national bank'],color:'#003da5' },
  { abbr:'RCBC', match:['rcbc'],                          color:'#003b71' },
  { abbr:'CBC',  match:['chinabank','china bank'],        color:'#c8102e' },
  { abbr:'EW',   match:['eastwest','east west'],          color:'#5c2d91' },
  { abbr:'PSB',  match:['psbank'],                        color:'#00539f' },
  { abbr:'DBP',  match:['dbp'],                           color:'#0072bc' },
  { abbr:'G',    match:['gcash'],                         color:'#007dfe' },
  { abbr:'M',    match:['maya','paymaya'],                color:'#00a75c' },
  { abbr:'MARI', match:['maribank','mari bank'],          color:'#00b14f' },
  { abbr:'SEA',  match:['seabank','sea bank'],            color:'#ee4d2d' },
  { abbr:'GT',   match:['gotyme','go tyme'],              color:'#00a5a8' },
  { abbr:'CIMB', match:['cimb'],                          color:'#ed1c24' },
  { abbr:'TNK',  match:['tonik'],                         color:'#7a28ff' },
  { abbr:'KMO',  match:['komo'],                          color:'#0057ff' },
];
const brandFor = name => {
  const n = (name||'').toLowerCase();
  return PH_BRANDS.find(b => b.match.some(m => n.includes(m))) || null;
};
// Fills its parent tile (parent needs fixed size + border-radius); falls back to emoji
const brandBadge = (name, fallback) => {
  const b = brandFor(name);
  if (!b) return fallback;
  const fs = b.abbr.length >= 4 ? 8 : b.abbr.length === 3 ? 11 : 14;
  const ls = b.abbr.length >= 4 ? '0' : '0.03em';
  return `<span style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;border-radius:inherit;background:${b.color};color:#fff;font-size:${fs}px;font-weight:800;letter-spacing:${ls};line-height:1">${b.abbr}</span>`;
};

// ── Net-worth privacy toggle (device preference, not synced) ──
let hideNetWorth = false;
try { hideNetWorth = localStorage.getItem('pf_hide_nw') === '1'; } catch(e) {}
window.toggleNetWorth = () => {
  hideNetWorth = !hideNetWorth;
  try { localStorage.setItem('pf_hide_nw', hideNetWorth ? '1' : '0'); } catch(e) {}
  render();
};
const maskAmt = v => hideNetWorth ? '₱ ••••••' : v;

const STORAGE_KEY = 'pf_v2';
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const now = new Date();
const currentMonthLabel = MONTHS[now.getMonth()] + ' ' + now.getFullYear();
// Local-timezone ISO date. Never use toISOString() for calendar dates — it converts
// to UTC, which shifts dates back a day in UTC+8 (Philippines).
const toLocalISO = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const todayISO = toLocalISO(now);

// ═══════════════════════════════════════════════════════
// DEFAULT CATEGORIES
// ═══════════════════════════════════════════════════════
const defaultCategories = [
  { id:'c1',  name:'Housing',               icon:'🏠', type:'expense', active:true,  subs:[{id:'s1',name:'Rent',active:true},{id:'s2',name:'Mortgage',active:true},{id:'s3',name:'HOA/Condo Dues',active:true},{id:'s4',name:'House Maintenance',active:true},{id:'s5',name:'Home Improvement',active:true}]},
  { id:'c2',  name:'Food',                  icon:'🍚', type:'expense', active:true,  subs:[{id:'s10',name:'Groceries',active:true},{id:'s11',name:'Dining Out',active:true},{id:'s12',name:'Fast Food',active:true},{id:'s13',name:'Coffee Shops',active:true},{id:'s14',name:'Food Delivery',active:true}]},
  { id:'c3',  name:'Transportation',        icon:'🚗', type:'expense', active:true,  subs:[{id:'s20',name:'Fuel',active:true},{id:'s21',name:'Car Maintenance/Repairs',active:true},{id:'s22',name:'Car Insurance',active:true},{id:'s23',name:'Public Transit',active:true},{id:'s24',name:'Parking',active:true},{id:'s25',name:'Grab/Uber',active:true}]},
  { id:'c4',  name:'Utilities',             icon:'⚡', type:'expense', active:true,  subs:[{id:'s30',name:'Electricity',active:true},{id:'s31',name:'Water',active:true},{id:'s32',name:'Internet (Starlink)',active:true},{id:'s33',name:'Mobile Phone',active:true},{id:'s34',name:'Cable/Streaming',active:true}]},
  { id:'c5',  name:'Healthcare',            icon:'💊', type:'expense', active:true,  subs:[{id:'s40',name:'Doctor Visits',active:true},{id:'s41',name:'Dental Care',active:true},{id:'s42',name:'Prescription Meds',active:true},{id:'s43',name:'Vitamins',active:true},{id:'s44',name:'Hospital Bills',active:true},{id:'s45',name:'Life Insurance',active:true},{id:'s46',name:'Health Insurance',active:true}]},
  { id:'c6',  name:'Personal Care',         icon:'💆', type:'expense', active:true,  subs:[{id:'s50',name:'Haircut/Salon',active:true},{id:'s51',name:'Gym',active:true},{id:'s52',name:'Skincare',active:true},{id:'s53',name:'Hygiene Products',active:true},{id:'s54',name:'Massage',active:true},{id:'s55',name:'Laundry',active:true}]},
  { id:'c7',  name:'People & Support',      icon:'👨‍👩‍👧', type:'expense', active:true,  subs:[{id:'s60',name:'Wife Expenses',active:true},{id:'s61',name:'Parents Support',active:true},{id:'s62',name:'Siblings',active:true},{id:'s63',name:'Extended Family',active:true},{id:'s64',name:'Helper Salary',active:true}]},
  { id:'c8',  name:'Pets',                  icon:'🐱', type:'expense', active:true,  subs:[{id:'s70',name:'Pet Food',active:true},{id:'s71',name:'Vet/Check-up',active:true},{id:'s72',name:'Grooming',active:true},{id:'s73',name:'Pet Supplies',active:true},{id:'s74',name:'Cat Litter',active:true}]},
  { id:'c9',  name:'Shopping',              icon:'🛍️', type:'expense', active:true,  subs:[{id:'s80',name:'Shopee/Lazada/TikTok',active:true},{id:'s81',name:'Clothes & Shoes',active:true},{id:'s82',name:'Electronics',active:true},{id:'s83',name:'Household Items',active:true}]},
  { id:'c10', name:'Entertainment',         icon:'🎬', type:'expense', active:true,  subs:[{id:'s90',name:'Subscriptions',active:true},{id:'s91',name:'Movies/Events',active:true},{id:'s92',name:'Hobbies',active:true},{id:'s93',name:'Games',active:true}]},
  { id:'c11', name:'Travel',                icon:'✈️', type:'expense', active:true,  subs:[{id:'s100',name:'Flights',active:true},{id:'s101',name:'Accommodation',active:true},{id:'s102',name:'Activities/Tours',active:true},{id:'s103',name:'Travel Food',active:true},{id:'s104',name:'Travel Misc',active:true}]},
  { id:'c12', name:'Business Expenses',     icon:'💼', type:'expense', active:true,  subs:[{id:'s110',name:'Outsourcing/Payroll',active:true},{id:'s111',name:'Software & Tools',active:true},{id:'s112',name:'Marketing/Ads',active:true},{id:'s113',name:'Domain/Hosting',active:true}]},
  { id:'c13', name:'Savings & Investments', icon:'💰', type:'expense', active:true,  subs:[{id:'s120',name:'Car Downpayment',active:true},{id:'s121',name:'Emergency Fund',active:true},{id:'s122',name:'Savings Transfer',active:true}]},
  { id:'c14', name:'Miscellaneous',         icon:'❓', type:'expense', active:true,  subs:[{id:'s130',name:'Uncategorized',active:true},{id:'s131',name:'Gifts',active:true},{id:'s132',name:'Church/Offerings',active:true},{id:'s133',name:'Charity',active:true},{id:'s134',name:'Others',active:true}]},
  { id:'c15', name:'Freelance',             icon:'💻', type:'income',  active:true,  subs:[{id:'s140',name:'Upwork',active:true},{id:'s141',name:'Direct Client',active:true}]},
  { id:'c16', name:'Business',              icon:'📈', type:'income',  active:true,  subs:[{id:'s150',name:'Brickell Ads',active:true},{id:'s151',name:'Other Business',active:true}]},
  { id:'c17', name:'Passive Income',        icon:'🏦', type:'income',  active:false, subs:[{id:'s160',name:'Investments',active:true},{id:'s161',name:'Interest',active:true},{id:'s162',name:'Dividends',active:true}]},
  { id:'c18', name:'Other Income',          icon:'🎁', type:'income',  active:true,  subs:[{id:'s170',name:'Refunds',active:true},{id:'s171',name:"Wife's Share",active:true},{id:'s172',name:'Loan Repayments',active:true},{id:'s173',name:'Received Gifts',active:true}]},
];

// ═══════════════════════════════════════════════════════
// DEFAULT TRANSACTIONS — May 2026 pre-loaded from Google Sheets
// ═══════════════════════════════════════════════════════
const defaultTransactions = [];

// ═══════════════════════════════════════════════════════
// DEFAULT STATE — truly empty for new users
// ═══════════════════════════════════════════════════════
const defaultState = {
  accounts:     [],
  creditCards:  [],
  recurring:    [],
  goals:        [],
  forecastDays: 7,
  categories:   defaultCategories,
  transactions: [],
};

// ═══════════════════════════════════════════════════════
// STATE MIGRATION (reused for localStorage + Supabase)
// ═══════════════════════════════════════════════════════
function migrateState(p) {
  if (!p.categories)              p.categories   = JSON.parse(JSON.stringify(defaultCategories));
  if (!Array.isArray(p.transactions)) p.transactions = [];
  if (!Array.isArray(p.accounts))     p.accounts     = [];
  if (!Array.isArray(p.creditCards))  p.creditCards  = [];
  if (!Array.isArray(p.recurring))    p.recurring    = [];
  if (!Array.isArray(p.goals))        p.goals        = [];
  if (p.transactions) p.transactions.forEach(t => { if (t.toAccountId===undefined) t.toAccountId=''; });
  if (p.accounts) p.accounts.forEach(a => {
    if (!a.type) a.type = ['gcash','maya'].includes(a.id) ? 'ewallet' : a.id==='cash' ? 'cash' : 'bank';
    if (!a.icon) a.icon = a.type==='bank' ? '🏦' : a.type==='ewallet' ? '📱' : '💵';
    if (a.maintainingBalance===undefined) a.maintainingBalance=0;
  });
  if (p.creditCards) p.creditCards.forEach(c => { if (!c.icon) c.icon = '💳'; if (c.lastStatement===undefined) c.lastStatement=0; if (c.maintainingBalance===undefined) c.maintainingBalance=0; if (c.cutoffDay===undefined) c.cutoffDay = c.cycleStartDay ? Math.max(1,c.cycleStartDay-1) : 22; delete c.cycleStartDay; if (c.minDue===undefined) c.minDue=0; });
  if (p.recurring) p.recurring.forEach(r => {
    if (r.dueDay !== undefined && !r.frequency) {
      r.frequency = 'monthly'; r.active = true;
      const dd = String(r.dueDay).padStart(2,'0');
      const thisM = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${dd}`;
      const nx = new Date(now.getFullYear(), now.getMonth()+1, r.dueDay);
      r.nextDue = (todayISO <= thisM) ? thisM : toLocalISO(nx);
      r.categoryId = r.categoryId||''; r.subcategoryId = r.subcategoryId||'';
      r.accountId = r.accountId||''; r.lastPosted = null;
      delete r.dueDay; delete r.variable;
    }
    if (r.active===undefined) r.active=true;
    const recCatMap = {
      r1:{c:'c1',s:'s1'}, r2:{c:'c4',s:'s32'}, r3:{c:'c7',s:'s61'},
      r4:{c:'c7',s:'s64'}, r5:{c:'c14',s:'s130'}, r6:{c:'c15',s:'s140'}, r7:{c:'c16',s:'s150'}
    };
    if (recCatMap[r.id] && !r.categoryId) { r.categoryId=recCatMap[r.id].c; r.subcategoryId=recCatMap[r.id].s; }
  });
  if (p.goals) p.goals.forEach(g => {
    if (!g.deposits) {
      g.deposits = (g.saved>0) ? [{id:'d_init_'+g.id, date:todayISO, amount:g.saved||0, note:'Initial balance'}] : [];
      delete g.saved;
    }
    if (g.linkedCategoryId===undefined)    g.linkedCategoryId='';
    if (g.linkedSubcategoryId===undefined) g.linkedSubcategoryId='';
    delete g.status;
  });
  // Fix legacy CC payment transactions recorded as expense — should be transfer
  if (p.transactions) p.transactions.forEach(t => {
    if (t.notes === 'CC payment' && t.type === 'expense') t.type = 'transfer';
  });
  return p;
}

// State starts empty — filled by loadFromSupabase after auth resolves
// localStorage is only used as an offline cache keyed by user_id
let state = JSON.parse(JSON.stringify(defaultState));

const save = () => {
  const lsKey = currentUser ? STORAGE_KEY + '_' + currentUser.id : STORAGE_KEY;
  try { localStorage.setItem(lsKey, JSON.stringify(state)); } catch(e) {}
  // Debounced Supabase sync — waits 1.5s after last change before writing
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(async () => {
    if (!currentUser) return;
    try {
      // Supabase returns { error } instead of throwing — must check it explicitly
      const { error } = await sb.from('finance_state').upsert({
        user_id: currentUser.id,
        state: state,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
      showSyncIndicator(error ? '⚠ Sync failed' : '✓ Synced');
    } catch(e) { showSyncIndicator('⚠ Offline'); }
  }, 1500);
};
