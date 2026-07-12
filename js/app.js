// ═══════════════════════════════════════════════════════
// AUTH + SYNC
// ═══════════════════════════════════════════════════════
function renderLoadingScreen() {
  return `<div style="min-height:80vh;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px">
    <div style="width:40px;height:40px;border:3px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:spin 0.8s linear infinite"></div>
    <div style="color:var(--text-3);font-size:14px">Loading your data...</div>
    <style>@keyframes spin{to{transform:rotate(360deg)}}</style>
  </div>`;
}

// ── Export transactions as CSV ──
window.exportCSV = () => {
  const headers = ['Date','Description','Type','Amount','Category','Subcategory','Account','Notes'];
  const rows = state.transactions.map(t => {
    const cat    = state.categories.find(c=>c.id===t.categoryId);
    const subcat = cat?.subs?.find(s=>s.id===t.subcategoryId);
    const acct   = findAccount(t.accountId);
    const esc    = v => `"${String(v||'').replace(/"/g,'""')}"`;
    return [t.date, esc(t.description), t.type, t.amount, esc(cat?.name||''), esc(subcat?.name||''), esc(acct?.name||''), esc(t.notes||'')].join(',');
  });
  const csv  = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href=url; a.download=`transactions-${todayISO}.csv`; a.click();
  URL.revokeObjectURL(url);
};

// ── Export full backup as JSON ──
window.exportData = () => {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type:'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a'); a.href=url; a.download=`finance-backup-${todayISO}.json`; a.click();
  URL.revokeObjectURL(url);
};

// ── Simple CSV parser (handles quoted fields) ──
function parseCSV(text) {
  const lines = text.replace(/\r\n/g,'\n').replace(/\r/g,'\n').split('\n').filter(l=>l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h=>h.trim().toLowerCase().replace(/^"|"$/g,''));
  return lines.slice(1).map(line => {
    const vals = []; let cur='', inQ=false;
    for (let i=0;i<line.length;i++) {
      const ch=line[i];
      if (ch==='"' && !inQ) { inQ=true; continue; }
      if (ch==='"' && inQ && line[i+1]==='"') { cur+='"'; i++; continue; }
      if (ch==='"' && inQ) { inQ=false; continue; }
      if (ch===',' && !inQ) { vals.push(cur.trim()); cur=''; continue; }
      cur+=ch;
    }
    vals.push(cur.trim());
    const row={};
    headers.forEach((h,i)=>{ row[h]=vals[i]||''; });
    return row;
  });
}

// ── Import from CSV file ──
window.importCSV = () => {
  const input = document.createElement('input');
  input.type='file'; input.accept='.csv,text/csv';
  input.onchange = e => {
    const file=e.target.files[0]; if (!file) return;
    const reader=new FileReader();
    reader.onload = ev => {
      try {
        const rows = parseCSV(ev.target.result);
        if (!rows.length) { setImportStatus('✗ File is empty or has no data rows.','var(--red)'); return; }
        // Validate required columns
        const required = ['date','description','type','amount'];
        const missing  = required.filter(h=>!(h in rows[0]));
        if (missing.length) { setImportStatus(`✗ Missing columns: ${missing.join(', ')}. See format guide below.`,'var(--red)'); return; }

        let added=0, skipped=0;
        rows.forEach(row => {
          const date   = row['date']?.trim();
          const desc   = row['description']?.trim();
          const type   = (row['type']?.trim()||'expense').toLowerCase();
          const amount = parseFloat(row['amount']?.replace(/[^0-9.]/g,''));
          if (!date||!desc||isNaN(amount)||amount<=0) { skipped++; return; }
          if (!['expense','income','transfer'].includes(type)) { skipped++; return; }

          // Match category by name (case-insensitive)
          const catName = row['category']?.trim().toLowerCase();
          const subName = row['subcategory']?.trim().toLowerCase();
          const cat     = catName ? state.categories.find(c=>c.name.toLowerCase()===catName) : null;
          const subcat  = (cat&&subName) ? cat.subs?.find(s=>s.name.toLowerCase()===subName) : null;

          // Match account by name (case-insensitive), fallback to first account
          const acctName = row['account']?.trim().toLowerCase();
          const acct     = acctName ? state.accounts.find(a=>a.name.toLowerCase()===acctName) : null;
          const accountId= acct?.id || state.accounts[0]?.id || '';

          state.transactions.push({
            id:'tx_csv_'+Date.now()+'_'+Math.random().toString(36).slice(2,6),
            date, description:desc, type, amount,
            categoryId:cat?.id||'', subcategoryId:subcat?.id||'',
            accountId, toAccountId:'', notes:row['notes']?.trim()||''
          });
          added++;
        });

        if (added===0) { setImportStatus(`✗ No valid rows found. Check your column names and values.`,'var(--red)'); return; }
        save();
        setImportStatus(`✓ Imported ${added} transactions${skipped?` (${skipped} skipped — invalid rows)`:''}.`,'var(--green)');
        setTimeout(()=>{ currentView='transactions'; render(); }, 1500);
      } catch(err) {
        setImportStatus('✗ Could not parse file. Make sure it is a valid CSV.','var(--red)');
      }
    };
    reader.readAsText(file);
  };
  input.click();
};

