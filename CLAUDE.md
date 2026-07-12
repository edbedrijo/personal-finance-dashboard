# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is a personal finance tracker — a vanilla JS SPA with no build step, no npm, no framework. `index.html` is a thin shell that loads `css/styles.css` plus five JS files. Serve with any static server (opening `index.html` via `file://` may block the JS files in some browsers — prefer a local server).

- **Live deployment**: Netlify (auto-deploys from GitHub main) — https://poetic-dusk-9cbea2.netlify.app
- **GitHub repo**: https://github.com/edbedrijo/personal-finance-dashboard (branch: `main`)
- **Owner**: Ed Bedrijo — beginner coder; explain the WHY, keep changes small, verify before claiming done.

## Running

Open `index.html` in a browser. No build step needed. For local dev, any static server works:

```
npx serve .
# or
python -m http.server
```

A `.claude/launch.json` exists that serves the app with `python -m http.server` on port 7821 for the Claude preview panel.

## Architecture

### File Layout

Classic `<script>` tags loaded in dependency order — **NOT ES modules** (all handlers must live on `window` for inline `onclick` attributes, and files share globals). Load order in `index.html` matters:

1. `js/config.js` — Supabase client, constants, `toLocalISO`/`todayISO`, default categories, `migrateState()`, `state`, `save()`
2. `js/utils.js` — UI-state objects (`txUI`, `catUI`, …), formatters (`fmt`, `fmt2`, `fmtDate`), date helpers (`advanceDue`, `monthsBetween`), totals, `checkAndPostRecurring()`, `computeGoalSaved()`, `getMonthlyData()`
3. `js/actions.js` — all `window.*` action handlers (transactions, accounts, CCs, goals, recurring, icon picker) and balance-adjustment functions (`adjustAccount`, `adjustCCPayment`, `ccCycleDates`, …)
4. `js/render.js` — all `renderXxx()` view functions and the main `render()`
5. `js/app.js` — auth (`initAuth()` boots the app), Supabase load/sync, CSV/JSON import/export, toasts

- **`css/styles.css`**: CSS custom properties (design tokens), component styles, responsive breakpoints. Dark theme with `--bg`, `--surface`, `--indigo`, `--green`, `--red` variables. Minimum readable gray for secondary text is `#6b7280` (`--text-3`) — do NOT use darker grays like `#4b5563` for text; it was globally replaced for readability.
- New code goes in the file matching its role; new load-order dependencies mean adding the script tag in the right position in `index.html`.

### Data Layer

