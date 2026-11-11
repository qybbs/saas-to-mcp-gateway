import { Request, Response } from 'express';
import { DASHBOARD_STYLES } from './ui/tokens';
import { DASHBOARD_ICONS } from './ui/icons';
import { getDashboardClientScript } from './ui/clientScript';

export const renderDashboardHtml = (req: Request, res: Response): void => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Unified Management Console for the Enterprise SaaS-to-MCP Gateway.">
  <title>SaaS-to-MCP Gateway Management Console</title>
  <style>${DASHBOARD_STYLES}</style>
</head>
<body>

  <header>
    <div class="brand">
      <div class="brand-mark">${DASHBOARD_ICONS.bolt}</div>
      <div>
        <h1>SaaS-to-MCP Gateway Hub</h1>
        <div class="brand-sub">Unified Multi-Agent AI Model Context Protocol Platform</div>
      </div>
    </div>
    <div class="header-meta">
      <span id="gatewayModeBadge" class="badge badge-primary">Personal Hub</span>
      <span id="sseStatusBadge" class="badge badge-gray" aria-live="polite">Connecting...</span>
      <span id="sseClientsBadge" class="badge badge-gray tabular">0 SSE Clients</span>
      <button id="authBtn" type="button" class="btn" data-action="open-auth">${DASHBOARD_ICONS.key} Admin Key</button>
    </div>
  </header>

  <nav class="tab-nav" aria-label="Primary navigation">
    <div class="tablist" role="tablist" aria-label="Gateway console sections">
      <button id="tab-btn-overview" type="button" class="nav-btn active" role="tab" aria-selected="true" aria-controls="tab-overview" tabindex="0" data-action="switch-tab" data-tab="overview">
        ${DASHBOARD_ICONS.activity} Overview &amp; Live Stream
      </button>
      <button id="tab-btn-marketplace" type="button" class="nav-btn" role="tab" aria-selected="false" aria-controls="tab-marketplace" tabindex="-1" data-action="switch-tab" data-tab="marketplace">
        ${DASHBOARD_ICONS.grid} 1-Click Marketplace &amp; Drivers
      </button>
      <button id="tab-btn-playground" type="button" class="nav-btn" role="tab" aria-selected="false" aria-controls="tab-playground" tabindex="-1" data-action="switch-tab" data-tab="playground">
        ${DASHBOARD_ICONS.terminal} Interactive Tool Playground
      </button>
      <button id="tab-btn-governance" type="button" class="nav-btn" role="tab" aria-selected="false" aria-controls="tab-governance" tabindex="-1" data-action="switch-tab" data-tab="governance">
        ${DASHBOARD_ICONS.shield} Governance &amp; FinOps Matrix
      </button>
      <button id="tab-btn-env" type="button" class="nav-btn" role="tab" aria-selected="false" aria-controls="tab-env" tabindex="-1" data-action="switch-tab" data-tab="env">
        ${DASHBOARD_ICONS.sliders} Environment &amp; Secrets
      </button>
    </div>
  </nav>

  <main class="container">

    <!-- TAB 1: OVERVIEW & LIVE STREAM -->
    <section id="tab-overview" class="tab-content active" role="tabpanel" aria-labelledby="tab-btn-overview">
      <div id="overviewAlert" class="inline-alert" role="alert" hidden>
        <span id="overviewAlertText"></span>
        <button type="button" class="btn" data-action="retry-overview">${DASHBOARD_ICONS.refresh} Retry</button>
      </div>

      <div class="grid-kpi">
        <div class="kpi-card">
          <div class="kpi-label">Active Drivers</div>
          <div id="kpiActiveDrivers" class="kpi-value tabular">-</div>
          <div id="kpiTotalDrivers" class="kpi-sub">Total Configured: -</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Aggregated Tools</div>
          <div id="kpiTotalTools" class="kpi-value tabular">-</div>
          <div class="kpi-sub">Namespaced {driver}_{tool}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Traffic Rate (RPM)</div>
          <div id="kpiRpm" class="kpi-value tabular">0</div>
          <div class="kpi-sub">Rolling 60s window</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Avg Tool Latency</div>
          <div id="kpiAvgLatency" class="kpi-value tabular">0 ms</div>
          <div class="kpi-sub">Execution duration</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total FinOps Usage</div>
          <div id="kpiBytesBilled" class="kpi-value tabular">0 B</div>
          <div class="kpi-sub">Aggregated cloud queries</div>
        </div>
      </div>

      <div class="section-title">
        <h2>Active Outbound Drivers</h2>
        <div class="section-actions">
          <button type="button" class="btn btn-primary" data-action="start-all">${DASHBOARD_ICONS.play} Start All</button>
          <button type="button" class="btn btn-danger" data-action="stop-all">${DASHBOARD_ICONS.stop} Stop All</button>
          <button type="button" class="btn btn-primary" data-action="switch-tab" data-tab="marketplace">${DASHBOARD_ICONS.plus} Add Driver</button>
        </div>
      </div>
      <div id="driversGrid" class="grid-drivers">
        <div class="empty-state">Loading outbound drivers...</div>
      </div>

      <div class="section-title">
        <h2>Real-Time Audit Stream &amp; Execution Log</h2>
        <div class="section-actions">
          <button type="button" class="btn" data-action="clear-logs">${DASHBOARD_ICONS.trash} Clear History</button>
          <button type="button" class="btn" data-action="refresh-logs">${DASHBOARD_ICONS.refresh} Refresh</button>
        </div>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Time</th>
              <th>Status</th>
              <th>User / Agent</th>
              <th>Adapter</th>
              <th>Tool Executed</th>
              <th>Latency</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody id="logsTableBody">
            <tr><td colspan="7" class="cell-empty">Listening for live MCP tool invocations...</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- TAB 2: MARKETPLACE & DRIVERS -->
    <section id="tab-marketplace" class="tab-content" role="tabpanel" aria-labelledby="tab-btn-marketplace" hidden>
      <div class="catalog-filters">
        <div class="search-wrap">
          <label for="catalogSearch" class="sr-only">Search drivers</label>
          <input type="search" id="catalogSearch" class="search-input" placeholder="Search drivers by name, capability...">
        </div>
        <button type="button" class="btn filter-chip is-active" aria-pressed="true" data-action="catalog-category" data-category="All">All</button>
        <button type="button" class="btn filter-chip" aria-pressed="false" data-action="catalog-category" data-category="Installed">Installed</button>
        <button type="button" class="btn filter-chip" aria-pressed="false" data-action="catalog-category" data-category="Data & Analytics">Data &amp; Analytics</button>
        <button type="button" class="btn filter-chip" aria-pressed="false" data-action="catalog-category" data-category="Observability & Quality">Observability &amp; Quality</button>
        <button type="button" class="btn filter-chip" aria-pressed="false" data-action="catalog-category" data-category="Dev & Knowledge">Dev &amp; Knowledge</button>
        <button type="button" class="btn filter-chip" aria-pressed="false" data-action="catalog-category" data-category="Automation & Web">Automation &amp; Web</button>
        <button type="button" class="btn" style="margin-left: auto;" data-action="open-custom">${DASHBOARD_ICONS.plus} Custom Driver</button>
      </div>

      <div id="catalogGrid" class="catalog-grid">
        <div class="empty-state">Loading MCP driver catalog...</div>
      </div>
    </section>

    <!-- TAB 3: PLAYGROUND -->
    <section id="tab-playground" class="tab-content" role="tabpanel" aria-labelledby="tab-btn-playground" hidden>
      <div class="split-playground">
        <div class="card-panel">
          <h2>Select MCP Tool</h2>
          <label for="playgroundToolFilter" class="sr-only">Filter MCP tools</label>
          <input type="search" id="playgroundToolFilter" class="form-input" placeholder="Filter tools..." style="margin-bottom: 12px;">
          <div id="playgroundToolList" class="tool-picker-list">
            <div class="form-help">Loading tools...</div>
          </div>
        </div>

        <div class="card-panel" style="display: flex; flex-direction: column; gap: 16px;">
          <div class="playground-header">
            <div style="min-width: 0; flex: 1;">
              <h2 id="pgToolTitle" class="playground-title">Select a tool to test</h2>
              <div id="pgToolDesc" class="playground-desc">Choose any of the registered downstream tools on the left.</div>
            </div>
            <button id="pgExecuteBtn" type="button" class="btn btn-primary" data-action="execute-pg" disabled>${DASHBOARD_ICONS.play} Execute Tool</button>
          </div>

          <div class="grid-2col" style="margin-bottom: 0;">
            <div class="form-group" style="margin-bottom: 0;">
              <label for="pgSimAdapter" class="form-label">Simulate Inbound Adapter</label>
              <select id="pgSimAdapter" class="form-input">
                <option value="generic">generic (SSE &amp; HTTP)</option>
                <option value="atlassian">atlassian (OAuth 2.1 RFC 7591)</option>
                <option value="openai">openai (OpenAPI 3.1 REST)</option>
                <option value="admin_unrestricted">Unrestricted Admin</option>
              </select>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
              <label for="pgSimUser" class="form-label">Simulate User Email</label>
              <input type="email" id="pgSimUser" class="form-input" value="developer@localhost">
            </div>
          </div>

          <div>
            <div class="section-title" style="margin-bottom: 8px;">
              <label for="pgArgsInput" class="form-label" style="margin-bottom: 0;">Tool Input Arguments (JSON)</label>
              <div class="section-actions">
                <button id="pgFormatBtn" type="button" class="btn" data-action="format-pg-json">Format JSON</button>
                <button id="pgResetSampleBtn" type="button" class="btn" data-action="reset-pg-json" disabled>Reset Sample</button>
                <span id="pgSchemaBadge" class="badge badge-gray">Schema Ready</span>
              </div>
            </div>
            <textarea id="pgArgsInput" class="form-input form-textarea" placeholder="{}" aria-describedby="pgJsonError"></textarea>
            <div id="pgJsonError" class="form-error" role="alert" hidden></div>
          </div>

          <div>
            <div class="section-title" style="margin-bottom: 8px;">
              <span class="form-label" style="margin-bottom: 0;">Execution Result</span>
              <div class="section-actions">
                <span id="pgDurationBadge" class="badge badge-gray tabular">- ms</span>
                <button id="pgCopyOutputBtn" type="button" class="btn" data-action="copy-pg-output">${DASHBOARD_ICONS.copy} Copy</button>
              </div>
            </div>
            <pre id="pgOutput" class="code-block" aria-live="polite">// Output will be displayed here...</pre>
          </div>
        </div>
      </div>
    </section>

    <!-- TAB 4: GOVERNANCE & FINOPS -->
    <section id="tab-governance" class="tab-content" role="tabpanel" aria-labelledby="tab-btn-governance" hidden>
      <div class="grid-2col">
        <div class="card-panel">
          <h2>Rate Limiting Guardrails</h2>
          <div class="form-group">
            <label for="govMaxRequests" class="form-label">Max Requests per Window</label>
            <input type="number" id="govMaxRequests" class="form-input tabular" min="0" placeholder="0 = Unlimited (Personal Mode)">
            <div class="form-help">Set to 0 to disable rate limiting for local personal development.</div>
          </div>
          <div class="form-group">
            <label for="govWindowMs" class="form-label">Window Duration (ms)</label>
            <input type="number" id="govWindowMs" class="form-input tabular" min="1000" step="1000" placeholder="60000">
            <div class="form-help">Sliding window duration in milliseconds (default 60,000ms = 1 min).</div>
          </div>
          <button type="button" class="btn btn-primary" data-action="save-governance">${DASHBOARD_ICONS.save} Save Rate Limits</button>
        </div>

        <div class="card-panel">
          <h2>Daily User Query Budget (FinOps)</h2>
          <div class="form-group">
            <label for="govMaxDailyBytes" class="form-label">Max Bytes Billed Per User / Day</label>
            <input type="number" id="govMaxDailyBytes" class="form-input tabular" min="0" placeholder="0 = Unlimited">
            <div id="govDailyBytesFormatted" class="form-help">0 = Unlimited (Personal Mode). (e.g. 1073741824 = 1 GB)</div>
          </div>
          <div class="section-actions" style="margin-top: 16px;">
            <button type="button" class="btn" data-action="preset-budget" data-bytes="0">Preset: Unlimited</button>
            <button type="button" class="btn" data-action="preset-budget" data-bytes="1073741824">Preset: 1 GB</button>
            <button type="button" class="btn" data-action="preset-budget" data-bytes="5368709120">Preset: 5 GB</button>
          </div>
          <button type="button" class="btn btn-primary" style="margin-top: 16px;" data-action="save-governance">${DASHBOARD_ICONS.save} Save Budget Quota</button>
        </div>
      </div>

      <div class="section-title">
        <h2>Inbound-to-Outbound Permission Matrix</h2>
        <button type="button" class="btn btn-primary" data-action="save-matrix">${DASHBOARD_ICONS.save} Save Matrix</button>
      </div>
      <div class="table-container" style="margin-bottom: 32px;">
        <table id="matrixTable">
          <thead>
            <tr>
              <th>Outbound Driver</th>
              <th class="cell-center">generic (IDE Agents)</th>
              <th class="cell-center">atlassian (Rovo)</th>
              <th class="cell-center">openai (Custom GPTs)</th>
            </tr>
          </thead>
          <tbody id="matrixTableBody">
            <tr><td colspan="4" class="cell-empty">Loading driver permissions...</td></tr>
          </tbody>
        </table>
      </div>

      <div class="section-title">
        <h2>Active User Daily Quota Usage</h2>
        <button type="button" class="btn btn-danger" data-action="reset-all-quotas">${DASHBOARD_ICONS.trash} Reset All Quotas</button>
      </div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>User Email</th>
              <th>Date (UTC)</th>
              <th>Bytes Used Today</th>
              <th>Max Quota</th>
              <th>Remaining</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="quotaUsersTableBody">
            <tr><td colspan="6" class="cell-empty">No daily quota consumed yet today.</td></tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- TAB 5: ENVIRONMENT & SECRETS -->
    <section id="tab-env" class="tab-content" role="tabpanel" aria-labelledby="tab-btn-env" hidden>
      <div class="section-title">
        <h2>Environment Variables &amp; Secret Vault (.env)</h2>
        <button type="button" class="btn btn-primary" data-action="save-env">${DASHBOARD_ICONS.save} Save Variables</button>
      </div>
      <p class="section-desc">
        Configure API tokens, database connection URIs, and system keys directly in the browser. Values are saved to <code class="mono">.env</code> and updated in memory without restarting the gateway.
      </p>
      <form id="envForm" class="table-container" style="margin-bottom: 24px;">
        <table>
          <thead>
            <tr>
              <th style="width: 280px;">Variable Name</th>
              <th style="width: 140px;">Status</th>
              <th style="width: 260px;">Current Value</th>
              <th>Set New Value</th>
            </tr>
          </thead>
          <tbody id="envTableBody">
            <tr><td colspan="4" class="cell-empty">Loading environment variables...</td></tr>
          </tbody>
        </table>
      </form>
    </section>

  </main>

  <!-- DIALOG: Install Catalog Driver -->
  <dialog id="installModal" class="modal" aria-labelledby="modalCatalogTitle">
    <div class="modal-header">
      <h3 id="modalCatalogTitle" class="modal-title">Install Driver</h3>
      <button type="button" class="btn btn-icon" aria-label="Close modal" data-action="close-dialog" data-dialog="installModal">${DASHBOARD_ICONS.close}</button>
    </div>
    <p id="modalCatalogDesc" class="section-desc"></p>
    <form id="installForm">
      <input type="hidden" id="modalDriverId">
      <div id="modalEnvVarsContainer"></div>
      <div class="modal-footer">
        <button type="button" class="btn" data-action="close-dialog" data-dialog="installModal">Cancel</button>
        <button type="submit" class="btn btn-primary">Install &amp; Start Driver</button>
      </div>
    </form>
  </dialog>

  <!-- DIALOG: Custom Driver -->
  <dialog id="customDriverModal" class="modal" aria-labelledby="customDriverModalTitle">
    <div class="modal-header">
      <h3 id="customDriverModalTitle" class="modal-title">Add Custom MCP Driver</h3>
      <button type="button" class="btn btn-icon" aria-label="Close modal" data-action="close-dialog" data-dialog="customDriverModal">${DASHBOARD_ICONS.close}</button>
    </div>
    <form id="customDriverForm">
      <div class="form-group">
        <label for="customName" class="form-label">Driver Identifier</label>
        <input type="text" id="customName" class="form-input" placeholder="e.g. internal-db" required>
      </div>
      <div class="form-group">
        <label for="customType" class="form-label">Driver Type</label>
        <select id="customType" class="form-input">
          <option value="stdio">stdio (Local Subprocess)</option>
          <option value="sse">sse (Remote HTTP / SSE)</option>
        </select>
      </div>
      <div id="customStdioGroup">
        <div class="form-group">
          <label for="customCommand" class="form-label">Command</label>
          <input type="text" id="customCommand" class="form-input" placeholder="e.g. npx or python">
        </div>
        <div class="form-group">
          <label for="customArgs" class="form-label">Arguments (space separated)</label>
          <input type="text" id="customArgs" class="form-input" placeholder="e.g. -y @org/my-mcp-server">
        </div>
      </div>
      <div id="customSseGroup" hidden>
        <div class="form-group">
          <label for="customUrl" class="form-label">SSE URL</label>
          <input type="url" id="customUrl" class="form-input" placeholder="http://localhost:4000/sse">
        </div>
      </div>
      <div class="form-group">
        <label for="customTimeout" class="form-label">Timeout (e.g. 30s or 15000ms)</label>
        <input type="text" id="customTimeout" class="form-input" placeholder="30s">
      </div>
      <div class="modal-footer">
        <button type="button" class="btn" data-action="close-dialog" data-dialog="customDriverModal">Cancel</button>
        <button type="submit" class="btn btn-primary">Save &amp; Register</button>
      </div>
    </form>
  </dialog>

  <!-- DIALOG: Admin Key -->
  <dialog id="authModal" class="modal modal-sm" aria-labelledby="authModalTitle">
    <div class="modal-header">
      <h3 id="authModalTitle" class="modal-title">Admin Authentication</h3>
      <button type="button" class="btn btn-icon" aria-label="Close modal" data-action="close-dialog" data-dialog="authModal">${DASHBOARD_ICONS.close}</button>
    </div>
    <p class="section-desc">
      Enter your <code class="mono">ADMIN_API_KEY</code> to unlock governance, playground execution, and driver configuration.
    </p>
    <form id="authModalForm">
      <div class="form-group">
        <label for="adminKeyInput" class="form-label">Admin API Key</label>
        <input type="password" id="adminKeyInput" class="form-input" autocomplete="current-password" placeholder="Enter key...">
        <div id="authErrorMsg" class="form-error" role="alert" hidden></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn" data-action="close-dialog" data-dialog="authModal">Cancel</button>
        <button type="submit" class="btn btn-primary">Save &amp; Unlock</button>
      </div>
    </form>
  </dialog>

  <!-- DIALOG: Destructive Confirmation -->
  <dialog id="confirmModal" class="modal modal-sm" aria-labelledby="confirmModalTitle">
    <div class="modal-header">
      <h3 id="confirmModalTitle" class="modal-title">Confirm Action</h3>
      <button type="button" class="btn btn-icon" aria-label="Close modal" data-action="close-dialog" data-dialog="confirmModal">${DASHBOARD_ICONS.close}</button>
    </div>
    <p id="confirmModalMessage" class="section-desc"></p>
    <div class="modal-footer">
      <button id="confirmModalCancelBtn" type="button" class="btn" data-action="close-dialog" data-dialog="confirmModal">Cancel</button>
      <button id="confirmModalAcceptBtn" type="button" class="btn btn-danger" data-action="confirm-accept">Confirm</button>
    </div>
  </dialog>

  <div id="toastRegion" class="toast-region" aria-live="polite" aria-relevant="additions"></div>

  <script>${getDashboardClientScript()}</script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
};