// ── Import full backup from JSON ──
window.importData = () => {
  const input = document.createElement('input');
  input.type='file'; input.accept='.json,application/json';
  input.onchange = e => {
    const file=e.target.files[0]; if (!file) return;
    const reader=new FileReader();
    reader.onload = async ev => {
      try {
        state = migrateState(JSON.parse(ev.target.result));
        save();
        setImportStatus('✓ Backup restored successfully!','var(--green)');
        setTimeout(()=>render(), 1200);
      } catch(err) { setImportStatus('✗ Invalid file.','var(--red)'); }
    };
    reader.readAsText(file);
  };
  input.click();
};

function setImportStatus(msg, color) {
  const el = document.getElementById('import-status');
  if (el) { el.textContent=msg; el.style.color=color||'var(--green)'; }
}



function showSyncIndicator(msg) {
  let el = document.getElementById('sync-indicator');
  if (!el) return;
  el.textContent = msg;
  el.style.opacity = '1';
  setTimeout(() => { el.style.opacity = '0'; }, 2500);
}

async function loadFromSupabase(user) {
  const lsKey = STORAGE_KEY + '_' + user.id;
  try {
    const { data, error } = await sb.from('finance_state').select('state').eq('user_id', user.id).single();
    if (data?.state && Object.keys(data.state).length > 0) {
      // Existing user — load their data
      state = migrateState(data.state);
      try { localStorage.setItem(lsKey, JSON.stringify(state)); } catch(e) {}
    } else {
      // Brand new user — start with a clean empty state
      state = JSON.parse(JSON.stringify(defaultState));
      // Save their fresh state to Supabase so they have a row
      try {
        await sb.from('finance_state').upsert({
          user_id: user.id, state, updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      } catch(e) {}
    }
  } catch(e) {
    // Offline — try this user's localStorage cache
    try {
      const cached = localStorage.getItem(lsKey);
      if (cached) state = migrateState(JSON.parse(cached));
      else state = JSON.parse(JSON.stringify(defaultState));
    } catch(e2) { state = JSON.parse(JSON.stringify(defaultState)); }
  }
}

window.signInWithGoogle = async () => {
  // Detect in-app browsers (Messenger, Instagram, Facebook, TikTok, etc.)
  const ua = navigator.userAgent || '';
  const isInApp = /FBAN|FBAV|Instagram|Messenger|Line|Twitter|TikTok|MicroMessenger/i.test(ua);
  if (isInApp) {
    document.getElementById('inapp-warning').style.display = '';
    return;
  }
  const btn = document.getElementById('google-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Redirecting...'; }
  // Use clean origin URL — avoids hash/query param issues that cause Google 400
  const redirectTo = window.location.origin + window.location.pathname;
  await sb.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo }
  });
};

window.signOut = async () => {
  const lsKey = currentUser ? STORAGE_KEY + '_' + currentUser.id : STORAGE_KEY;
  await sb.auth.signOut();
  state = JSON.parse(JSON.stringify(defaultState));
  try { localStorage.removeItem(lsKey); } catch(e) {}
  currentUser = null;
  render();
};