- **`state`** — single global object: `{ accounts, creditCards, recurring, goals, categories, transactions, forecastDays }`
- **`save()`** — writes to `localStorage` (keyed by `STORAGE_KEY + '_' + user.id`) AND debounces a Supabase upsert (1.5s). The Supabase table is `finance_state` with a `user_id` primary key and a `state` JSONB column.
- **`migrateState(p)`** — applied on load (both localStorage and Supabase paths) to add missing fields to older stored state. **Always extend this when adding new fields to `state` or changing transaction semantics.** Existing migrations include: account icons/types, CC `cutoffDay` (replacing `cycleStartDay`), recurring `frequency`/`nextDue` (replacing `dueDay`), goal `deposits` array (replacing `saved`), and converting legacy CC payment transactions from `type:'expense'` to `type:'transfer'`.
- Auth via Supabase Google OAuth (`sb = createClient(SUPABASE_URL, SUPABASE_KEY)`, anon key inline in `js/config.js` — safe because it's public by design; data is protected by RLS. The service-role key must NEVER appear in client code). User profile is stored in `currentUser`. `renderLoginScreen()` shows when logged out.

### Rendering

- **`render()`** — a single function that re-renders the entire `#app` div using `innerHTML`. No virtual DOM, no diffing.
- Each section has its own `renderXxx()` function: `renderDashboard()`, `renderTransactions()`, `renderAccounts()`, `renderGoals()`, `renderRecurring()`, `renderCategories()`.
- Navigation: `currentView` string controls which view is shown. Set via `setView(v)`.
- UI state is separate from data state: `catUI`, `txUI`, `acctUI`, `goalUI`, `recUI` are plain objects tracking modal open/close, selected IDs, active tabs, etc.

### Key Patterns

- **All action handlers are attached to `window`** (e.g. `window.txSave = () => {...}`) so they're callable from inline `onclick` attributes in the HTML strings.
- Account adjustments: `adjustAccount(accountId, type, amount, delta)` handles both debit accounts and credit cards. `delta` is `+1` to apply, `-1` to reverse. Transfers also call `adjustTransferDest(toAccountId, amount, delta)`.
- Currency is Philippine Peso (₱). `fmt(n)` rounds to integer; `fmt2(n)` shows 2 decimal places.
- Dates are stored as ISO strings (`YYYY-MM-DD`). Always append `T00:00:00` when constructing `new Date()` from an ISO date string. To convert a `Date` back to a date string, always use `toLocalISO(d)` (config.js) — NEVER `toISOString().split('T')[0]`, which converts to UTC and shifts dates back a day in UTC+8.
- IDs are generated as `'prefix_' + Date.now()` strings.

### Credit Card Accounting (important — do not regress)

These rules exist to prevent double-counting expenses:

1. **Charges to a CC** are logged as `type:'expense'` with `accountId` = the CC id. This is the real spending event; it increases `cc.outstanding` via `adjustCC()`.
2. **CC bill payments** (`ccRecordPayment`) are logged as `type:'transfer'` with `notes:'CC payment'`, `accountId` = source debit account, `toAccountId` = the CC. The payment reduces `cc.outstanding` and the source account balance directly in the handler — it is NOT new spending and must never count as an expense.
3. Transactions with `notes === 'CC payment'` are **excluded** from the normal `adjustAccount` reverse/apply logic in `txSave`/`txConfirmDelete` — their balance effects go through `adjustCCPayment(tx, delta)` instead (outstanding on the destination CC, cash on the source account), so editing or deleting a payment correctly reverses it. Also excluded from `ccCycleSpend`.
4. `migrateState` converts any legacy CC payment transactions still stored as `type:'expense'` to `type:'transfer'`.

### Billing Cycle Logic

- `ccCycleDates(id)` computes the current cycle from `cutoffDay`: cycle start = day after cutoff, due date = `dueDay` in the month **after** the cutoff. Use this whenever you need a CC's real due date — do NOT compute due dates as "this month's dueDay" (that breaks on month rollover).
- `ccCycleSpend(id)` = new charges since cycle start. `ccStatementPayments(id)` = payments since previous cutoff.

### Spending Forecast (dashboard)

- Window = `state.forecastDays` (7/14/21/30) from today.
- Includes active recurring income/expenses with `nextDue` inside the window.
- **CCs with `outstanding > 0` are always listed** so obligations are never hidden. If the due date (from `ccCycleDates`) falls inside the window it shows red and subtracts from "Available to spend"; if outside, it shows gray with an "outside window" label and does NOT subtract.
- The amount used per CC is what's actually payable on the due date: unpaid statement balance (`lastStatement - ccStatementPayments`) when a statement is set, else full `outstanding`. "Spendable funds" (assets minus maintaining balances) is the base — same figure "Available to spend" is computed from.

### Recurring Auto-Posting

`checkAndPostRecurring()` runs once per session (guarded by `recurringChecked`): for each active recurring item with `nextDue <= today`, it posts a transaction, adjusts the account, and advances `nextDue` by `frequency` (with a safety cap of 24 iterations).

### Responsive Layout

- Mobile (≤768px): bottom navigation bar (`#bottom-nav`) is shown; top nav is hidden. A FAB button triggers `fabOpen()`.
- Desktop (≥769px): top nav is shown; desktop FAB (fixed bottom-right) is shown.
- `renderLoginScreen()` is single-layout and works on both sizes without breakpoints.

### External Dependencies (CDN only)

- Tailwind CSS (`cdn.tailwindcss.com`) — utility classes
- Supabase JS v2 (`@supabase/supabase-js@2`) — auth + database sync

## Workflow Conventions

- Commit directly to `main` and push to GitHub; Netlify auto-deploys from main.
- Verify UI changes in a browser (serve locally, inject mock state via console if auth blocks you: set `state`, `currentUser`, `isLoading = false`, then `setView(...)`) before committing.
- Commit messages: imperative summary line + bullet details of what/why.
- Google login doesn't work inside in-app browsers (Messenger etc.) — `renderLoginScreen()` has an `#inapp-warning` block for this.
