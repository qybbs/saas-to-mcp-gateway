/**
 * Unslopped 3-layer design token system (Primitive -> Semantic -> Component)
 * for the SaaS-to-MCP Gateway Control Plane: matte graphite surfaces,
 * strict 4px/8px spacing grid, 5-step type scale, hairline telemetry strip,
 * routing topology canvas, and WCAG AA contrast compliance.
 */
export const DASHBOARD_STYLES = `
  :root {
    color-scheme: dark;

    /* 1. Primitive Tokens */
    --neutral-950: #080a0d;
    --neutral-900: #0b0d10;
    --neutral-850: #11141a;
    --neutral-800: #141820;
    --neutral-750: #171b22;
    --neutral-700: #232832;
    --neutral-600: #343b48;
    --neutral-400: #9ca3af;
    --neutral-300: #d1d5db;
    --neutral-100: #f3f4f6;

    --cobalt-300: #93c5fd;
    --cobalt-400: #60a5fa;
    --cobalt-600: #2563eb;
    --cobalt-700: #1d4ed8;

    --emerald-300: #6ee7b7;
    --emerald-500: #10b981;
    --amber-300:   #fcd34d;
    --amber-500:   #f59e0b;
    --red-300:     #fca5a5;
    --red-400:     #f87171;
    --red-600:     #dc2626;
    --red-700:     #b91c1c;

    /* 4px / 8px Spacing Scale */
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-6: 24px;
    --space-8: 32px;

    /* 5-Step Type Scale */
    --text-xs: 0.75rem;   /* 12px */
    --text-sm: 0.875rem;  /* 14px */
    --text-md: 1rem;      /* 16px */
    --text-lg: 1.125rem;  /* 18px */
    --text-xl: 1.5rem;    /* 24px */

    --radius-sm: 4px;
    --radius-md: 6px;
    --radius-lg: 8px;

    --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;

    --duration-fast: 120ms;
    --ease-out: cubic-bezier(0.22, 1, 0.36, 1);

    /* 2. Semantic Tokens */
    --bg-canvas: var(--neutral-900);
    --bg-panel: var(--neutral-850);
    --bg-subtle: var(--neutral-800);
    --bg-elevated: var(--neutral-750);
    --bg-input: var(--neutral-950);

    --border-hairline: var(--neutral-700);
    --border-strong: var(--neutral-600);

    --color-text: var(--neutral-100);
    --color-text-secondary: var(--neutral-300);
    --color-text-muted: var(--neutral-400);

    --color-primary: var(--cobalt-600);
    --color-primary-hover: var(--cobalt-700);
    --color-accent: var(--cobalt-400);
    --color-accent-soft: rgba(37, 99, 235, 0.14);
    --color-accent-border: rgba(96, 165, 250, 0.35);

    --color-success: var(--emerald-500);
    --color-success-text: var(--emerald-300);
    --color-success-bg: rgba(16, 185, 129, 0.12);
    --color-success-border: rgba(16, 185, 129, 0.35);

    --color-warning: var(--amber-500);
    --color-warning-text: var(--amber-300);
    --color-warning-bg: rgba(245, 158, 11, 0.12);
    --color-warning-border: rgba(245, 158, 11, 0.35);

    --color-danger: var(--red-700);
    --color-danger-text: var(--red-300);
    --color-danger-bg: rgba(220, 38, 38, 0.14);
    --color-danger-border: rgba(248, 113, 113, 0.35);

    --color-ring: var(--cobalt-300);

    /* 3. Component Tokens */
    --btn-bg: var(--bg-elevated);
    --btn-bg-hover: var(--border-hairline);
    --btn-text: var(--neutral-300);
    --btn-border: var(--border-strong);
    --card-bg: var(--bg-panel);
    --card-border: var(--border-hairline);
    --dialog-bg: var(--bg-panel);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  html { scroll-padding-top: 96px; }

  body {
    font-family: var(--font-sans);
    font-size: var(--text-sm);
    background-color: var(--bg-canvas);
    color: var(--color-text);
    line-height: 1.5;
    padding-bottom: var(--space-8);
    -webkit-font-smoothing: antialiased;
  }

  [hidden] { display: none !important; }

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
    background: var(--bg-canvas);
    border-bottom: 1px solid var(--border-hairline);
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
    width: 32px;
    height: 32px;
    border-radius: var(--radius-md);
    background: var(--bg-panel);
    border: 1px solid var(--border-strong);
    color: var(--cobalt-300);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .brand h1 {
    font-size: var(--text-md);
    font-weight: 600;
    letter-spacing: -0.015em;
    line-height: 1.25;
  }

  .brand-sub {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  .header-meta {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    flex-wrap: wrap;
  }

  .meta-divider {
    width: 1px;
    height: 16px;
    background: var(--border-hairline);
  }

  .tab-nav {
    background: var(--bg-canvas);
    border-bottom: 1px solid var(--border-hairline);
  }

  .tablist {
    max-width: 1400px;
    margin: 0 auto;
    display: flex;
    gap: var(--space-4);
    padding: 0 var(--space-6);
    overflow-x: auto;
    scrollbar-width: thin;
  }

  .nav-btn {
    background: transparent;
    border: none;
    border-bottom: 2px solid transparent;
    border-radius: 0;
    color: var(--color-text-muted);
    font-family: inherit;
    font-size: var(--text-sm);
    font-weight: 500;
    padding: var(--space-3) var(--space-1);
    min-height: 44px;
    cursor: pointer;
    white-space: nowrap;
    flex-shrink: 0;
    transition: color var(--duration-fast) ease, border-color var(--duration-fast) ease;
    display: inline-flex;
    align-items: center;
    gap: var(--space-2);
  }

  .nav-btn:hover { color: var(--color-text); }
  .nav-btn.active {
    color: var(--color-text);
    font-weight: 600;
    border-bottom-color: var(--color-accent);
  }

  .container {
    max-width: 1400px;
    margin: var(--space-6) auto;
    padding: 0 var(--space-6);
  }

  .tab-content { display: none; }
  .tab-content.active { display: block; }

  /* Quiet Tags & Status Indicators (No Pill Soup / No Neon Glows) */
  .badge,
  .tag {
    font-size: var(--text-xs);
    font-weight: 500;
    line-height: 1.25;
    padding: 2px var(--space-2);
    border-radius: var(--radius-sm);
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    border: 1px solid var(--border-hairline);
    background: var(--bg-subtle);
    color: var(--color-text-secondary);
  }

  .badge-primary { background: var(--color-accent-soft); color: var(--cobalt-300); border-color: var(--color-accent-border); }
  .badge-success { background: var(--color-success-bg); color: var(--color-success-text); border-color: var(--color-success-border); }
  .badge-danger  { background: var(--color-danger-bg); color: var(--color-danger-text); border-color: var(--color-danger-border); }
  .badge-warning { background: var(--color-warning-bg); color: var(--color-warning-text); border-color: var(--color-warning-border); }
  .badge-gray    { background: var(--bg-subtle); color: var(--color-text-muted); border-color: var(--border-hairline); }

  .status-inline {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--color-text-secondary);
    white-space: nowrap;
  }
  .status-inline.is-success { color: var(--color-success-text); }
  .status-inline.is-warning { color: var(--color-warning-text); }
  .status-inline.is-danger  { color: var(--color-danger-text); }
  .status-inline.is-muted   { color: var(--color-text-muted); }

  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    display: inline-block;
    flex-shrink: 0;
  }
  .status-dot.green  { background: var(--color-success); }
  .status-dot.red    { background: var(--red-400); }
  .status-dot.yellow { background: var(--color-warning); }
  .status-dot.gray   { background: var(--neutral-400); }

  /* Buttons */
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 32px;
    padding: 0 var(--space-3);
    font-family: inherit;
    font-size: var(--text-xs);
    font-weight: 600;
    border-radius: var(--radius-sm);
    border: 1px solid var(--btn-border);
    cursor: pointer;
    background: var(--btn-bg);
    color: var(--btn-text);
    transition: background-color var(--duration-fast) ease, border-color var(--duration-fast) ease, color var(--duration-fast) ease;
    white-space: nowrap;
  }
  .btn:hover:not(:disabled) {
    background: var(--btn-bg-hover);
    border-color: var(--neutral-400);
    color: var(--color-text);
  }
  .btn:disabled { opacity: 0.45; cursor: not-allowed; }

  .btn-primary {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: #fff;
  }
  .btn-primary:hover:not(:disabled) {
    background: var(--color-primary-hover);
    border-color: var(--color-primary-hover);
    color: #fff;
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
    background: var(--bg-elevated);
    border-color: transparent;
    color: var(--color-text);
  }

  .btn-icon { width: 32px; height: 32px; padding: 0; }

  /* Unified Hairline Telemetry Strip (Replaces Boxy 5-Card KPI Grid) */
  .telemetry-strip {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 1px;
    background: var(--border-hairline);
    border: 1px solid var(--border-hairline);
    border-radius: var(--radius-lg);
    overflow: hidden;
    margin-bottom: var(--space-6);
  }
  .telemetry-cell {
    background: var(--bg-panel);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
    min-width: 0;
  }
  .kpi-label {
    font-size: var(--text-xs);
    font-weight: 500;
    color: var(--color-text-muted);
  }
  .kpi-value {
    font-size: var(--text-xl);
    font-weight: 600;
    letter-spacing: -0.02em;
    color: var(--color-text);
    line-height: 1.2;
  }
  .kpi-sub {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }

  /* Hero Visual: Live Gateway Routing Topology */
  .topology-card {
    background: var(--bg-panel);
    border: 1px solid var(--border-hairline);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    margin-bottom: var(--space-8);
  }
  .topology-head {
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3);
    padding-bottom: var(--space-3);
    border-bottom: 1px solid var(--border-hairline);
    margin-bottom: var(--space-3);
  }
  .topology-head h2 {
    font-size: var(--text-md);
    font-weight: 600;
  }
  .topology-legend {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-4);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
  }
  .topology-canvas {
    width: 100%;
    min-height: clamp(216px, 21vw, 300px);
    overflow-x: auto;
  }
  .topology-svg {
    display: block;
    width: 100%;
    min-width: 680px;
    height: auto;
  }

  /* Section Headings */
  .section-title {
    margin-bottom: var(--space-4);
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3);
  }
  .section-title h2 {
    font-size: var(--text-md);
    font-weight: 600;
  }
  .section-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    align-items: center;
  }
  .section-desc {
    font-size: var(--text-sm);
    color: var(--color-text-muted);
    margin-bottom: var(--space-4);
  }

  /* Cards & Grids */
  .card-panel {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
  }
  .card-panel h2,
  .card-panel h3 {
    font-size: var(--text-md);
    font-weight: 600;
    margin-bottom: var(--space-3);
  }

  .grid-2col {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-4);
    margin-bottom: var(--space-6);
  }

  .grid-drivers {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--space-3);
    min-height: 152px;
    margin-bottom: var(--space-8);
  }
  .driver-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    transition: border-color var(--duration-fast) ease, background-color var(--duration-fast) ease;
  }
  .driver-card:hover {
    border-color: var(--border-strong);
    background: var(--bg-elevated);
  }
  .driver-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-2);
  }
  .driver-name {
    font-size: var(--text-sm);
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: var(--space-2);
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .driver-meta {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: var(--space-2);
  }
  .driver-command {
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .driver-error {
    font-size: var(--text-xs);
    color: var(--red-300);
    background: var(--color-danger-bg);
    border: 1px solid var(--color-danger-border);
    border-radius: var(--radius-sm);
    padding: var(--space-2);
    overflow-wrap: anywhere;
  }
  .driver-actions {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
    margin-top: auto;
    padding-top: var(--space-2);
    border-top: 1px solid var(--border-hairline);
  }

  /* Tables */
  .table-container {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-lg);
    overflow-x: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    text-align: left;
    font-size: var(--text-sm);
  }
  th {
    background: var(--bg-subtle);
    padding: var(--space-3) var(--space-4);
    color: var(--color-text-muted);
    font-weight: 600;
    font-size: var(--text-xs);
    border-bottom: 1px solid var(--border-hairline);
    white-space: nowrap;
  }
  td {
    padding: var(--space-3) var(--space-4);
    border-bottom: 1px solid var(--border-hairline);
    vertical-align: middle;
  }
  tr:last-child td { border-bottom: none; }
  tbody tr:hover td { background: var(--bg-elevated); }
  .cell-center { text-align: center; }
  .cell-empty {
    text-align: center;
    color: var(--color-text-muted);
    padding: var(--space-6) var(--space-4);
  }
  .cell-truncate {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Catalog */
  .catalog-filters {
    display: flex;
    gap: var(--space-2);
    margin-bottom: var(--space-4);
    flex-wrap: wrap;
    align-items: center;
  }
  .search-wrap {
    position: relative;
    flex: 1 1 240px;
    max-width: 320px;
  }
  .search-input {
    width: 100%;
    background: var(--bg-input);
    border: 1px solid var(--border-hairline);
    color: var(--color-text);
    padding: var(--space-2) var(--space-3);
    min-height: 32px;
    border-radius: var(--radius-sm);
    font-family: inherit;
    font-size: var(--text-sm);
    transition: border-color var(--duration-fast) ease;
  }
  .search-input:focus { border-color: var(--color-accent); }

  .filter-chip.is-active {
    background: var(--color-primary);
    border-color: var(--color-primary);
    color: #fff;
  }

  .catalog-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: var(--space-3);
  }
  .catalog-item-card {
    background: var(--card-bg);
    border: 1px solid var(--card-border);
    border-radius: var(--radius-lg);
    padding: var(--space-4);
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
    transition: border-color var(--duration-fast) ease, background-color var(--duration-fast) ease;
  }
  .catalog-item-card:hover {
    border-color: var(--border-strong);
    background: var(--bg-elevated);
  }
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
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm);
    background: var(--bg-subtle);
    border: 1px solid var(--border-strong);
    color: var(--color-text-secondary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    font-weight: 600;
    letter-spacing: 0.02em;
    flex-shrink: 0;
  }
  .catalog-item-name { font-weight: 600; font-size: var(--text-sm); }
  .catalog-item-cat { font-size: var(--text-xs); color: var(--color-text-muted); }
  .catalog-item-desc {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    line-height: 1.5;
    flex: 1;
  }
  .catalog-item-foot {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
    padding-top: var(--space-2);
    border-top: 1px solid var(--border-hairline);
    gap: var(--space-2);
  }

  /* Playground */
  .split-playground {
    display: grid;
    grid-template-columns: 300px minmax(0, 1fr);
    gap: var(--space-4);
    align-items: start;
  }
  .tool-picker-list {
    max-height: 540px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }
  .tool-picker-item {
    width: 100%;
    text-align: left;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    padding: var(--space-2) var(--space-3);
    min-height: 36px;
    border-radius: var(--radius-sm);
    cursor: pointer;
    border: 1px solid transparent;
    background: var(--bg-subtle);
    color: var(--color-text-secondary);
    overflow-wrap: anywhere;
    transition: background-color var(--duration-fast) ease, color var(--duration-fast) ease;
  }
  .tool-picker-item:hover {
    background: var(--bg-elevated);
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
    border-bottom: 1px solid var(--border-hairline);
    padding-bottom: var(--space-3);
  }
  .playground-title { font-size: var(--text-md); font-weight: 600; overflow-wrap: anywhere; }
  .playground-desc { font-size: var(--text-xs); color: var(--color-text-muted); margin-top: var(--space-1); }

  .code-block {
    background: var(--bg-input);
    border: 1px solid var(--border-hairline);
    border-radius: var(--radius-md);
    padding: var(--space-3);
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    color: var(--cobalt-300);
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
    font-size: var(--text-xs);
    font-weight: 600;
    margin-bottom: var(--space-1);
    color: var(--color-text-secondary);
  }
  .form-help {
    font-size: var(--text-xs);
    color: var(--color-text-muted);
    margin-top: var(--space-1);
  }
  .form-error {
    font-size: var(--text-xs);
    color: var(--red-300);
    margin-top: var(--space-2);
  }
  .form-input {
    width: 100%;
    background: var(--bg-input);
    border: 1px solid var(--border-hairline);
    color: var(--color-text);
    padding: var(--space-2) var(--space-3);
    min-height: 36px;
    border-radius: var(--radius-sm);
    font-family: inherit;
    font-size: var(--text-sm);
    transition: border-color var(--duration-fast) ease;
  }
  .form-input:focus { border-color: var(--color-accent); }
  .form-input[aria-invalid="true"] { border-color: var(--red-400); }
  .form-textarea {
    min-height: 140px;
    font-family: var(--font-mono);
    font-size: var(--text-xs);
    resize: vertical;
  }
  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: var(--color-primary);
    cursor: pointer;
  }

  /* Native Dialog Modals */
  dialog.modal {
    margin: auto;
    background: var(--dialog-bg);
    color: var(--color-text);
    border: 1px solid var(--border-strong);
    border-radius: var(--radius-lg);
    width: min(92vw, 540px);
    max-height: 86vh;
    overflow-y: auto;
    padding: var(--space-6);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.55);
    opacity: 0;
    transform: translateY(4px);
    transition: opacity var(--duration-fast) var(--ease-out), transform var(--duration-fast) var(--ease-out);
  }
  dialog.modal[open] { opacity: 1; transform: translateY(0); }
  @starting-style {
    dialog.modal[open] { opacity: 0; transform: translateY(4px); }
  }
  dialog.modal::backdrop {
    background: rgba(8, 10, 13, 0.78);
  }
  dialog.modal-sm { width: min(92vw, 420px); }
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3);
    margin-bottom: var(--space-4);
  }
  .modal-title { font-size: var(--text-md); font-weight: 600; }
  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: var(--space-2);
    margin-top: var(--space-6);
  }

  /* Alerts, Empty States & Toasts */
  .inline-alert {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    border-radius: var(--radius-md);
    font-size: var(--text-sm);
    margin-bottom: var(--space-4);
    border: 1px solid var(--color-danger-border);
    background: var(--color-danger-bg);
    color: var(--color-danger-text);
  }
  .empty-state {
    grid-column: 1 / -1;
    background: var(--card-bg);
    border: 1px dashed var(--border-strong);
    border-radius: var(--radius-lg);
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
    right: var(--space-4);
    bottom: var(--space-4);
    z-index: 2000;
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    max-width: min(92vw, 360px);
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
    background: var(--bg-elevated);
    border: 1px solid var(--border-strong);
    color: var(--color-text);
    font-size: var(--text-sm);
  }
  .toast-success { border-color: var(--color-success-border); }
  .toast-error   { border-color: var(--color-danger-border); }
  .toast-warning { border-color: var(--color-warning-border); }

  /* Responsive Breakpoints */
  @media (max-width: 960px) {
    .telemetry-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .split-playground { grid-template-columns: 1fr; }
    .tool-picker-list { max-height: 260px; }
  }

  @media (max-width: 768px) {
    header, .tablist, .container { padding-left: var(--space-4); padding-right: var(--space-4); }
    .grid-2col, .grid-drivers { grid-template-columns: 1fr; }
    .btn, .nav-btn, .tool-picker-item { min-height: 40px; }
  }

  @media (max-width: 480px) {
    .telemetry-strip { grid-template-columns: 1fr; }
    .catalog-grid { grid-template-columns: 1fr; }
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