function renderLoginScreen() {
  return `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;margin:-2rem -1.25rem">
      <div style="width:100%;max-width:360px;text-align:center">

        <div style="font-size:60px;margin-bottom:20px;line-height:1">💰</div>
        <div style="font-size:28px;font-weight:700;color:var(--text);margin-bottom:10px;letter-spacing:-0.02em">Personal Finance</div>
        <div style="color:var(--text-2);font-size:14px;margin-bottom:40px;line-height:2">Track your money.<br>Reach your budget goals.<br>Synced everywhere.</div>

        <button id="google-btn" onclick="signInWithGoogle()"
          style="width:100%;padding:15px 20px;border-radius:14px;background:#fff;border:1.5px solid var(--card-border);box-shadow:3px 4px 0 var(--card-shadow);cursor:pointer;
                 display:flex;align-items:center;justify-content:center;gap:12px;font-size:15px;font-weight:600;
                 color:#1f2937;box-shadow:0 4px 24px rgba(0,0,0,0.4);transition:transform 0.12s ease,box-shadow 0.12s ease,opacity 0.12s ease;font-family:inherit"
          onmouseover="this.style.transform='scale(1.02)';this.style.boxShadow='0 6px 28px rgba(0,0,0,0.5)'"
          onmouseout="this.style.transform='scale(1)';this.style.boxShadow='0 4px 24px rgba(0,0,0,0.4)'">
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        <div id="inapp-warning" style="display:none;margin-top:16px;background:var(--surface);border:1px solid var(--amber);border-radius:12px;padding:14px 16px;text-align:left">
          <div style="color:var(--amber);font-weight:600;font-size:13px;margin-bottom:6px">⚠️ Open in Safari or Chrome</div>
          <div style="color:var(--text-2);font-size:12px;line-height:1.6">Google login doesn't work inside Messenger or other in-app browsers.<br><br>
            Copy this link and open it in <strong style="color:var(--text-2)">Safari</strong> or <strong style="color:var(--text-2)">Chrome</strong>:
          </div>
          <div style="margin-top:10px;background:var(--surface2);border-radius:8px;padding:10px;font-size:11px;color:var(--accent);word-break:break-all;font-family:monospace">${window.location.origin}</div>
          <button onclick="navigator.clipboard?.writeText(window.location.origin).then(()=>{this.textContent='✓ Copied!';setTimeout(()=>this.textContent='Copy Link',2000)})"
            style="margin-top:10px;width:100%;padding:10px;border-radius:8px;background:var(--accent);border:1px solid var(--card-border);color:var(--on-accent);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Copy Link</button>
        </div>

        <div style="margin-top:20px;color:var(--text-3);font-size:12px">🔒 Your data is private and encrypted</div>
      </div>
    </div>`;
}

