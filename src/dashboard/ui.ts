import { Request, Response } from 'express';

export const renderDashboardHtml = (req: Request, res: Response): void => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SaaS-to-MCP Gateway Management Console</title>
  <style>
    :root {
      --bg-dark: #0f172a;
      --bg-card: #1e293b;
      --bg-card-hover: #273549;
      --bg-input: #0b1120;
      --border: #334155;
      --border-focus: #3b82f6;
      --text: #f8fafc;
      --text-muted: #94a3b8;
      --primary: #3b82f6;
      --primary-hover: #2563eb;
      --success: #10b981;
      --success-bg: rgba(16, 185, 129, 0.15);
      --warning: #f59e0b;
      --warning-bg: rgba(245, 158, 11, 0.15);
      --danger: #ef4444;
      --danger-bg: rgba(239, 68, 68, 0.15);
      --accent: #8b5cf6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg-dark);
      color: var(--text);
      line-height: 1.5;
      padding-bottom: 40px;
    }
    header {
      background: rgba(30, 41, 59, 0.8);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 100;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .brand { display: flex; align-items: center; gap: 12px; }
    .brand h1 { font-size: 1.15rem; font-weight: 700; letter-spacing: -0.02em; }
    .badge {
      font-size: 0.75rem;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 9999px;
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    .badge-primary { background: rgba(59, 130, 246, 0.2); color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.4); }
    .badge-success { background: var(--success-bg); color: #6ee7b7; border: 1px solid rgba(16, 185, 129, 0.4); }
    .badge-danger { background: var(--danger-bg); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.4); }
    .badge-warning { background: var(--warning-bg); color: #fcd34d; border: 1px solid rgba(245, 158, 11, 0.4); }
    .badge-gray { background: #334155; color: #cbd5e1; }

    nav { display: flex; gap: 6px; padding: 12px 24px; background: #131d31; border-bottom: 1px solid var(--border); }
    .nav-btn {
      background: transparent;
      border: none;
      color: var(--text-muted);
      font-size: 0.875rem;
      font-weight: 600;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.15s ease;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .nav-btn:hover { color: var(--text); background: var(--bg-card); }
    .nav-btn.active { color: #fff; background: var(--primary); }

    .container { max-width: 1400px; margin: 24px auto; padding: 0 24px; }
    .tab-content { display: none; }
    .tab-content.active { display: block; }

    .grid-kpi {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .kpi-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .kpi-label { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted); }
    .kpi-value { font-size: 1.75rem; font-weight: 700; color: #fff; }
    .kpi-sub { font-size: 0.75rem; color: var(--text-muted); }

    .section-title {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .grid-drivers {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .driver-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      transition: transform 0.15s ease, border-color 0.15s ease;
    }
    .driver-card:hover { border-color: #475569; transform: translateY(-2px); }
    .driver-header { display: flex; justify-content: space-between; align-items: center; }
    .driver-name { font-size: 1rem; font-weight: 600; display: flex; align-items: center; gap: 8px; }
    .driver-details { font-size: 0.8rem; color: var(--text-muted); word-break: break-all; }
    .driver-actions { display: flex; gap: 8px; margin-top: auto; }

    .btn {
      padding: 6px 12px;
      font-size: 0.8rem;
      font-weight: 600;
      border-radius: 6px;
      border: 1px solid var(--border);
      cursor: pointer;
      background: #1e293b;
      color: #e2e8f0;
      transition: all 0.15s;
    }
    .btn:hover { background: #334155; }
    .btn-primary { background: var(--primary); border-color: var(--primary); color: #fff; }
    .btn-primary:hover { background: var(--primary-hover); }
    .btn-danger { background: var(--danger-bg); border-color: rgba(239, 68, 68, 0.4); color: #fca5a5; }
    .btn-danger:hover { background: #ef4444; color: #fff; }

    .table-container {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      overflow-x: auto;
    }
    table { width: 100%; border-collapse: collapse; text-align: left; font-size: 0.85rem; }
    th { background: #131d31; padding: 12px 16px; color: var(--text-muted); font-weight: 600; border-bottom: 1px solid var(--border); }
    td { padding: 12px 16px; border-bottom: 1px solid #233147; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: #233147; }

    .catalog-filters { display: flex; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }
    .search-input {
      background: var(--bg-input);
      border: 1px solid var(--border);
      color: #fff;
      padding: 8px 14px;
      border-radius: 8px;
      font-size: 0.875rem;
      min-width: 260px;
    }
    .search-input:focus { outline: none; border-color: var(--border-focus); }

    .catalog-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(310px, 1fr));
      gap: 16px;
    }
    .catalog-item-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(4px);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: 14px;
      width: 90%;
      max-width: 580px;
      max-height: 85vh;
      overflow-y: auto;
      padding: 24px;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.5);
    }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
    .modal-title { font-size: 1.15rem; font-weight: 700; }
    .form-group { margin-bottom: 14px; }
    .form-label { display: block; font-size: 0.8rem; font-weight: 600; margin-bottom: 6px; color: #cbd5e1; }
    .form-help { font-size: 0.72rem; color: var(--text-muted); margin-top: 4px; }
    .form-input {
      width: 100%;
      background: var(--bg-input);
      border: 1px solid var(--border);
      color: #fff;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.85rem;
    }
    .form-input:focus { outline: none; border-color: var(--border-focus); }

    .code-block {
      background: #090d16;
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 12px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.8rem;
      color: #93c5fd;
      overflow-x: auto;
      max-height: 380px;
    }
    .status-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
    .status-dot.green { background: #10b981; box-shadow: 0 0 8px #10b981; }
    .status-dot.red { background: #ef4444; box-shadow: 0 0 8px #ef4444; }
    .status-dot.gray { background: #64748b; }
    .status-dot.yellow { background: #f59e0b; box-shadow: 0 0 8px #f59e0b; }
  </style>
</head>
<body>

  <header>
    <div class="brand">
      <span style="font-size: 1.5rem;">⚡</span>
      <div>
        <h1>SaaS-to-MCP Gateway Hub</h1>
        <div style="font-size: 0.75rem; color: var(--text-muted);">Unified Multi-Agent AI Model Context Protocol Platform</div>
      </div>
    </div>
    <div style="display: flex; align-items: center; gap: 12px;">
      <span id="gatewayModeBadge" class="badge badge-primary">Personal Hub</span>
      <span id="sseClientsBadge" class="badge badge-gray">0 SSE Clients</span>
      <button id="authBtn" class="btn" onclick="openAuthModal()">🔑 Admin Key</button>
    </div>
  </header>

  <nav>
    <button class="nav-btn active" onclick="switchTab('overview')">📊 Overview & Live Stream</button>
    <button class="nav-btn" onclick="switchTab('marketplace')">🛍️ 1-Click Marketplace & Drivers</button>
    <button class="nav-btn" onclick="switchTab('playground')">🎮 Interactive Tool Playground</button>
    <button class="nav-btn" onclick="switchTab('governance')">🛡️ Governance & FinOps Matrix</button>
    <button class="nav-btn" onclick="switchTab('env')">⚙️ Environment & Secrets</button>
  </nav>

  <div class="container">

    <!-- TAB 1: OVERVIEW & LIVE STREAM -->
    <div id="tab-overview" class="tab-content active">
      <div class="grid-kpi">
        <div class="kpi-card">
          <div class="kpi-label">Active Drivers</div>
          <div id="kpiActiveDrivers" class="kpi-value">-</div>
          <div id="kpiTotalDrivers" class="kpi-sub">Total Configured: -</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Aggregated Tools</div>
          <div id="kpiTotalTools" class="kpi-value">-</div>
          <div class="kpi-sub">Namespaced {driver}_{tool}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Traffic Rate (RPM)</div>
          <div id="kpiRpm" class="kpi-value">0</div>
          <div class="kpi-sub">Rolling 60s window</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Avg Tool Latency</div>
          <div id="kpiAvgLatency" class="kpi-value">0 ms</div>
          <div class="kpi-sub">Execution duration</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total FinOps Usage</div>
          <div id="kpiBytesBilled" class="kpi-value">0 B</div>
          <div class="kpi-sub">Aggregated cloud queries</div>
        </div>
      </div>

      <div class="section-title">
        <span>Active Outbound Drivers</span>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-primary" onclick="startAllDrivers()">▶ Start All</button>
          <button class="btn btn-danger" onclick="stopAllDrivers()">⏹ Stop All</button>
          <button class="btn btn-primary" onclick="switchTab('marketplace')">+ Add Driver</button>
        </div>
      </div>
      <div id="driversGrid" class="grid-drivers">
        <!-- Injected via JavaScript -->
      </div>

      <div class="section-title">
        <span>Real-Time Audit Stream & Execution Log</span>
        <div style="display: flex; gap: 8px;">
          <button class="btn" onclick="clearLogs()">Clear History</button>
          <button class="btn" onclick="fetchLogs()">Refresh</button>
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
            <tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">Listening for live MCP tool invocations...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 2: MARKETPLACE & DRIVERS -->
    <div id="tab-marketplace" class="tab-content">
      <div class="catalog-filters">
        <input type="text" id="catalogSearch" class="search-input" placeholder="Search drivers by name, capability..." oninput="filterCatalog()">
        <button class="btn btn-primary" onclick="setCatalogCategory('All')">All</button>
        <button class="btn" onclick="setCatalogCategory('Installed')">Installed</button>
        <button class="btn" onclick="setCatalogCategory('Data & Analytics')">Data & Analytics</button>
        <button class="btn" onclick="setCatalogCategory('Observability & Quality')">Observability & Quality</button>
        <button class="btn" onclick="setCatalogCategory('Dev & Knowledge')">Dev & Knowledge</button>
        <button class="btn" onclick="setCatalogCategory('Automation & Web')">Automation & Web</button>
        <button class="btn" style="margin-left: auto;" onclick="openCustomDriverModal()">+ Custom Driver</button>
      </div>

      <div id="catalogGrid" class="catalog-grid">
        <!-- Injected via JavaScript -->
      </div>
    </div>

    <!-- TAB 3: PLAYGROUND -->
    <div id="tab-playground" class="tab-content">
      <div style="display: grid; grid-template-columns: 320px 1fr; gap: 20px;">
        <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 16px;">
          <h3 style="font-size: 0.95rem; margin-bottom: 12px;">Select MCP Tool</h3>
          <input type="text" id="playgroundToolFilter" class="form-input" placeholder="Filter tools..." oninput="filterPlaygroundTools()" style="margin-bottom: 12px;">
          <div id="playgroundToolList" style="max-height: 550px; overflow-y: auto; display: flex; flex-direction: column; gap: 4px;">
            <!-- Injected via JS -->
          </div>
        </div>

        <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 20px; display: flex; flex-direction: column; gap: 16px;">
          <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding-bottom: 12px;">
            <div>
              <h2 id="pgToolTitle" style="font-size: 1.15rem; font-weight: 700;">Select a tool to test</h2>
              <div id="pgToolDesc" style="font-size: 0.85rem; color: var(--text-muted); margin-top: 4px;">Choose any of the registered downstream tools on the left.</div>
            </div>
            <button id="pgExecuteBtn" class="btn btn-primary" onclick="executePlaygroundTool()" disabled>▶ Execute Tool</button>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group">
              <label class="form-label">Simulate Inbound Adapter</label>
              <select id="pgSimAdapter" class="form-input">
                <option value="generic">generic (SSE & HTTP)</option>
                <option value="atlassian">atlassian (OAuth 2.1 RFC 7591)</option>
                <option value="openai">openai (OpenAPI 3.1 REST)</option>
                <option value="admin_unrestricted">Unrestricted Admin</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Simulate User Email</label>
              <input type="text" id="pgSimUser" class="form-input" value="developer@localhost">
            </div>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <label class="form-label">Tool Input Arguments (JSON)</label>
              <span id="pgSchemaBadge" class="badge badge-gray">Schema Ready</span>
            </div>
            <textarea id="pgArgsInput" class="form-input" style="height: 140px; font-family: monospace; font-size: 0.85rem;" placeholder="{}"></textarea>
          </div>

          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <label class="form-label">Execution Result</label>
              <span id="pgDurationBadge" class="badge badge-gray">- ms</span>
            </div>
            <pre id="pgOutput" class="code-block" style="min-height: 160px;">// Output will be displayed here...</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 4: GOVERNANCE & FINOPS -->
    <div id="tab-governance" class="tab-content">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 24px;">
        <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 20px;">
          <h3 style="font-size: 1rem; margin-bottom: 12px;">Rate Limiting Guardrails</h3>
          <div class="form-group">
            <label class="form-label">Max Requests per Window</label>
            <input type="number" id="govMaxRequests" class="form-input" min="0" placeholder="0 = Unlimited (Personal Mode)">
            <div class="form-help">Set to 0 to completely disable rate limiting for local personal development.</div>
          </div>
          <div class="form-group">
            <label class="form-label">Window Duration (ms)</label>
            <input type="number" id="govWindowMs" class="form-input" min="1000" step="1000" placeholder="60000">
            <div class="form-help">Sliding window duration in milliseconds (default 60,000ms = 1 min).</div>
          </div>
          <button class="btn btn-primary" onclick="saveGovernanceSettings()">Save Rate Limits</button>
        </div>

        <div style="background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 20px;">
          <h3 style="font-size: 1rem; margin-bottom: 12px;">Daily User Query Budget (FinOps)</h3>
          <div class="form-group">
            <label class="form-label">Max Bytes Billed Per User / Day</label>
            <input type="number" id="govMaxDailyBytes" class="form-input" min="0" placeholder="0 = Unlimited">
            <div id="govDailyBytesFormatted" class="form-help">0 = Unlimited (Personal Mode). (e.g. 1073741824 = 1 GB)</div>
          </div>
          <div style="display: flex; gap: 8px; margin-top: 24px;">
            <button class="btn" onclick="setPresetBudget(0)">Preset: Unlimited</button>
            <button class="btn" onclick="setPresetBudget(1073741824)">Preset: 1 GB</button>
            <button class="btn" onclick="setPresetBudget(5368709120)">Preset: 5 GB</button>
          </div>
          <button class="btn btn-primary" style="margin-top: 16px;" onclick="saveGovernanceSettings()">Save Budget Quota</button>
        </div>
      </div>

      <div class="section-title">
        <span>Inbound-to-Outbound Permission Matrix</span>
        <button class="btn btn-primary" onclick="savePermissionMatrix()">Save Matrix</button>
      </div>
      <div class="table-container" style="margin-bottom: 32px;">
        <table id="matrixTable">
          <thead>
            <tr>
              <th>Outbound Driver</th>
              <th style="text-align: center;">generic (IDE Agents)</th>
              <th style="text-align: center;">atlassian (Rovo)</th>
              <th style="text-align: center;">openai (Custom GPTs)</th>
            </tr>
          </thead>
          <tbody id="matrixTableBody">
            <!-- Injected via JS -->
          </tbody>
        </table>
      </div>

      <div class="section-title">
        <span>Active User Daily Quota Usage</span>
        <button class="btn btn-danger" onclick="resetAllQuotas()">Reset All Quotas</button>
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
            <tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 16px;">No daily quota consumed yet today.</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- TAB 5: ENVIRONMENT & SECRETS -->
    <div id="tab-env" class="tab-content">
      <div class="section-title">
        <span>Environment Variables & Secret Vault (.env)</span>
        <button class="btn btn-primary" onclick="saveEnvSettings()">💾 Save Variables</button>
      </div>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
        Configure API tokens, database connection URIs, and system keys directly in the browser. Values are saved to <code>.env</code> and updated in memory without restarting the gateway.
      </p>
      <div class="table-container" style="margin-bottom: 24px;">
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
            <tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">Loading environment variables...</td></tr>
          </tbody>
        </table>
      </div>
    </div>

  </div>

  <!-- MODAL: Install Catalog Driver -->
  <div id="installModal" class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <h3 id="modalCatalogTitle" class="modal-title">Install Driver</h3>
        <button class="btn" onclick="closeModal('installModal')">✕</button>
      </div>
      <div id="modalCatalogDesc" style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;"></div>
      <form id="installForm" onsubmit="submitInstallCatalogDriver(event)">
        <input type="hidden" id="modalDriverId">
        <div id="modalEnvVarsContainer"></div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;">
          <button type="button" class="btn" onclick="closeModal('installModal')">Cancel</button>
          <button type="submit" class="btn btn-primary">Install & Start Driver</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: Custom Driver -->
  <div id="customDriverModal" class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <h3 class="modal-title">Add Custom MCP Driver</h3>
        <button class="btn" onclick="closeModal('customDriverModal')">✕</button>
      </div>
      <form id="customDriverForm" onsubmit="submitCustomDriver(event)">
        <div class="form-group">
          <label class="form-label">Driver Identifier</label>
          <input type="text" id="customName" class="form-input" placeholder="e.g. internal-db" required>
        </div>
        <div class="form-group">
          <label class="form-label">Driver Type</label>
          <select id="customType" class="form-input" onchange="toggleCustomFields()">
            <option value="stdio">stdio (Local Subprocess)</option>
            <option value="sse">sse (Remote HTTP / SSE)</option>
          </select>
        </div>
        <div id="customStdioGroup">
          <div class="form-group">
            <label class="form-label">Command</label>
            <input type="text" id="customCommand" class="form-input" placeholder="e.g. npx or python">
          </div>
          <div class="form-group">
            <label class="form-label">Arguments (space separated)</label>
            <input type="text" id="customArgs" class="form-input" placeholder="e.g. -y @org/my-mcp-server">
          </div>
        </div>
        <div id="customSseGroup" style="display: none;">
          <div class="form-group">
            <label class="form-label">SSE URL</label>
            <input type="url" id="customUrl" class="form-input" placeholder="http://localhost:4000/sse">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">Timeout (e.g. 30s or 15000ms)</label>
          <input type="text" id="customTimeout" class="form-input" placeholder="30s">
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;">
          <button type="button" class="btn" onclick="closeModal('customDriverModal')">Cancel</button>
          <button type="submit" class="btn btn-primary">Save & Register</button>
        </div>
      </form>
    </div>
  </div>

  <!-- MODAL: Admin Key -->
  <div id="authModal" class="modal-overlay">
    <div class="modal" style="max-width: 440px;">
      <div class="modal-header">
        <h3 class="modal-title">Admin Authentication</h3>
        <button class="btn" onclick="closeModal('authModal')">✕</button>
      </div>
      <p style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 16px;">
        Enter your ADMIN_API_KEY to unlock full governance, playground execution, and driver configuration.
      </p>
      <div class="form-group">
        <label class="form-label">Admin API Key</label>
        <input type="password" id="adminKeyInput" class="form-input" placeholder="Enter key...">
      </div>
      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 20px;">
        <button type="button" class="btn" onclick="closeModal('authModal')">Cancel</button>
        <button type="button" class="btn btn-primary" onclick="saveAdminKey()">Save & Unlock</button>
      </div>
    </div>
  </div>

  <script>
    let adminKey = sessionStorage.getItem('GATEWAY_ADMIN_KEY') || '';
    let eventSource = null;
    let cachedOverview = null;
    let cachedCatalog = [];
    let cachedTools = [];
    let activeCategory = 'All';
    let selectedPlaygroundTool = null;

    function getHeaders() {
      const headers = { 'Content-Type': 'application/json' };
      if (adminKey) {
        headers['x-admin-key'] = adminKey;
      }
      return headers;
    }

    function switchTab(tabId) {
      document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
      
      const tabEl = document.getElementById('tab-' + tabId);
      if (tabEl) tabEl.classList.add('active');

      const btn = Array.from(document.querySelectorAll('.nav-btn')).find(b => b.getAttribute('onclick')?.includes(tabId));
      if (btn) btn.classList.add('active');

      if (tabId === 'overview') fetchOverview();
      else if (tabId === 'marketplace') fetchCatalog();
      else if (tabId === 'playground') fetchToolsForPlayground();
      else if (tabId === 'governance') fetchGovernanceData();
      else if (tabId === 'env') fetchEnvData();
    }

    async function checkAuthStatus() {
      try {
        const res = await fetch('/api/admin/auth-status', { headers: getHeaders() });
        if (res.status === 401) {
          openAuthModal();
        } else {
          const data = await res.json();
          document.getElementById('gatewayModeBadge').textContent = data.mode;
        }
      } catch (e) {
        console.error('Auth check error', e);
      }
    }

    function openAuthModal() {
      document.getElementById('adminKeyInput').value = adminKey;
      document.getElementById('authModal').style.display = 'flex';
    }

    function saveAdminKey() {
      adminKey = document.getElementById('adminKeyInput').value.trim();
      sessionStorage.setItem('GATEWAY_ADMIN_KEY', adminKey);
      closeModal('authModal');
      initSse();
      fetchOverview();
    }

    function closeModal(id) {
      document.getElementById(id).style.display = 'none';
    }

    // Real-Time SSE Stream Initialization
    function initSse() {
      if (eventSource) {
        eventSource.close();
      }
      const sseUrl = adminKey ? ('/api/admin/events?adminKey=' + encodeURIComponent(adminKey)) : '/api/admin/events';
      eventSource = new EventSource(sseUrl);

      eventSource.addEventListener('audit_log', (e) => {
        try {
          const log = JSON.parse(e.data);
          prependAuditLogRow(log);
        } catch (err) { console.error(err); }
      });

      eventSource.addEventListener('driver_status', (e) => {
        try {
          fetchOverview();
        } catch (err) { console.error(err); }
      });

      eventSource.addEventListener('metrics', (e) => {
        try {
          const metrics = JSON.parse(e.data);
          updateMetricsUI(metrics);
        } catch (err) { console.error(err); }
      });

      eventSource.onerror = () => {
        console.warn('SSE connection closed or reconnecting...');
      };
    }

    function prependAuditLogRow(log) {
      const tbody = document.getElementById('logsTableBody');
      const emptyRow = tbody.querySelector('td[colspan]');
      if (emptyRow) tbody.innerHTML = '';

      const tr = document.createElement('tr');
      const statusBadge = log.audit.status === 'SUCCESS'
        ? '<span class="badge badge-success">SUCCESS</span>'
        : log.audit.status === 'REJECTED'
          ? '<span class="badge badge-warning">REJECTED</span>'
          : '<span class="badge badge-danger">FAILED</span>';

      const time = new Date(log.timestamp).toLocaleTimeString();
      const latency = log.audit.durationMs !== undefined ? (log.audit.durationMs + ' ms') : '-';
      const details = log.audit.denialReason || log.audit.error || (log.audit.actualBytesBilled ? (formatBytes(log.audit.actualBytesBilled) + ' billed') : 'OK');

      tr.innerHTML = \`
        <td style="color: var(--text-muted); font-size: 0.8rem;">\${time}</td>
        <td>\${statusBadge}</td>
        <td style="font-weight: 500;">\${log.audit.userEmail || '-'}</td>
        <td><span class="badge badge-gray">\${log.audit.adapterName || 'generic'}</span></td>
        <td style="font-family: monospace; color: #93c5fd;">\${log.audit.toolName}</td>
        <td>\${latency}</td>
        <td style="font-size: 0.75rem; color: var(--text-muted); max-width: 280px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">\${details}</td>
      \`;
      tbody.insertBefore(tr, tbody.firstChild);

      // Keep max 50 rows in UI
      while (tbody.children.length > 50) {
        tbody.removeChild(tbody.lastChild);
      }
    }

    function updateMetricsUI(metrics) {
      document.getElementById('kpiRpm').textContent = metrics.rpm || 0;
      document.getElementById('kpiAvgLatency').textContent = (metrics.avgLatencyMs || 0) + ' ms';
      document.getElementById('kpiBytesBilled').textContent = formatBytes(metrics.totalBytesBilled || 0);
    }

    function formatBytes(bytes) {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
    }

    async function fetchOverview() {
      try {
        const res = await fetch('/api/admin/overview', { headers: getHeaders() });
        if (!res.ok) return;
        const data = await res.json();
        cachedOverview = data;

        document.getElementById('gatewayModeBadge').textContent = data.mode;
        document.getElementById('sseClientsBadge').textContent = data.activeSseTransports + ' SSE Clients';
        document.getElementById('kpiActiveDrivers').textContent = data.activeDriversCount + ' / ' + data.totalDriversCount;
        document.getElementById('kpiTotalDrivers').textContent = 'Total Configured: ' + data.totalDriversCount;
        document.getElementById('kpiTotalTools').textContent = data.totalTools;
        updateMetricsUI(data.metrics);

        renderDriversGrid(data.drivers);
      } catch (e) {
        console.error('Failed to fetch overview', e);
      }
    }

    function renderDriversGrid(drivers) {
      const grid = document.getElementById('driversGrid');
      grid.innerHTML = '';

      if (!drivers || drivers.length === 0) {
        grid.innerHTML = '<div style="color: var(--text-muted); padding: 20px;">No drivers configured yet.</div>';
        return;
      }

      drivers.forEach(d => {
        const card = document.createElement('div');
        card.className = 'driver-card';
        const dotClass = d.status === 'CONNECTED' ? 'green' : d.status === 'STOPPED' ? 'gray' : d.status === 'CONNECTING' ? 'yellow' : 'red';
        const statusBadge = d.status === 'CONNECTED'
          ? '<span class="badge badge-success">CONNECTED</span>'
          : d.status === 'CONNECTING'
            ? '<span class="badge badge-warning">CONNECTING...</span>'
            : d.status === 'STOPPED'
              ? '<span class="badge badge-gray">STOPPED</span>'
              : '<span class="badge badge-danger">ERROR</span>';

        card.innerHTML = \`
          <div class="driver-header">
            <div class="driver-name">
              <span class="status-dot \${dotClass}"></span>
              \${d.name}
            </div>
            \${statusBadge}
          </div>
          <div class="driver-details">
            <div><strong>Type:</strong> <span class="badge badge-primary">\${d.type}</span></div>
            <div style="margin-top: 4px;"><strong>Tools:</strong> \${d.toolCount || 0} exposed</div>
            <div style="margin-top: 4px; font-size: 0.75rem; color: #64748b;">\${d.commandOrUrl || ''}</div>
            \${d.lastError ? \`<div style="margin-top: 4px; color: #f87171; font-size: 0.75rem;">Error: \${d.lastError}</div>\` : ''}
          </div>
          <div class="driver-actions">
            \${d.status === 'CONNECTED'
              ? \`<button class="btn" onclick="restartDriver('\${d.name}')">Restart</button><button class="btn btn-danger" onclick="stopDriver('\${d.name}')">Stop</button>\`
              : d.status === 'CONNECTING'
                ? \`<button class="btn" disabled>Connecting...</button>\`
                : \`<button class="btn btn-primary" onclick="restartDriver('\${d.name}')">Start / Retry</button>\`
            }
            <button class="btn btn-danger" style="margin-left: auto;" onclick="deleteDriver('\${d.name}')">Delete</button>
          </div>
        \`;
        grid.appendChild(card);
      });
    }

    async function startAllDrivers() {
      try {
        const res = await fetch('/api/admin/drivers/actions/start-all', { method: 'POST', headers: getHeaders() });
        const data = await res.json();
        if (data.success) fetchOverview();
        else alert('Error: ' + data.error);
      } catch (e) { alert(e.message); }
    }

    async function stopAllDrivers() {
      if (!confirm('Stop all active outbound drivers?')) return;
      try {
        const res = await fetch('/api/admin/drivers/actions/stop-all', { method: 'POST', headers: getHeaders() });
        const data = await res.json();
        if (data.success) fetchOverview();
        else alert('Error: ' + data.error);
      } catch (e) { alert(e.message); }
    }

    async function restartDriver(name) {
      try {
        const res = await fetch(\`/api/admin/drivers/\${name}/restart\`, { method: 'POST', headers: getHeaders() });
        const data = await res.json();
        if (data.success) fetchOverview();
        else alert('Error: ' + data.error);
      } catch (e) { alert(e.message); }
    }

    async function stopDriver(name) {
      try {
        const res = await fetch(\`/api/admin/drivers/\${name}/stop\`, { method: 'POST', headers: getHeaders() });
        const data = await res.json();
        if (data.success) fetchOverview();
      } catch (e) { alert(e.message); }
    }

    async function deleteDriver(name) {
      if (!confirm(\`Are you sure you want to remove driver "\${name}"?\`)) return;
      try {
        const res = await fetch(\`/api/admin/drivers/\${name}\`, { method: 'DELETE', headers: getHeaders() });
        const data = await res.json();
        if (data.success) fetchOverview();
      } catch (e) { alert(e.message); }
    }

    async function fetchLogs() {
      try {
        const res = await fetch('/api/admin/logs?limit=50', { headers: getHeaders() });
        const data = await res.json();
        const tbody = document.getElementById('logsTableBody');
        tbody.innerHTML = '';
        if (data.logs && data.logs.length > 0) {
          data.logs.forEach(log => prependAuditLogRow(log));
        } else {
          tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">No audit logs recorded yet.</td></tr>';
        }
      } catch (e) { console.error(e); }
    }

    async function clearLogs() {
      if (!confirm('Clear all in-memory audit logs?')) return;
      await fetch('/api/admin/logs', { method: 'DELETE', headers: getHeaders() });
      document.getElementById('logsTableBody').innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 24px;">History cleared.</td></tr>';
    }

    // TAB 2: Marketplace Catalog
    async function fetchCatalog() {
      try {
        const res = await fetch('/api/admin/catalog', { headers: getHeaders() });
        cachedCatalog = await res.json();
        renderCatalog();
      } catch (e) { console.error(e); }
    }

    function setCatalogCategory(cat) {
      activeCategory = cat;
      renderCatalog();
    }

    function filterCatalog() {
      renderCatalog();
    }

    function renderCatalog() {
      const grid = document.getElementById('catalogGrid');
      grid.innerHTML = '';
      const query = (document.getElementById('catalogSearch').value || '').toLowerCase();

      const filtered = cachedCatalog.filter(item => {
        const matchesCategory = activeCategory === 'All'
          ? true
          : activeCategory === 'Installed'
            ? item.installed
            : item.category === activeCategory;
        const matchesSearch = item.name.toLowerCase().includes(query) || item.description.toLowerCase().includes(query) || item.id.toLowerCase().includes(query);
        return matchesCategory && matchesSearch;
      });

      filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'catalog-item-card';
        const installBadge = item.installed
          ? '<span class="badge badge-success">INSTALLED</span>'
          : '<span class="badge badge-gray">AVAILABLE</span>';

        card.innerHTML = \`
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 1.5rem;">\${item.icon}</span>
              <div>
                <div style="font-weight: 700; font-size: 0.95rem;">\${item.name}</div>
                <div style="font-size: 0.72rem; color: var(--text-muted);">\${item.category}</div>
              </div>
            </div>
            \${installBadge}
          </div>
          <div style="font-size: 0.8rem; color: #cbd5e1; flex: 1;">\${item.description}</div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
            <span class="badge badge-primary">\${item.defaultConfig.type}</span>
            <button class="btn \${item.installed ? '' : 'btn-primary'}" onclick="openInstallModal('\${item.id}')">
              \${item.installed ? 'Configure' : '1-Click Install'}
            </button>
          </div>
        \`;
        grid.appendChild(card);
      });
    }

    function openInstallModal(driverId) {
      const item = cachedCatalog.find(c => c.id === driverId);
      if (!item) return;

      document.getElementById('modalDriverId').value = item.id;
      document.getElementById('modalCatalogTitle').textContent = (item.installed ? 'Configure ' : 'Install ') + item.name;
      document.getElementById('modalCatalogDesc').textContent = item.description;

      const container = document.getElementById('modalEnvVarsContainer');
      container.innerHTML = '';

      if (item.envVars && item.envVars.length > 0) {
        item.envVars.forEach(v => {
          const group = document.createElement('div');
          group.className = 'form-group';
          group.innerHTML = \`
            <label class="form-label">\${v.label} \${v.required ? '<span style="color:#f87171;">*</span>' : ''}</label>
            <input type="\${v.secret ? 'password' : 'text'}" name="env_\${v.key}" class="form-input" placeholder="\${v.placeholder || ''}" value="\${v.defaultValue || ''}" \${v.required ? 'required' : ''}>
            <div class="form-help">\${v.description} (\${v.key})</div>
          \`;
          container.appendChild(group);
        });
      } else {
        container.innerHTML = '<div style="font-size: 0.85rem; color: var(--text-muted); padding: 8px 0;">This driver requires no external secret configuration. Ready to install!</div>';
      }

      document.getElementById('installModal').style.display = 'flex';
    }

    async function submitInstallCatalogDriver(e) {
      e.preventDefault();
      const driverId = document.getElementById('modalDriverId').value;
      const item = cachedCatalog.find(c => c.id === driverId);
      if (!item) return;

      const formData = new FormData(e.target);
      const envSecrets = {};

      for (const [name, val] of formData.entries()) {
        if (name.startsWith('env_')) {
          const key = name.substring(4);
          if (val) envSecrets[key] = val;
        }
      }

      const payload = {
        config: item.defaultConfig,
        envSecrets
      };

      try {
        const res = await fetch(\`/api/admin/drivers/\${driverId}\`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) {
          closeModal('installModal');
          fetchCatalog();
          fetchOverview();
        } else {
          alert('Install Error: ' + (data.error || 'Failed to install'));
        }
      } catch (err) {
        alert(err.message);
      }
    }

    function openCustomDriverModal() {
      document.getElementById('customDriverForm').reset();
      toggleCustomFields();
      document.getElementById('customDriverModal').style.display = 'flex';
    }

    function toggleCustomFields() {
      const type = document.getElementById('customType').value;
      document.getElementById('customStdioGroup').style.display = type === 'stdio' ? 'block' : 'none';
      document.getElementById('customSseGroup').style.display = type === 'sse' ? 'block' : 'none';
    }

    async function submitCustomDriver(e) {
      e.preventDefault();
      const name = document.getElementById('customName').value.trim();
      const type = document.getElementById('customType').value;
      const timeout = document.getElementById('customTimeout').value.trim();

      const config = { type, timeout: timeout || undefined };
      if (type === 'stdio') {
        config.command = document.getElementById('customCommand').value.trim();
        const argsStr = document.getElementById('customArgs').value.trim();
        config.args = argsStr ? argsStr.split(' ') : [];
      } else {
        config.url = document.getElementById('customUrl').value.trim();
      }

      try {
        const res = await fetch(\`/api/admin/drivers/\${name}\`, {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify({ config })
        });
        const data = await res.json();
        if (data.success) {
          closeModal('customDriverModal');
          fetchCatalog();
          fetchOverview();
        } else {
          alert('Error: ' + data.error);
        }
      } catch (err) { alert(err.message); }
    }

    // TAB 3: Playground
    async function fetchToolsForPlayground() {
      try {
        const res = await fetch('/api/admin/tools', { headers: getHeaders() });
        const data = await res.json();
        cachedTools = data.tools || [];
        renderPlaygroundTools();
      } catch (e) { console.error(e); }
    }

    function filterPlaygroundTools() {
      renderPlaygroundTools();
    }

    function renderPlaygroundTools() {
      const list = document.getElementById('playgroundToolList');
      list.innerHTML = '';
      const filter = (document.getElementById('playgroundToolFilter').value || '').toLowerCase();

      const filtered = cachedTools.filter(t => t.name.toLowerCase().includes(filter));
      if (filtered.length === 0) {
        list.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-muted); padding: 12px;">No matching tools</div>';
        return;
      }

      filtered.forEach(tool => {
        const item = document.createElement('div');
        item.style.padding = '8px 10px';
        item.style.borderRadius = '6px';
        item.style.cursor = 'pointer';
        item.style.fontSize = '0.82rem';
        item.style.border = '1px solid transparent';
        item.className = 'tool-picker-item';
        if (selectedPlaygroundTool && selectedPlaygroundTool.name === tool.name) {
          item.style.background = '#2563eb';
          item.style.color = '#fff';
        } else {
          item.style.background = '#131d31';
          item.style.color = '#cbd5e1';
        }

        item.textContent = tool.name;
        item.onclick = () => selectPlaygroundTool(tool);
        list.appendChild(item);
      });
    }

    function selectPlaygroundTool(tool) {
      selectedPlaygroundTool = tool;
      renderPlaygroundTools();

      document.getElementById('pgToolTitle').textContent = tool.name;
      document.getElementById('pgToolDesc').textContent = tool.description || 'No tool description provided.';
      document.getElementById('pgExecuteBtn').disabled = false;

      // Populate default args from inputSchema
      const sampleArgs = {};
      if (tool.inputSchema?.properties) {
        for (const [key, prop] of Object.entries(tool.inputSchema.properties)) {
          sampleArgs[key] = prop.default !== undefined ? prop.default : (prop.type === 'string' ? '' : prop.type === 'number' ? 0 : prop.type === 'boolean' ? false : null);
        }
      }
      document.getElementById('pgArgsInput').value = JSON.stringify(sampleArgs, null, 2);
    }

    async function executePlaygroundTool() {
      if (!selectedPlaygroundTool) return;

      const btn = document.getElementById('pgExecuteBtn');
      btn.disabled = true;
      btn.textContent = '⏳ Executing...';

      let args = {};
      try {
        args = JSON.parse(document.getElementById('pgArgsInput').value || '{}');
      } catch (e) {
        alert('Invalid JSON in arguments field');
        btn.disabled = false;
        btn.textContent = '▶ Execute Tool';
        return;
      }

      const payload = {
        toolName: selectedPlaygroundTool.name,
        args,
        adapterName: document.getElementById('pgSimAdapter').value,
        userEmail: document.getElementById('pgSimUser').value
      };

      try {
        const res = await fetch('/api/admin/playground/execute', {
          method: 'POST',
          headers: getHeaders(),
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        document.getElementById('pgDurationBadge').textContent = data.durationMs + ' ms';
        document.getElementById('pgOutput').textContent = JSON.stringify(data.mcpResponse, null, 2);
      } catch (err) {
        document.getElementById('pgOutput').textContent = 'Error: ' + err.message;
      } finally {
        btn.disabled = false;
        btn.textContent = '▶ Execute Tool';
      }
    }

    // TAB 4: Governance & Matrix
    async function fetchGovernanceData() {
      try {
        const [overviewRes, usersRes] = await Promise.all([
          fetch('/api/admin/overview', { headers: getHeaders() }),
          fetch('/api/admin/governance/users', { headers: getHeaders() })
        ]);

        const overview = await overviewRes.json();
        const usersData = await usersRes.json();

        // Populate rate limiter & budget inputs
        document.getElementById('govMaxRequests').value = overview.governance.rateLimiter.maxRequests || 0;
        document.getElementById('govWindowMs').value = overview.governance.rateLimiter.windowMs || 60000;
        document.getElementById('govMaxDailyBytes').value = overview.governance.budgetManager.maxDailyBytes || 0;

        renderPermissionMatrix(overview.drivers, overview.inboundAdapters);
        renderQuotaUsers(usersData.usersUsage);
      } catch (e) { console.error(e); }
    }

    function setPresetBudget(bytes) {
      document.getElementById('govMaxDailyBytes').value = bytes;
    }

    async function saveGovernanceSettings() {
      const payload = {
        maxRequests: parseInt(document.getElementById('govMaxRequests').value, 10),
        windowMs: parseInt(document.getElementById('govWindowMs').value, 10),
        maxDailyBytes: parseInt(document.getElementById('govMaxDailyBytes').value, 10)
      };

      try {
        const res = await fetch('/api/admin/governance', {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data.success) alert('Governance guardrails updated successfully.');
      } catch (e) { alert(e.message); }
    }

    function renderPermissionMatrix(drivers, inboundAdapters) {
      const tbody = document.getElementById('matrixTableBody');
      tbody.innerHTML = '';

      if (!drivers) return;

      drivers.forEach(d => {
        const tr = document.createElement('tr');
        const genericChecked = inboundAdapters.generic?.allowedDrivers?.includes(d.name) ? 'checked' : '';
        const atlassianChecked = inboundAdapters.atlassian?.allowedDrivers?.includes(d.name) ? 'checked' : '';
        const openaiChecked = inboundAdapters.openai?.allowedDrivers?.includes(d.name) ? 'checked' : '';

        tr.innerHTML = \`
          <td><strong>\${d.name}</strong> <span style="font-size: 0.75rem; color: var(--text-muted);">(\${d.type})</span></td>
          <td style="text-align: center;"><input type="checkbox" data-driver="\${d.name}" data-adapter="generic" \${genericChecked}></td>
          <td style="text-align: center;"><input type="checkbox" data-driver="\${d.name}" data-adapter="atlassian" \${atlassianChecked}></td>
          <td style="text-align: center;"><input type="checkbox" data-driver="\${d.name}" data-adapter="openai" \${openaiChecked}></td>
        \`;
        tbody.appendChild(tr);
      });
    }

    async function savePermissionMatrix() {
      const adapters = { generic: [], atlassian: [], openai: [] };
      document.querySelectorAll('#matrixTableBody input[type="checkbox"]').forEach(box => {
        if (box.checked) {
          const driver = box.getAttribute('data-driver');
          const adapter = box.getAttribute('data-adapter');
          if (adapters[adapter]) adapters[adapter].push(driver);
        }
      });

      try {
        for (const [name, allowedDrivers] of Object.entries(adapters)) {
          await fetch(\`/api/admin/adapters/\${name}\`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({ allowedDrivers })
          });
        }
        alert('Permission Matrix saved successfully!');
        fetchOverview();
      } catch (e) { alert(e.message); }
    }

    function renderQuotaUsers(users) {
      const tbody = document.getElementById('quotaUsersTableBody');
      tbody.innerHTML = '';

      if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 16px;">No daily quota consumed yet today.</td></tr>';
        return;
      }

      users.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML = \`
          <td style="font-weight: 600;">\${u.userEmail}</td>
          <td>\${u.date}</td>
          <td><span class="badge badge-warning">\${u.usedFormatted}</span></td>
          <td>\${formatBytes(u.maxBytes)}</td>
          <td>\${formatBytes(u.remainingBytes)}</td>
          <td><button class="btn btn-danger" onclick="resetUserQuota('\${u.userEmail}')">Reset</button></td>
        \`;
        tbody.appendChild(tr);
      });
    }

    async function resetUserQuota(email) {
      if (!confirm(\`Reset quota today for \${email}?\`)) return;
      await fetch('/api/admin/governance/reset-quota', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ userEmail: email })
      });
      fetchGovernanceData();
    }

    async function resetAllQuotas() {
      if (!confirm('Reset all daily user quotas and rate limits across the gateway?')) return;
      await fetch('/api/admin/governance/reset-quota', {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({})
      });
      fetchGovernanceData();
    }

    let cachedEnvVars = [];

    async function fetchEnvData() {
      try {
        const res = await fetch('/api/admin/env', { headers: getHeaders() });
        const data = await res.json();
        cachedEnvVars = data.variables || [];
        renderEnvTable();
      } catch (e) { console.error('Failed to fetch env data', e); }
    }

    function renderEnvTable() {
      const tbody = document.getElementById('envTableBody');
      tbody.innerHTML = '';

      if (!cachedEnvVars || cachedEnvVars.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">No environment variables configured yet.</td></tr>';
        return;
      }

      cachedEnvVars.forEach(v => {
        const tr = document.createElement('tr');
        const statusBadge = v.isSet
          ? '<span class="badge badge-success">CONFIGURED</span>'
          : '<span class="badge badge-gray">NOT SET</span>';

        tr.innerHTML = \`
          <td><code style="color: #93c5fd; font-size: 0.82rem;">\${v.key}</code></td>
          <td>\${statusBadge}</td>
          <td style="font-family: monospace; font-size: 0.8rem; color: #94a3b8;">\${v.maskedValue || '<span style="color:#64748b;">(empty)</span>'}</td>
          <td>
            <input type="\${v.isSecret ? 'password' : 'text'}" data-env-key="\${v.key}" class="form-input env-value-input" placeholder="\${v.isSet ? 'Enter new value to update...' : 'Set value...'}" style="max-width: 420px;">
          </td>
        \`;
        tbody.appendChild(tr);
      });
    }

    async function saveEnvSettings() {
      const updates = {};
      document.querySelectorAll('.env-value-input').forEach(input => {
        const val = input.value.trim();
        if (val) {
          const key = input.getAttribute('data-env-key');
          updates[key] = val;
        }
      });

      if (Object.keys(updates).length === 0) {
        alert('No new values entered.');
        return;
      }

      try {
        const res = await fetch('/api/admin/env', {
          method: 'PUT',
          headers: getHeaders(),
          body: JSON.stringify({ vars: updates })
        });
        const data = await res.json();
        if (data.success) {
          alert('Environment variables updated and persisted successfully!');
          fetchEnvData();
          fetchOverview();
        } else {
          alert('Error: ' + data.error);
        }
      } catch (err) { alert(err.message); }
    }

    // Startup initialization
    window.addEventListener('DOMContentLoaded', () => {
      checkAuthStatus();
      initSse();
      fetchOverview();
    });
  </script>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html');
  res.send(html);
};

