/**
 * Three-layer design token system (Primitive -> Semantic -> Component)
 * and responsive, accessible dark-mode styles for the Management Console.
 */
export const DASHBOARD_STYLES = `
  :root {
    color-scheme: dark;

    /* 1. Primitive Tokens */
    --slate-950: #090e1a;
    --slate-900: #0f172a;
    --slate-850: #131d31;
    --slate-800: #1e293b;
    --slate-750: #253348;
    --slate-700: #334155;
    --slate-600: #475569;
    --slate-400: #94a3b8;
    --slate-300: #cbd5e1;
    --slate-200: #e2e8f0;
    --slate-50:  #f8fafc;

    --blue-300: #93c5fd;
    --blue-500: #3b82f6;
    --blue-600: #2563eb;
    --blue-700: #1d4ed8;

    --emerald-300: #6ee7b7;
    --emerald-500: #10b981;
    --amber-300:   #fcd34d;
    --amber-500:   #f59e0b;
    --red-300:     #fca5a5;
    --red-400:     #f87171;
    --red-500:     #ef4444;
    --red-600:     #dc2626;

    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-5: 1.25rem;
    --space-6: 1.5rem;
    --space-8: 2rem;

    --radius-sm: 6px;
    --radius-md: 8px;
    --radius-lg: 12px;
    --radius-xl: 14px;
    --radius-pill: 9999px;

    --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;

    --duration-fast: 150ms;
    --duration-base: 200ms;
    --ease-out: cubic-bezier(0.22, 1, 0.36, 1);

    /* 2. Semantic Tokens */
    --color-bg: var(--slate-900);
    --color-surface: var(--slate-800);
    --color-surface-elevated: var(--slate-750);
    --color-surface-subtle: var(--slate-850);
    --color-surface-input: var(--slate-950);
    --color-border: var(--slate-700);
    --color-border-strong: var(--slate-600);
    --color-text: var(--slate-50);
    --color-text-secondary: var(--slate-300);
    --color-text-muted: var(--slate-400);
    --color-primary: var(--blue-600);
    --color-primary-hover: var(--blue-700);
    --color-primary-soft: rgba(59, 130, 246, 0.18);
    --color-primary-border: rgba(59, 130, 246, 0.45);
    --color-success: var(--emerald-500);
    --color-success-text: var(--emerald-300);
    --color-success-bg: rgba(16, 185, 129, 0.16);
    --color-success-border: rgba(16, 185, 129, 0.4);
    --color-warning: var(--amber-500);
    --color-warning-text: var(--amber-300);
    --color-warning-bg: rgba(245, 158, 11, 0.16);
    --color-warning-border: rgba(245, 158, 11, 0.4);
    --color-danger: var(--red-500);
    --color-danger-hover: var(--red-600);
    --color-danger-text: var(--red-300);
    --color-danger-bg: rgba(239, 68, 68, 0.16);
    --color-danger-border: rgba(239, 68, 68, 0.4);
    --color-ring: var(--blue-300);

    /* 3. Component Tokens */
    --btn-bg: var(--color-surface);
    --btn-bg-hover: var(--slate-700);
    --btn-text: var(--slate-200);
    --btn-border: var(--color-border);
    --btn-radius: var(--radius-sm);
    --card-bg: var(--color-surface);
    --card-border: var(--color-border);
    --card-radius: var(--radius-lg);
    --input-bg: var(--color-surface-input);
    --input-border: var(--color-border);
    --dialog-bg: var(--color-surface);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  html {
    scroll-padding-top: 88px;
  }

  body {
    font-family: var(--font-sans);
    background-color: var(--color-bg);
    color: var(--color-text);
    line-height: 1.5;
    padding-bottom: var(--space-8);
    -webkit-font-smoothing: antialiased;
  }

  [hidden] { display: none !important; }

  /* Accessible visible focus indicator for all interactive controls */
  button:focus-visible,
  a:focus-visible,
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible,
  [tabindex]:focus-visible {
    outline: 2px solid var(--color-ring);
    outline-offset: 2px;
  }

  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .tabular { font-variant-numeric: tabular-nums; }
  .mono { font-family: var(--font-mono); }

  /* Header & Navigation */
  header {
    background: rgba(19, 29, 49, 0.9);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid var(--color-border);
    position: sticky;
    top: 0;
    z-index: 100;
    padding: var(--space-3) var(--space-6);
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 0;
  }

  .brand-mark {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-md);
    background: var(--color-primary-soft);
    border: 1px solid var(--color-primary-border);
    color: var(--blue-300);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .brand h1 {
    font-size: 1.05rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.25;
  }

  .brand-sub {
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  .header-meta {
    display: flex;
    align-items: center;
    gap: var(--space-2);
    flex-wrap: wrap;
  }

  .tab-nav {
    background: var(--color-surface-subtle);
    border-bottom: 1px solid var(--color-border);
  }

  .tablist {
    display: flex;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-6);
    overflow-x: auto;
    scrollbar-width: thin;
  }

  .nav-btn {
    background: transparent;
    border: 1px solid transparent;
    color: var(--color-text-muted);
    font-family: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    padding: var(--space-2) var(--space-4);
    min-height: 38px;
    border-radius: var(--radius-md);
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: color var(--duration-fast) ease, background-color var(--duration-fast) ease, border-color var(--duration-fast) ease;
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
  }

  .nav-btn:hover {
    color: var(--color-text);
    background: var(--color-surface);
  }

  .nav-btn.active {
    color: #fff;
    background: var(--color-primary);
    border-color: var(--color-primary);
  }

  .container {
    max-width: 1400px;
    margin: var(--space-6) auto;
    padding: 0 var(--space-6);
  }

  .tab-content { display: none; }
  .tab-content.active { display: block; }

  /* Badges */
  .badge {
    font-size: 0.72rem;
    font-weight: 600;
    line-height: 1.2;
    padding: 4px 10px;
    border-radius: var(--radius-pill);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
  .badge-primary { background: var(--color-primary-soft); color: var(--blue-300); border: 1px solid var(--color-primary-border); }
  .badge-success { background: var(--color-success-bg); color: var(--color-success-text); border: 1px solid var(--color-success-border); }
  .badge-danger  { background: var(--color-danger-bg); color: var(--color-danger-text); border: 1px solid var(--color-danger-border); }
  .badge-warning { background: var(--color-warning-bg); color: var(--color-warning-text); border: 1px solid var(--color-warning-border); }
  .badge-gray    { background: var(--slate-700); color: var(--slate-200); border: 1px solid var(--color-border-strong); }

  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }
  .status-dot.green  { background: var(--color-success); box-shadow: 0 0 8px rgba(16, 185, 129, 0.7); }
  .status-dot.red    { background: var(--color-danger); box-shadow: 0 0 8px rgba(239, 68, 68, 0.7); }
  .status-dot.yellow { background: var(--color-warning); box-shadow: 0 0 8px rgba(245, 158, 11, 0.7); }
  .status-dot.gray   { background: var(--slate-400); }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 34px;
    padding: 6px 12px;
    font-family: inherit;
    font-size: 0.8rem;
    font-weight: 600;
    border-radius: var(--btn-radius);
    border: 1px solid var(--btn-border);
    cursor: pointer;
    background: var(--btn-bg);
    color: var(--btn-text);
    transition: background-color var(--duration-fast) ease, border-color var(--duration-fast) ease, color var(--duration-fast) ease, opacity var(--duration-fast) ease;
    white-space: nowrap;
  }
  .btn:hover:not(:disabled) { background: var(--btn-bg-hover); border-color: var(--color-border-strong); }
  .btn:active:not(:disabled) { opacity: 0.9; }
  .btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .btn-primary {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: #fff;
  }
  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
    border-color: var(--color-primary-hover);
  }

  .btn-danger {
    background: var(--color-danger-bg);
    border-color: var(--color-danger-border);
    color: var(--color-danger-text);
  }
  .btn-danger:hover:not(:disabled) {
    background: var(--color-danger);
    border-color: var(--color-danger);
    color: #fff;
  }

  .btn-ghost {
    background: transparent;
    border-color: transparent;
    color: var(--color-text-muted);
  }
  .btn-ghost:hover:not(:disabled) {
    background: var(--color-surface-elevated);
    color: var(--color-text);
  }

  .btn-icon {
    width: 34px;
    height: 34px;
    padding: 0;
  }

  /* KPI Grid */
  .grid-kpi {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }
  .kpi-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--card-radius);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .kpi-label {
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--color-text-muted);
  }
  .kpi-value {
    font-size: 1.65rem;
    font-weight: 700;
    color: var(--color-text);
    line-height: 1.2;
  }
  .kpi-sub {
    font-size: 0.75rem;
    color: var(--color-text-muted);
  }

  /* Section Headings */
  .section-title {
    font-size: 1.05rem;
    font-weight: 700;
    margin-bottom: var(--space-4);
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3);
  }
  .section-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
  }
  .section-desc {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    margin-bottom: var(--space-4);
  }

  /* Cards & Grids */
  .card-panel {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--card-radius);
    padding: var(--space-5);
  }
  .card-panel h2,
  .card-panel h3 {
    font-size: 1rem;
    margin-bottom: var(--space-3);
  }

  .grid-2col {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-5);
    margin-bottom: var(--space-6);
  }

  .grid-drivers {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
    gap: var(--space-4);
    margin-bottom: var(--space-8);
  }
  .driver-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--card-radius);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    transition: border-color var(--duration-fast) ease, background-color var(--duration-fast) ease;
  }
  .driver-card:hover {
    border-color: var(--color-border-strong);
    background: var(--color-surface-elevated);
  }
  .driver-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-2);
  }
  .driver-name {
    font-size: 0.98rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .driver-details {
    font-size: 0.8rem;
    color: var(--color-text-secondary);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .driver-command {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--color-text-muted);
    overflow-wrap: anywhere;
  }
  .driver-error {
    font-size: 0.75rem;
    color: var(--red-300);
    background: var(--color-danger-bg);
    border: 1px solid var(--color-danger-border);
    border-radius: var(--radius-sm);
    padding: 6px 8px;
    overflow-wrap: anywhere;
  }
  .driver-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: auto;
    padding-top: var(--space-1);
  }

  /* Tables */
  .table-container {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--card-radius);
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    font-size: 0.84rem;
  }
  th {
    background: var(--color-surface-subtle);
    padding: 11px 16px;
    color: var(--color-text-muted);
    font-weight: 600;
    font-size: 0.78rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    border-bottom: 1px solid var(--color-border);
    white-space: nowrap;
  }
  td {
    padding: 11px 16px;
    border-bottom: 1px solid rgba(51, 65, 85, 0.65);
    vertical-align: middle;
  }
  tr:last-child td { border-bottom: none; }
  tbody tr:hover td { background: rgba(39, 53, 73, 0.55); }
  .cell-center { text-align: center; }
  .cell-empty {
    text-align: center;
    color: var(--color-text-muted);
    padding: var(--space-6) var(--space-4);
  }
  .cell-truncate {
    font-size: 0.78rem;
    color: var(--color-text-muted);
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Catalog / Marketplace */
  .catalog-filters {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-5);
    flex-wrap: wrap;
    align-items: center;
  }
  .search-wrap {
    position: relative;
    flex: 1 1 240px;
    max-width: 340px;
  }
  .search-input {
    width: 100%;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    color: var(--color-text);
    padding: 8px 12px;
    min-height: 36px;
    border-radius: var(--radius-md);
    font-family: inherit;
    font-size: 0.85rem;
    transition: border-color var(--duration-fast) ease;
  }
  .search-input:focus { border-color: var(--color-primary); }

  .filter-chip.is-active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: #fff;
  }

  .catalog-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--space-4);
  }
  .catalog-item-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--card-radius);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    transition: border-color var(--duration-fast) ease;
  }
  .catalog-item-card:hover { border-color: var(--color-border-strong); }
  .catalog-item-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-2);
  }
  .catalog-item-title-wrap {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    min-width: 0;
  }
  .catalog-icon-tile {
    width: 38px;
    height: 38px;
    border-radius: var(--radius-md);
    background: var(--color-surface-subtle);
    border: 1px solid var(--color-border);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    flex-shrink: 0;
  }
  .catalog-item-name { font-weight: 700; font-size: 0.95rem; }
  .catalog-item-cat { font-size: 0.75rem; color: var(--color-text-muted); }
  .catalog-item-desc {
    font-size: 0.82rem;
    color: var(--color-text-secondary);
    flex: 1;
  }
  .catalog-item-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
    gap: var(--space-2);
  }

  /* Playground */
  .split-playground {
    display: grid;
    grid-template-columns: 320px minmax(0, 1fr);
    gap: var(--space-5);
    align-items: start;
  }
  .tool-picker-list {
    max-height: 540px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .tool-picker-item {
    width: 100%;
    text-align: left;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    padding: 8px 10px;
    min-height: 36px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    border: 1px solid transparent;
    background: var(--color-surface-subtle);
    color: var(--color-text-secondary);
    overflow-wrap: anywhere;
    transition: background-color var(--duration-fast) ease, color var(--duration-fast) ease, border-color var(--duration-fast) ease;
  }
  .tool-picker-item:hover {
    background: var(--color-surface-elevated);
    color: var(--color-text);
  }
  .tool-picker-item.is-selected {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: #fff;
    font-weight: 600;
  }
  .playground-header {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--space-3);
    border-bottom: 1px solid var(--color-border);
    padding-bottom: var(--space-3);
  }
  .playground-title { font-size: 1.1rem; font-weight: 700; overflow-wrap: anywhere; }
  .playground-desc { font-size: 0.84rem; color: var(--color-text-muted); margin-top: 4px; }

  .code-block {
    background: var(--color-surface-input);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--blue-300);
    overflow: auto;
    max-height: 380px;
    min-height: 160px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }

  /* Forms */
  .form-group { margin-bottom: var(--space-3); }
  .form-label {
    display: block;
    font-size: 0.8rem;
    font-weight: 600;
    margin-bottom: 6px;
    color: var(--color-text-secondary);
  }
  .form-help {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    margin-top: 4px;
  }
  .form-error {
    font-size: 0.78rem;
    color: var(--red-300);
    margin-top: 6px;
  }
  .form-input {
    width: 100%;
    background: var(--input-bg);
    border: 1px solid var(--input-border);
    color: var(--color-text);
    padding: 8px 12px;
    min-height: 36px;
    border-radius: var(--radius-sm);
    font-family: inherit;
    font-size: 0.85rem;
    transition: border-color var(--duration-fast) ease;
  }
  .form-input:focus { border-color: var(--color-primary); }
  .form-input[aria-invalid="true"] { border-color: var(--color-danger); }
  .form-textarea {
    min-height: 140px;
    font-family: var(--font-mono);
    font-size: 0.82rem;
    resize: vertical;
  }
  input[type="checkbox"] {
    width: 18px;
    height: 18px;
    accent-color: var(--color-primary);
    cursor: pointer;
  }

  /* Native Dialog Modals */
  dialog.modal {
    margin: auto;
    background: var(--dialog-bg);
    color: var(--color-text);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-xl);
    width: min(92vw, 560px);
    max-height: 86vh;
    overflow-y: auto;
    padding: var(--space-6);
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.55);
    opacity: 0;
    transform: translateY(6px) scale(0.98);
    transition: opacity var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out);
  }
  dialog.modal[open] {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  @starting-style {
    dialog.modal[open] {
      opacity: 0;
      transform: translateY(6px) scale(0.98);
    }
  }
  dialog.modal::backdrop {
    background: rgba(9, 14, 26, 0.78);
    backdrop-filter: blur(4px);
  }
  dialog.modal-sm { width: min(92vw, 440px); }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }
  .modal-title { font-size: 1.1rem; font-weight: 700; }
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    margin-top: var(--space-5);
  }

  /* Alerts, Empty States & Toasts */
  .inline-alert {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    font-size: 0.84rem;
    margin-bottom: var(--space-4);
    border: 1px solid var(--color-danger-border);
    background: var(--color-danger-bg);
    color: var(--color-danger-text);
  }
  .empty-state {
    grid-column: 1 / -1;
    background: var(--card-bg);
    border: 1px dashed var(--color-border-strong);
    border-radius: var(--card-radius);
    padding: var(--space-8) var(--space-4);
    text-align: center;
    color: var(--color-text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-3);
  }

  .toast-region {
    position: fixed;
    right: var(--space-5);
    bottom: var(--space-5);
    z-index: 2000;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    max-width: min(92vw, 380px);
    pointer-events: none;
  }
  .toast {
    pointer-events: auto;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    background: var(--color-surface-elevated);
    border: 1px solid var(--color-border-strong);
    color: var(--color-text);
    font-size: 0.84rem;
    box-shadow: 0 12px 24px rgba(0, 0, 0, 0.4);
  }
  .toast-success { border-color: var(--color-success-border); }
  .toast-error   { border-color: var(--color-danger-border); }
  .toast-warning { border-color: var(--color-warning-border); }

  /* Responsive Breakpoints */
  @media (max-width: 900px) {
    .split-playground { grid-template-columns: 1fr; }
    .tool-picker-list { max-height: 260px; }
  }

  @media (max-width: 768px) {
    header, .tablist, .container { padding-left: var(--space-4); padding-right: var(--space-4); }
    .grid-2col { grid-template-columns: 1fr; }
    .btn, .nav-btn, .tool-picker-item { min-height: 40px; }
  }

  @media (max-width: 480px) {
    .grid-drivers, .catalog-grid { grid-template-columns: 1fr; }
    .toast-region { left: var(--space-3); right: var(--space-3); bottom: var(--space-3); max-width: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`;