// Auth header pill shown when logged in
function renderUserPill() {
  if (!currentUser) return '';
  const name = currentUser.user_metadata?.full_name?.split(' ')[0] || currentUser.email?.split('@')[0] || 'Me';
  const avatar = currentUser.user_metadata?.avatar_url;
  return `
    <div style="position:fixed;top:12px;right:12px;z-index:300;display:flex;align-items:center;gap-8px">
      <span id="sync-indicator" style="font-size:11px;color:var(--text-3);opacity:0;transition:opacity 0.5s;margin-right:8px"></span>
      <div style="display:flex;align-items:center;gap:8px;background:var(--surface);border:1px solid var(--border);border-radius:999px;padding:4px 10px 4px 6px;cursor:pointer" onclick="document.getElementById('user-menu').classList.toggle('hidden')">
        ${avatar ? `<img src="${avatar}" style="width:24px;height:24px;border-radius:50%;object-fit:cover">` : `<div style="width:24px;height:24px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700">${name[0].toUpperCase()}</div>`}
        <span style="font-size:12px;color:var(--text-2);font-weight:500">${name}</span>
      </div>
      <div id="user-menu" class="hidden" style="position:fixed;top:52px;right:12px;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:8px;min-width:160px;z-index:400;box-shadow:0 8px 32px rgba(0,0,0,0.4)">
        <div style="padding:8px 12px;color:var(--text-2);font-size:11px;border-bottom:1px solid var(--border);margin-bottom:4px">${currentUser.email}</div>
        <button onclick="toggleTheme()" style="width:100%;text-align:left;padding:8px 12px;border-radius:8px;background:none;border:none;color:var(--text-2);font-size:13px;cursor:pointer" onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background='none'">${document.documentElement.dataset.theme==='dark'?'☀️ Light mode':'🌙 Dark mode'}</button>
        <button onclick="importCSV()" style="width:100%;text-align:left;padding:8px 12px;border-radius:8px;background:none;border:none;color:var(--text-2);font-size:13px;cursor:pointer" onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background='none'">📊 Import CSV</button>
        <button onclick="exportCSV()" style="width:100%;text-align:left;padding:8px 12px;border-radius:8px;background:none;border:none;color:var(--text-2);font-size:13px;cursor:pointer" onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background='none'">📥 Export CSV</button>
        <button onclick="exportData()" style="width:100%;text-align:left;padding:8px 12px;border-radius:8px;background:none;border:none;color:var(--text-2);font-size:13px;cursor:pointer" onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background='none'">💾 Backup (JSON)</button>
        <div style="border-top:1px solid var(--border);margin:4px 0"></div>
        <button onclick="signOut()" style="width:100%;text-align:left;padding:8px 12px;border-radius:8px;background:none;border:none;color:var(--red);font-size:13px;cursor:pointer" onmouseover="this.style.background='var(--hover)'" onmouseout="this.style.background='none'">🚪 Sign Out</button>
      </div>
    </div>`;
}

async function initAuth() {
  const { data: { session } } = await sb.auth.getSession();
  currentUser = session?.user || null;
  if (currentUser) {
    await loadFromSupabase(currentUser);
    checkAndPostRecurring();
  }
  isLoading = false;
  render();

  sb.auth.onAuthStateChange(async (event, session) => {
    const wasLoggedIn = !!currentUser;
    currentUser = session?.user || null;
    if (event === 'SIGNED_IN' && !wasLoggedIn) {
      await loadFromSupabase(currentUser);
      checkAndPostRecurring();
    }
    render();
  });

  // Re-sync when tab regains focus (catches edits made on another device)
  document.addEventListener('visibilitychange', async () => {
    if (!document.hidden && currentUser) {
      await loadFromSupabase(currentUser);
      render();
    }
  });
}

initAuth();

// ── Toast notification (Sonner-style) ──────────────────────────────────────
window.showToast = function(message, type, duration) {
  type = type || "success"; duration = duration || 3000;
  const container = document.getElementById("toast-container");
  if (!container) return;
  const colors = {
    success: { bg:"var(--surface)", border:"var(--green-dim)", icon:"✓", iconColor:"var(--green)" },
    error:   { bg:"var(--surface)", border:"var(--red-dim)", icon:"✕", iconColor:"var(--red)" },
    info:    { bg:"var(--surface)", border:"var(--accent-glow)",  icon:"ℹ", iconColor:"var(--accent-text)" },
  };
  const c = colors[type] || colors.success;
  const el = document.createElement("div");
  el.style.cssText = "display:flex;align-items:center;gap:10px;background:" + c.bg + ";border:1px solid " + c.border + ";border-radius:12px;padding:12px 16px;font-size:13px;font-weight:500;color:var(--text);box-shadow:0 4px 20px rgba(0,0,0,0.4);pointer-events:all;animation:toast-in 320ms cubic-bezier(0.16,1,0.3,1) forwards;min-width:220px;max-width:320px;";
  el.innerHTML = '<span style="width:20px;height:20px;border-radius:6px;background:' + c.border + ';display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:' + c.iconColor + ';flex-shrink:0">' + c.icon + '</span><span>' + message + '</span>';
  container.appendChild(el);
  setTimeout(function() {
    el.style.transition = "opacity 200ms ease, transform 200ms ease";
    el.style.opacity = "0";
    el.style.transform = "translateY(6px)";
    setTimeout(function() { el.remove(); }, 210);
  }, duration);
};
