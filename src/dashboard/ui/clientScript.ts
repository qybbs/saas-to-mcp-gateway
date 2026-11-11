/**
 * Client-side controller script for the SaaS-to-MCP Gateway Management Console.
 * Uses safe DOM construction (no dynamic innerHTML), delegated events, native <dialog>,
 * accessible tabs/modals, non-blocking toasts, and live SSE telemetry updates.
 */
export const getDashboardClientScript = (): string => `
  (function () {
    'use strict';

    let adminKey = sessionStorage.getItem('GATEWAY_ADMIN_KEY') || '';
    let eventSource = null;
    let cachedCatalog = [];
    let cachedTools = [];
    let cachedEnvVars = [];
    let activeCategory = 'All';
    let selectedPlaygroundTool = null;
    let lastActiveTrigger = null;
    let confirmResolver = null;

    function getHeaders() {
      const headers = { 'Content-Type': 'application/json' };
      if (adminKey) headers['x-admin-key'] = adminKey;
      return headers;
    }

    function el(tag, attrs, children) {
      const node = document.createElement(tag);
      if (attrs) {
        for (const [k, v] of Object.entries(attrs)) {
          if (v === undefined || v === null || v === false) continue;
          if (k === 'className') node.className = v;
          else if (k === 'text') node.textContent = String(v);
          else if (k === 'dataset' && typeof v === 'object') {
            for (const [dk, dv] of Object.entries(v)) {
              if (dv !== undefined && dv !== null) node.dataset[dk] = String(dv);
            }
          } else if (v === true) node.setAttribute(k, '');
          else node.setAttribute(k, String(v));
        }
      }
      if (children) {
        const list = Array.isArray(children) ? children : [children];
        for (const child of list) {
          if (child === null || child === undefined || child === false) continue;
          node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
        }
      }
      return node;
    }

    function clearNode(node) {
      while (node.firstChild) node.removeChild(node.firstChild);
    }

    let lastOverviewData = null;

    function makeBadge(text, variant) {
      return el('span', { className: 'badge ' + (variant || 'badge-gray'), text });
    }

    function makeStatusInline(label, tone) {
      const dot = tone === 'success' ? 'green'
        : tone === 'warning' ? 'yellow'
        : tone === 'danger' ? 'red' : 'gray';
      const toneClass = tone === 'success' ? 'is-success'
        : tone === 'warning' ? 'is-warning'
        : tone === 'danger' ? 'is-danger' : 'is-muted';
      return el('span', { className: 'status-inline ' + toneClass }, [
        el('span', { className: 'status-dot ' + dot, 'aria-hidden': 'true' }),
        el('span', { text: label }),
      ]);
    }

    const CATALOG_MONOGRAMS = {
      bigquery: 'BQ',
      datastudio: 'DS',
      postgres: 'PG',
      sqlite: 'SQ',
      redis: 'RD',
      clickhouse: 'CH',
      'clickhouse-docs': 'CD',
      amplitude: 'AM',
      sonarqube: 'SN',
      datadog: 'DD',
      clickstack: 'CS',
      sentry: 'SE',
      github: 'GH',
      notion: 'NT',
      atlassian: 'AT',
      context7: 'C7',
      linear: 'LN',
      filesystem: 'FS',
      slack: 'SL',
      'brave-search': 'BR',
      playwright: 'PW',
      linkedin: 'LI',
    };

    function getDriverMonogram(id, name) {
      if (id && CATALOG_MONOGRAMS[id]) return CATALOG_MONOGRAMS[id];
      const parts = String(name || id || 'MC').replace(/[^A-Za-z0-9 ]/g, '').trim().split(/\\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return (parts[0] || 'MC').slice(0, 2).toUpperCase();
    }

    function svgEl(tag, attrs, children) {
      const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
      if (attrs) {
        for (const [k, v] of Object.entries(attrs)) {
          if (v !== undefined && v !== null) node.setAttribute(k, String(v));
        }
      }
      if (children) {
        const list = Array.isArray(children) ? children : [children];
        for (const child of list) {
          if (child) node.appendChild(child);
        }
      }
      return node;
    }

    function formatBytes(bytes) {
      if (!bytes || bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
      const i = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(k)));
      return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
    }

    // Toast notifications (non-blocking replacement for window.alert)
    function showToast(message, variant, timeoutMs) {
      const region = document.getElementById('toastRegion');
      if (!region) return;
      const kind = variant || 'info';
      const toast = el('div', {
        className: 'toast toast-' + kind,
        role: kind === 'error' ? 'alert' : 'status',
      }, [
        el('div', { text: message }),
        el('button', {
          type: 'button',
          className: 'btn btn-ghost btn-icon',
          'aria-label': 'Dismiss notification',
          text: '×',
        }),
      ]);

      const closeBtn = toast.querySelector('button');
      const removeToast = () => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      };
      if (closeBtn) closeBtn.addEventListener('click', removeToast);
      region.appendChild(toast);

      const duration = timeoutMs !== undefined ? timeoutMs : 4500;
      if (duration > 0) setTimeout(removeToast, duration);
    }

    // Native <dialog> helpers with focus restoration
    function openDialog(dialogId, triggerEl) {
      const dlg = document.getElementById(dialogId);
      if (!dlg) return;
      lastActiveTrigger = triggerEl || document.activeElement;
      if (!dlg.open && typeof dlg.showModal === 'function') {
        dlg.showModal();
      }
    }

    function closeDialog(dialogId) {
      const dlg = document.getElementById(dialogId);
      if (dlg && dlg.open && typeof dlg.close === 'function') {
        dlg.close();
      }
      if (lastActiveTrigger && typeof lastActiveTrigger.focus === 'function') {
        lastActiveTrigger.focus();
        lastActiveTrigger = null;
      }
    }

    function confirmAction(title, message, confirmLabel, isDanger) {
      const dlg = document.getElementById('confirmModal');
      if (!dlg || typeof dlg.showModal !== 'function') {
        return Promise.resolve(true);
      }
      document.getElementById('confirmModalTitle').textContent = title;
      document.getElementById('confirmModalMessage').textContent = message;
      const acceptBtn = document.getElementById('confirmModalAcceptBtn');
      acceptBtn.textContent = confirmLabel || 'Confirm';
      acceptBtn.className = isDanger ? 'btn btn-danger' : 'btn btn-primary';

      return new Promise((resolve) => {
        confirmResolver = resolve;
        openDialog('confirmModal');
      });
    }

    function resolveConfirm(accepted) {
      const resolver = confirmResolver;
      confirmResolver = null;
      closeDialog('confirmModal');
      if (resolver) resolver(accepted);
    }

    // Accessible Tabs
    function switchTab(tabId, shouldFocusTab) {
      document.querySelectorAll('.tab-content').forEach((panel) => {
        const isActive = panel.id === 'tab-' + tabId;
        panel.classList.toggle('active', isActive);
        panel.hidden = !isActive;
      });

      document.querySelectorAll('[role="tab"]').forEach((btn) => {
        const isActive = btn.dataset.tab === tabId;
        btn.classList.toggle('active', isActive);
        btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
        btn.setAttribute('tabindex', isActive ? '0' : '-1');
        if (isActive && shouldFocusTab) btn.focus();
      });

      if (tabId === 'overview') fetchOverview();
      else if (tabId === 'marketplace') fetchCatalog();
      else if (tabId === 'playground') fetchToolsForPlayground();
      else if (tabId === 'governance') fetchGovernanceData();
      else if (tabId === 'env') fetchEnvData();
    }

    async function apiFetch(url, options) {
      const opts = options || {};
      const res = await fetch(url, {
        ...opts,
        headers: { ...getHeaders(), ...(opts.headers || {}) },
      });
      if (res.status === 401) {
        setAuthError('Admin API Key is required or invalid.');
        openDialog('authModal');
        throw new Error('Unauthorized: Admin API Key required.');
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || ('Request failed (' + res.status + ')'));
      }
      return data;
    }

    function setAuthError(msg) {
      const elErr = document.getElementById('authErrorMsg');
      if (!elErr) return;
      elErr.textContent = msg || '';
      elErr.hidden = !msg;
    }

    async function checkAuthStatus() {
      try {
        const res = await fetch('/api/admin/auth-status', { headers: getHeaders() });
        if (res.status === 401) {
          setAuthError('');
          openDialog('authModal');
          return false;
        }
        const data = await res.json();
        document.getElementById('gatewayModeBadge').textContent = data.mode;
        setAuthError('');
        return true;
      } catch (e) {
        showOverviewAlert('Unable to reach gateway admin API: ' + e.message);
        return false;
      }
    }

    async function saveAdminKey(e) {
      if (e) e.preventDefault();
      adminKey = (document.getElementById('adminKeyInput').value || '').trim();
      sessionStorage.setItem('GATEWAY_ADMIN_KEY', adminKey);
      const ok = await checkAuthStatus();
      if (!ok) {
        setAuthError('Invalid Admin API Key. Please try again.');
        return;
      }
      closeDialog('authModal');
      showToast('Admin session authenticated.', 'success');
      initSse();
      fetchOverview();
      fetchLogs();
    }

    function setSseStatus(label, tone) {
      const badge = document.getElementById('sseStatusBadge');
      if (!badge) return;
      const dot = tone === 'success' ? 'green'
        : tone === 'warning' ? 'yellow'
        : tone === 'danger' ? 'red' : 'gray';
      const toneClass = tone === 'success' ? 'is-success'
        : tone === 'warning' ? 'is-warning'
        : tone === 'danger' ? 'is-danger' : 'is-muted';
      badge.className = 'status-inline ' + toneClass;
      clearNode(badge);
      badge.appendChild(el('span', { className: 'status-dot ' + dot, 'aria-hidden': 'true' }));
      badge.appendChild(document.createTextNode(label));
    }

    function initSse() {
      if (eventSource) eventSource.close();
      setSseStatus('Connecting', 'warning');
      const sseUrl = adminKey
        ? ('/api/admin/events?adminKey=' + encodeURIComponent(adminKey))
        : '/api/admin/events';
      eventSource = new EventSource(sseUrl);

      eventSource.addEventListener('connected', () => {
        setSseStatus('Live Stream', 'success');
      });

      eventSource.addEventListener('audit_log', (e) => {
        try {
          const log = JSON.parse(e.data);
          insertAuditLogRow(log, true);
        } catch (err) {
          console.error('Failed to parse audit_log SSE', err);
        }
      });

      eventSource.addEventListener('driver_status', () => {
        fetchOverview();
      });

      eventSource.addEventListener('metrics', (e) => {
        try {
          const metrics = JSON.parse(e.data);
          updateMetricsUI(metrics);
          if (lastOverviewData) {
            lastOverviewData = { ...lastOverviewData, metrics };
            renderTopologyGraph(lastOverviewData);
          }
        } catch (err) {
          console.error('Failed to parse metrics SSE', err);
        }
      });

      eventSource.onerror = () => {
        setSseStatus('Reconnecting', 'warning');
      };
    }

    function buildAuditRow(log) {
      const audit = log.audit || {};
      const statusTone = audit.status === 'SUCCESS'
        ? 'success'
        : audit.status === 'REJECTED'
          ? 'warning'
          : 'danger';
      const statusLabel = audit.status === 'SUCCESS'
        ? 'Success'
        : audit.status === 'REJECTED'
          ? 'Rejected'
          : audit.status === 'FAILED' ? 'Failed' : (audit.status || 'Unknown');
      const time = log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : '-';
      const latency = audit.durationMs !== undefined ? (audit.durationMs + ' ms') : '-';
      const details = audit.denialReason || audit.error ||
        (audit.actualBytesBilled ? (formatBytes(audit.actualBytesBilled) + ' billed') : 'OK');

      return el('tr', null, [
        el('td', { className: 'tabular', text: time, style: 'color: var(--color-text-muted); font-size: var(--text-xs);' }),
        el('td', null, makeStatusInline(statusLabel, statusTone)),
        el('td', { text: audit.userEmail || '-', style: 'font-weight: 500;' }),
        el('td', { className: 'mono', text: audit.adapterName || 'generic', style: 'font-size: var(--text-xs); color: var(--color-text-muted);' }),
        el('td', { className: 'mono', text: audit.toolName || '-', style: 'color: var(--cobalt-300); font-size: var(--text-xs);' }),
        el('td', { className: 'tabular', text: latency }),
        el('td', { className: 'cell-truncate', text: details, title: details }),
      ]);
    }

    function insertAuditLogRow(log, prepend) {
      const tbody = document.getElementById('logsTableBody');
      if (!tbody) return;
      const emptyCell = tbody.querySelector('td[colspan]');
      if (emptyCell) clearNode(tbody);

      const tr = buildAuditRow(log);
      if (prepend && tbody.firstChild) {
        tbody.insertBefore(tr, tbody.firstChild);
      } else {
        tbody.appendChild(tr);
      }

      while (tbody.children.length > 50) {
        tbody.removeChild(tbody.lastChild);
      }
    }

    function updateMetricsUI(metrics) {
      const m = metrics || {};
      document.getElementById('kpiRpm').textContent = m.rpm || 0;
      document.getElementById('kpiAvgLatency').textContent = (m.avgLatencyMs || 0) + ' ms';
      document.getElementById('kpiBytesBilled').textContent = formatBytes(m.totalBytesBilled || 0);
    }

    function showOverviewAlert(msg) {
      const box = document.getElementById('overviewAlert');
      if (!box) return;
      if (!msg) {
        box.hidden = true;
        return;
      }
      document.getElementById('overviewAlertText').textContent = msg;
      box.hidden = false;
    }

    function renderTopologyGraph(overview) {
      const container = document.getElementById('topologyGraph');
      if (!container) return;
      clearNode(container);

      const data = overview || {};
      const metrics = data.metrics || {};
      const callCounts = metrics.driverCallCounts || {};
      const drivers = Array.isArray(data.drivers) ? data.drivers : [];
      const adaptersCfg = data.inboundAdapters || {};

      const summary = document.getElementById('topologyHealthSummary');
      if (summary) {
        summary.textContent =
          (metrics.totalRequests || 0) + ' reqs · ' +
          (metrics.successCount || 0) + ' ok · ' +
          (metrics.uptimeSeconds || 0) + 's uptime';
      }

      const driverMap = new Map(drivers.map((d) => [d.name, d]));
      const visibleDrivers = drivers.slice(0, 10);
      const hiddenCount = Math.max(0, drivers.length - visibleDrivers.length);
      const rowSlots = visibleDrivers.length + (hiddenCount > 0 ? 1 : 0);

      const adapters = [
        { id: 'generic', label: 'generic', proto: 'SSE / HTTP' },
        { id: 'atlassian', label: 'atlassian', proto: 'OAuth 2.1' },
        { id: 'openai', label: 'openai', proto: 'OpenAPI REST' },
      ];

      const svgW = 960;
      const svgH = Math.max(216, Math.max(adapters.length, rowSlots || 1) * 42 + 32);
      const midY = Math.round(svgH / 2);

      const svg = svgEl('svg', {
        class: 'topology-svg',
        viewBox: '0 0 ' + svgW + ' ' + svgH,
        role: 'img',
        'aria-label': 'Gateway routing topology from inbound adapters to outbound drivers',
      });

      // Column headers
      svg.appendChild(svgEl('text', { x: 16, y: 18, fill: '#9ca3af', 'font-size': 11, 'font-weight': 600 }, document.createTextNode('INBOUND ADAPTERS')));
      svg.appendChild(svgEl('text', { x: 390, y: 18, fill: '#9ca3af', 'font-size': 11, 'font-weight': 600 }, document.createTextNode('GATEWAY POLICY CORE')));
      svg.appendChild(svgEl('text', { x: 716, y: 18, fill: '#9ca3af', 'font-size': 11, 'font-weight': 600 }, document.createTextNode('OUTBOUND DRIVERS')));

      const topOffset = 28;
      const usableH = svgH - topOffset - 12;

      // Inbound adapter nodes + curves to Core
      adapters.forEach((a, idx) => {
        const cy = Math.round(topOffset + ((idx + 0.5) / adapters.length) * usableH);
        const ay = cy - 22;
        const allowed = adaptersCfg[a.id] && Array.isArray(adaptersCfg[a.id].allowedDrivers)
          ? adaptersCfg[a.id].allowedDrivers
          : [];
        const hasLive = allowed.some((name) => {
          const drv = driverMap.get(name);
          return drv && drv.status === 'CONNECTED';
        });

        svg.appendChild(svgEl('path', {
          d: 'M 244 ' + cy + ' C 312 ' + cy + ', 322 ' + midY + ', 386 ' + midY,
          fill: 'none',
          stroke: hasLive ? '#60a5fa' : '#343b48',
          'stroke-width': hasLive ? 1.75 : 1.2,
          'stroke-dasharray': hasLive ? 'none' : '4 4',
          opacity: hasLive ? 0.85 : 0.75,
        }));

        const box = svgEl('g');
        box.appendChild(svgEl('rect', {
          x: 16, y: ay, width: 228, height: 44, rx: 6,
          fill: '#141820', stroke: hasLive ? '#343b48' : '#232832', 'stroke-width': 1,
        }));
        box.appendChild(svgEl('circle', {
          cx: 32, cy: ay + 22, r: 3.5,
          fill: hasLive ? '#10b981' : '#9ca3af',
        }));
        box.appendChild(svgEl('text', {
          x: 44, y: ay + 19, fill: '#f3f4f6', 'font-size': 12.5, 'font-weight': 600,
        }, document.createTextNode(a.label)));
        box.appendChild(svgEl('text', {
          x: 44, y: ay + 34, fill: '#9ca3af', 'font-size': 11,
        }, document.createTextNode(a.proto + ' · ' + allowed.length + ' permitted')));
        box.appendChild(svgEl('circle', { cx: 244, cy: cy, r: 3, fill: hasLive ? '#60a5fa' : '#343b48' }));
        svg.appendChild(box);
      });

      // Center Gateway Core node
      const coreTop = midY - 56;
      const coreG = svgEl('g');
      coreG.appendChild(svgEl('rect', {
        x: 386, y: coreTop, width: 188, height: 112, rx: 8,
        fill: '#141820', stroke: '#343b48', 'stroke-width': 1.25,
      }));
      coreG.appendChild(svgEl('rect', {
        x: 386, y: coreTop, width: 188, height: 3, rx: 1.5,
        fill: '#2563eb',
      }));
      coreG.appendChild(svgEl('text', {
        x: 402, y: coreTop + 28, fill: '#f3f4f6', 'font-size': 13, 'font-weight': 600,
      }, document.createTextNode('Policy & Telemetry')));
      coreG.appendChild(svgEl('text', {
        x: 402, y: coreTop + 48, fill: '#d1d5db', 'font-size': 12, 'font-family': 'ui-monospace, monospace',
      }, document.createTextNode((metrics.rpm || 0) + ' RPM · ' + (metrics.avgLatencyMs || 0) + ' ms')));

      const okCount = metrics.successCount || 0;
      const rejCount = metrics.rejectedCount || 0;
      const errCount = metrics.failedCount || 0;
      const totalOutcome = okCount + rejCount + errCount;
      const barX = 402;
      const barY = coreTop + 68;
      const barW = 156;
      coreG.appendChild(svgEl('rect', { x: barX, y: barY, width: barW, height: 6, rx: 3, fill: '#232832' }));
      if (totalOutcome > 0) {
        let cursor = barX;
        const okW = Math.round((okCount / totalOutcome) * barW);
        const rejW = Math.round((rejCount / totalOutcome) * barW);
        const errW = Math.max(0, barW - okW - rejW);
        if (okW > 0) {
          coreG.appendChild(svgEl('rect', { x: cursor, y: barY, width: okW, height: 6, rx: 2, fill: '#10b981' }));
          cursor += okW;
        }
        if (rejW > 0) {
          coreG.appendChild(svgEl('rect', { x: cursor, y: barY, width: rejW, height: 6, rx: 2, fill: '#f59e0b' }));
          cursor += rejW;
        }
        if (errW > 0) {
          coreG.appendChild(svgEl('rect', { x: cursor, y: barY, width: errW, height: 6, rx: 2, fill: '#f87171' }));
        }
        coreG.appendChild(svgEl('text', {
          x: 402, y: coreTop + 94, fill: '#9ca3af', 'font-size': 11,
        }, document.createTextNode(okCount + ' ok · ' + rejCount + ' blocked · ' + errCount + ' err')));
      } else {
        coreG.appendChild(svgEl('text', {
          x: 402, y: coreTop + 94, fill: '#9ca3af', 'font-size': 11,
        }, document.createTextNode('Idle · awaiting requests')));
      }
      coreG.appendChild(svgEl('circle', { cx: 386, cy: midY, r: 3.5, fill: '#60a5fa' }));
      coreG.appendChild(svgEl('circle', { cx: 574, cy: midY, r: 3.5, fill: '#60a5fa' }));
      svg.appendChild(coreG);

      // Outbound driver nodes + curves from Core
      if (visibleDrivers.length === 0) {
        svg.appendChild(svgEl('path', {
          d: 'M 574 ' + midY + ' C 638 ' + midY + ', 648 ' + midY + ', 716 ' + midY,
          fill: 'none', stroke: '#343b48', 'stroke-width': 1.2, 'stroke-dasharray': '4 4',
        }));
        svg.appendChild(svgEl('rect', {
          x: 716, y: midY - 22, width: 228, height: 44, rx: 6,
          fill: '#11141a', stroke: '#343b48', 'stroke-dasharray': '4 4',
        }));
        svg.appendChild(svgEl('text', {
          x: 830, y: midY + 4, 'text-anchor': 'middle', fill: '#9ca3af', 'font-size': 12,
        }, document.createTextNode('No drivers configured')));
      } else {
        visibleDrivers.forEach((d, idx) => {
          const cy = Math.round(topOffset + ((idx + 0.5) / rowSlots) * usableH);
          const dy = cy - 17;
          const isConnected = d.status === 'CONNECTED';
          const statusColor = isConnected ? '#10b981'
            : d.status === 'CONNECTING' ? '#f59e0b'
            : d.status === 'STOPPED' ? '#9ca3af' : '#f87171';
          const shortName = d.name.length > 17 ? (d.name.slice(0, 16) + '…') : d.name;
          const calls = callCounts[d.name] || 0;
          const metaLabel = d.type + ' · ' + (d.toolCount || 0) + 't' + (calls > 0 ? (' · ' + calls + 'c') : '');

          svg.appendChild(svgEl('path', {
            d: 'M 574 ' + midY + ' C 642 ' + midY + ', 648 ' + cy + ', 716 ' + cy,
            fill: 'none',
            stroke: isConnected ? '#60a5fa' : '#343b48',
            'stroke-width': isConnected ? 1.75 : 1.15,
            'stroke-dasharray': isConnected ? 'none' : '4 4',
            opacity: isConnected ? 0.9 : 0.7,
          }));

          const dg = svgEl('g');
          dg.appendChild(svgEl('rect', {
            x: 716, y: dy, width: 228, height: 34, rx: 5,
            fill: '#141820', stroke: isConnected ? '#343b48' : '#232832',
          }));
          dg.appendChild(svgEl('circle', { cx: 716, cy: cy, r: 3, fill: isConnected ? '#60a5fa' : '#343b48' }));
          dg.appendChild(svgEl('circle', { cx: 730, cy: cy, r: 3.5, fill: statusColor }));
          dg.appendChild(svgEl('text', {
            x: 742, y: cy + 4, fill: '#f3f4f6', 'font-size': 12, 'font-weight': 500,
          }, document.createTextNode(shortName)));
          dg.appendChild(svgEl('text', {
            x: 932, y: cy + 4, 'text-anchor': 'end', fill: '#9ca3af', 'font-size': 11, 'font-family': 'ui-monospace, monospace',
          }, document.createTextNode(metaLabel)));
          svg.appendChild(dg);
        });

        if (hiddenCount > 0) {
          const cy = Math.round(topOffset + ((visibleDrivers.length + 0.5) / rowSlots) * usableH);
          svg.appendChild(svgEl('text', {
            x: 716, y: cy + 4, fill: '#9ca3af', 'font-size': 11,
          }, document.createTextNode('+ ' + hiddenCount + ' additional drivers in inventory')));
        }
      }

      container.appendChild(svg);
    }

    async function fetchOverview() {
      try {
        const data = await apiFetch('/api/admin/overview');
        lastOverviewData = data;
        showOverviewAlert('');
        document.getElementById('gatewayModeBadge').textContent = data.mode;
        document.getElementById('sseClientsBadge').textContent = data.activeSseTransports + ' SSE Clients';
        document.getElementById('kpiActiveDrivers').textContent = data.activeDriversCount + ' / ' + data.totalDriversCount;
        document.getElementById('kpiTotalDrivers').textContent = 'Configured: ' + data.totalDriversCount;
        document.getElementById('kpiTotalTools').textContent = data.totalTools;
        updateMetricsUI(data.metrics);
        renderTopologyGraph(data);
        renderDriversGrid(data.drivers || [], (data.metrics && data.metrics.driverCallCounts) || {});
      } catch (e) {
        showOverviewAlert(e.message);
      }
    }

    function renderDriversGrid(drivers, callCounts) {
      const grid = document.getElementById('driversGrid');
      clearNode(grid);

      if (!drivers || drivers.length === 0) {
        grid.appendChild(el('div', { className: 'empty-state' }, [
          el('p', { text: 'No outbound drivers configured yet.' }),
          el('button', {
            type: 'button',
            className: 'btn btn-primary',
            text: 'Browse Catalog',
            dataset: { action: 'switch-tab', tab: 'marketplace' },
          }),
        ]));
        return;
      }

      const counts = callCounts || {};
      drivers.forEach((d) => {
        const statusTone = d.status === 'CONNECTED' ? 'success'
          : d.status === 'CONNECTING' ? 'warning'
          : d.status === 'STOPPED' ? 'muted' : 'danger';
        const statusLabel = d.status === 'CONNECTED' ? 'Connected'
          : d.status === 'CONNECTING' ? 'Connecting'
          : d.status === 'STOPPED' ? 'Stopped' : (d.status || 'Error');

        const actions = [];
        if (d.status === 'CONNECTED') {
          actions.push(el('button', {
            type: 'button',
            className: 'btn',
            text: 'Restart',
            dataset: { action: 'restart-driver', driver: d.name },
          }));
          actions.push(el('button', {
            type: 'button',
            className: 'btn btn-danger',
            text: 'Stop',
            dataset: { action: 'stop-driver', driver: d.name },
          }));
        } else if (d.status === 'CONNECTING') {
          actions.push(el('button', { type: 'button', className: 'btn', text: 'Connecting...', disabled: true }));
        } else {
          actions.push(el('button', {
            type: 'button',
            className: 'btn btn-primary',
            text: 'Start',
            dataset: { action: 'restart-driver', driver: d.name },
          }));
        }

        actions.push(el('button', {
          type: 'button',
          className: 'btn btn-danger',
          style: 'margin-left: auto;',
          text: 'Delete',
          dataset: { action: 'delete-driver', driver: d.name },
        }));

        const calls = counts[d.name] || 0;
        const metaNodes = [
          el('span', { className: 'tag mono', text: d.type }),
          el('span', { text: (d.toolCount || 0) + ' tools' }),
        ];
        if (calls > 0) metaNodes.push(el('span', { text: '· ' + calls + ' calls' }));

        const bodyNodes = [
          el('div', { className: 'driver-meta tabular' }, metaNodes),
        ];
        if (d.commandOrUrl) {
          bodyNodes.push(el('div', { className: 'driver-command', text: d.commandOrUrl, title: d.commandOrUrl }));
        }
        if (d.lastError) {
          bodyNodes.push(el('div', { className: 'driver-error', text: 'Error: ' + d.lastError }));
        }

        grid.appendChild(el('article', { className: 'driver-card' }, [
          el('div', { className: 'driver-header' }, [
            el('div', { className: 'driver-name', text: d.name }),
            makeStatusInline(statusLabel, statusTone),
          ]),
          ...bodyNodes,
          el('div', { className: 'driver-actions' }, actions),
        ]));
      });
    }

    async function runDriverBulkAction(endpoint, successMsg) {
      try {
        await apiFetch(endpoint, { method: 'POST' });
        showToast(successMsg, 'success');
        fetchOverview();
      } catch (e) {
        showToast(e.message, 'error');
      }
    }

    async function restartDriver(name) {
      try {
        await apiFetch('/api/admin/drivers/' + encodeURIComponent(name) + '/restart', { method: 'POST' });
        showToast('Driver "' + name + '" restarted.', 'success');
        fetchOverview();
      } catch (e) {
        showToast(e.message, 'error');
      }
    }

    async function stopDriver(name) {
      try {
        await apiFetch('/api/admin/drivers/' + encodeURIComponent(name) + '/stop', { method: 'POST' });
        showToast('Driver "' + name + '" stopped.', 'info');
        fetchOverview();
      } catch (e) {
        showToast(e.message, 'error');
      }
    }

    async function deleteDriver(name) {
      const ok = await confirmAction(
        'Delete Driver',
        'Remove outbound driver "' + name + '" from gateway configuration?',
        'Delete Driver',
        true
      );
      if (!ok) return;
      try {
        await apiFetch('/api/admin/drivers/' + encodeURIComponent(name), { method: 'DELETE' });
        showToast('Driver "' + name + '" removed.', 'success');
        fetchOverview();
      } catch (e) {
        showToast(e.message, 'error');
      }
    }

    async function fetchLogs() {
      try {
        const data = await apiFetch('/api/admin/logs?limit=50');
        const tbody = document.getElementById('logsTableBody');
        clearNode(tbody);
        if (data.logs && data.logs.length > 0) {
          // Backend returns newest-first; append in order so newest stays at top.
          data.logs.forEach((log) => insertAuditLogRow(log, false));
        } else {
          tbody.appendChild(el('tr', null, el('td', {
            colspan: 7,
            className: 'cell-empty',
            text: 'No audit logs recorded yet.',
          })));
        }
      } catch (e) {
        console.error('Failed to fetch logs', e);
      }
    }

    async function clearLogs() {
      const ok = await confirmAction(
        'Clear Audit History',
        'Clear all in-memory audit logs from the dashboard ring buffer?',
        'Clear History',
        true
      );
      if (!ok) return;
      try {
        await apiFetch('/api/admin/logs', { method: 'DELETE' });
        const tbody = document.getElementById('logsTableBody');
        clearNode(tbody);
        tbody.appendChild(el('tr', null, el('td', {
          colspan: 7,
          className: 'cell-empty',
          text: 'Audit history cleared.',
        })));
        showToast('Audit history cleared.', 'info');
      } catch (e) {
        showToast(e.message, 'error');
      }
    }

    // TAB 2: Marketplace Catalog
    async function fetchCatalog() {
      try {
        cachedCatalog = await apiFetch('/api/admin/catalog');
        renderCatalog();
      } catch (e) {
        showToast('Failed to load marketplace catalog: ' + e.message, 'error');
      }
    }

    function setCatalogCategory(cat) {
      activeCategory = cat;
      document.querySelectorAll('.filter-chip').forEach((btn) => {
        const active = btn.dataset.category === cat;
        btn.classList.toggle('is-active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
      });
      renderCatalog();
    }

    function renderCatalog() {
      const grid = document.getElementById('catalogGrid');
      clearNode(grid);
      const query = (document.getElementById('catalogSearch').value || '').toLowerCase().trim();

      const filtered = cachedCatalog.filter((item) => {
        const matchesCat = activeCategory === 'All'
          ? true
          : activeCategory === 'Installed'
            ? item.installed
            : item.category === activeCategory;
        const matchesQuery = !query ||
          item.name.toLowerCase().includes(query) ||
          item.description.toLowerCase().includes(query) ||
          item.id.toLowerCase().includes(query);
        return matchesCat && matchesQuery;
      });

      if (filtered.length === 0) {
        grid.appendChild(el('div', { className: 'empty-state' }, [
          el('p', { text: 'No drivers match your current filter or search.' }),
          el('button', {
            type: 'button',
            className: 'btn',
            text: 'Reset Filters',
            dataset: { action: 'reset-catalog-filters' },
          }),
        ]));
        return;
      }

      filtered.forEach((item) => {
        const statusNode = item.installed
          ? makeStatusInline('Installed', 'success')
          : el('span', { className: 'status-inline is-muted', text: 'Available' });

        grid.appendChild(el('article', { className: 'catalog-item-card' }, [
          el('div', { className: 'catalog-item-head' }, [
            el('div', { className: 'catalog-item-title-wrap' }, [
              el('span', { className: 'catalog-icon-tile', 'aria-hidden': 'true', text: getDriverMonogram(item.id, item.name) }),
              el('div', null, [
                el('div', { className: 'catalog-item-name', text: item.name }),
                el('div', { className: 'catalog-item-cat', text: item.category }),
              ]),
            ]),
            statusNode,
          ]),
          el('p', { className: 'catalog-item-desc', text: item.description }),
          el('div', { className: 'catalog-item-foot' }, [
            el('span', { className: 'tag mono', text: item.defaultConfig.type }),
            el('button', {
              type: 'button',
              className: item.installed ? 'btn' : 'btn btn-primary',
              text: item.installed ? 'Configure' : 'Install',
              dataset: { action: 'open-install', driver: item.id },
            }),
          ]),
        ]));
      });
    }

    function openInstallModal(driverId, triggerEl) {
      const item = cachedCatalog.find((c) => c.id === driverId);
      if (!item) return;

      document.getElementById('modalDriverId').value = item.id;
      document.getElementById('modalCatalogTitle').textContent = (item.installed ? 'Configure ' : 'Install ') + item.name;
      document.getElementById('modalCatalogDesc').textContent = item.description;

      const container = document.getElementById('modalEnvVarsContainer');
      clearNode(container);

      if (item.envVars && item.envVars.length > 0) {
        item.envVars.forEach((v, idx) => {
          const inputId = 'install-env-' + idx;
          const labelChildren = [v.label + ' '];
          if (v.required) {
            labelChildren.push(el('span', { text: '*', style: 'color: var(--red-400);', 'aria-hidden': 'true' }));
          }
          container.appendChild(el('div', { className: 'form-group' }, [
            el('label', { className: 'form-label', for: inputId }, labelChildren),
            el('input', {
              id: inputId,
              type: v.secret ? 'password' : 'text',
              name: 'env_' + v.key,
              className: 'form-input',
              placeholder: v.placeholder || '',
              value: v.defaultValue || '',
              required: Boolean(v.required),
            }),
            el('div', { className: 'form-help', text: v.description + ' (' + v.key + ')' }),
          ]));
        });
      } else {
        container.appendChild(el('p', {
          className: 'section-desc',
          text: 'This driver requires no external secret configuration. Ready to install.',
        }));
      }

      openDialog('installModal', triggerEl);
    }

    async function submitInstallCatalogDriver(e) {
      e.preventDefault();
      const driverId = document.getElementById('modalDriverId').value;
      const item = cachedCatalog.find((c) => c.id === driverId);
      if (!item) return;

      const formData = new FormData(e.target);
      const envSecrets = {};
      for (const [name, val] of formData.entries()) {
        if (name.startsWith('env_') && typeof val === 'string' && val.trim()) {
          envSecrets[name.substring(4)] = val.trim();
        }
      }

      try {
        await apiFetch('/api/admin/drivers/' + encodeURIComponent(driverId), {
          method: 'POST',
          body: JSON.stringify({ config: item.defaultConfig, envSecrets }),
        });
        closeDialog('installModal');
        showToast('Driver "' + item.name + '" configured and started.', 'success');
        fetchCatalog();
        fetchOverview();
      } catch (err) {
        showToast('Install failed: ' + err.message, 'error');
      }
    }

    function openCustomDriverModal(triggerEl) {
      document.getElementById('customDriverForm').reset();
      toggleCustomFields();
      openDialog('customDriverModal', triggerEl);
    }

    function toggleCustomFields() {
      const type = document.getElementById('customType').value;
      document.getElementById('customStdioGroup').hidden = type !== 'stdio';
      document.getElementById('customSseGroup').hidden = type !== 'sse';
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
        config.args = argsStr ? argsStr.split(/\\s+/) : [];
      } else {
        config.url = document.getElementById('customUrl').value.trim();
      }

      try {
        await apiFetch('/api/admin/drivers/' + encodeURIComponent(name), {
          method: 'POST',
          body: JSON.stringify({ config }),
        });
        closeDialog('customDriverModal');
        showToast('Custom driver "' + name + '" registered.', 'success');
        fetchCatalog();
        fetchOverview();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    // TAB 3: Playground
    async function fetchToolsForPlayground() {
      try {
        const data = await apiFetch('/api/admin/tools');
        cachedTools = data.tools || [];
        renderPlaygroundTools();
      } catch (e) {
        const list = document.getElementById('playgroundToolList');
        clearNode(list);
        list.appendChild(el('div', { className: 'form-error', text: 'Failed to load tools: ' + e.message }));
      }
    }

    function buildSampleArgs(tool) {
      const sample = {};
      if (tool && tool.inputSchema && tool.inputSchema.properties) {
        for (const [key, prop] of Object.entries(tool.inputSchema.properties)) {
          if (prop.default !== undefined) sample[key] = prop.default;
          else if (prop.type === 'string') sample[key] = '';
          else if (prop.type === 'number' || prop.type === 'integer') sample[key] = 0;
          else if (prop.type === 'boolean') sample[key] = false;
          else if (prop.type === 'array') sample[key] = [];
          else if (prop.type === 'object') sample[key] = {};
          else sample[key] = null;
        }
      }
      return sample;
    }

    function renderPlaygroundTools() {
      const list = document.getElementById('playgroundToolList');
      clearNode(list);
      const filter = (document.getElementById('playgroundToolFilter').value || '').toLowerCase().trim();
      const filtered = cachedTools.filter((t) => t.name.toLowerCase().includes(filter));

      if (filtered.length === 0) {
        list.appendChild(el('div', { className: 'form-help', text: 'No matching tools found.', style: 'padding: 12px;' }));
        return;
      }

      filtered.forEach((tool) => {
        const isSelected = Boolean(selectedPlaygroundTool && selectedPlaygroundTool.name === tool.name);
        list.appendChild(el('button', {
          type: 'button',
          className: 'tool-picker-item' + (isSelected ? ' is-selected' : ''),
          'aria-pressed': isSelected ? 'true' : 'false',
          text: tool.name,
          dataset: { action: 'select-tool', tool: tool.name },
        }));
      });
    }

    function setPlaygroundJsonError(msg) {
      const input = document.getElementById('pgArgsInput');
      const err = document.getElementById('pgJsonError');
      input.setAttribute('aria-invalid', msg ? 'true' : 'false');
      err.textContent = msg || '';
      err.hidden = !msg;
    }

    function selectPlaygroundTool(toolName) {
      const tool = cachedTools.find((t) => t.name === toolName);
      if (!tool) return;
      selectedPlaygroundTool = tool;
      renderPlaygroundTools();

      document.getElementById('pgToolTitle').textContent = tool.name;
      document.getElementById('pgToolDesc').textContent = tool.description || 'No tool description provided.';
      document.getElementById('pgExecuteBtn').disabled = false;
      document.getElementById('pgFormatBtn').disabled = false;
      document.getElementById('pgResetSampleBtn').disabled = false;
      document.getElementById('pgArgsInput').value = JSON.stringify(buildSampleArgs(tool), null, 2);
      setPlaygroundJsonError('');
    }

    function formatPlaygroundJson() {
      const input = document.getElementById('pgArgsInput');
      try {
        const parsed = JSON.parse(input.value || '{}');
        input.value = JSON.stringify(parsed, null, 2);
        setPlaygroundJsonError('');
      } catch (e) {
        setPlaygroundJsonError('Invalid JSON: ' + e.message);
      }
    }

    async function copyPlaygroundOutput() {
      const text = document.getElementById('pgOutput').textContent || '';
      try {
        await navigator.clipboard.writeText(text);
        showToast('Execution output copied to clipboard.', 'success');
      } catch {
        showToast('Clipboard permission unavailable in this browser context.', 'warning');
      }
    }

    async function executePlaygroundTool() {
      if (!selectedPlaygroundTool) return;
      const btn = document.getElementById('pgExecuteBtn');

      let args = {};
      try {
        args = JSON.parse(document.getElementById('pgArgsInput').value || '{}');
        setPlaygroundJsonError('');
      } catch (e) {
        setPlaygroundJsonError('Invalid JSON in arguments field: ' + e.message);
        document.getElementById('pgArgsInput').focus();
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Executing...';
      document.getElementById('pgOutput').setAttribute('aria-busy', 'true');

      try {
        const data = await apiFetch('/api/admin/playground/execute', {
          method: 'POST',
          body: JSON.stringify({
            toolName: selectedPlaygroundTool.name,
            args,
            adapterName: document.getElementById('pgSimAdapter').value,
            userEmail: document.getElementById('pgSimUser').value,
          }),
        });
        document.getElementById('pgDurationBadge').textContent = data.durationMs + ' ms';
        document.getElementById('pgOutput').textContent = JSON.stringify(data.mcpResponse, null, 2);
      } catch (err) {
        document.getElementById('pgOutput').textContent = 'Error: ' + err.message;
        showToast(err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = 'Execute Tool';
        document.getElementById('pgOutput').setAttribute('aria-busy', 'false');
      }
    }

    // TAB 4: Governance & Matrix
    async function fetchGovernanceData() {
      try {
        const [overview, usersData] = await Promise.all([
          apiFetch('/api/admin/overview'),
          apiFetch('/api/admin/governance/users'),
        ]);
        document.getElementById('govMaxRequests').value = overview.governance.rateLimiter.maxRequests || 0;
        document.getElementById('govWindowMs').value = overview.governance.rateLimiter.windowMs || 60000;
        document.getElementById('govMaxDailyBytes').value = overview.governance.budgetManager.maxDailyBytes || 0;

        renderPermissionMatrix(overview.drivers || [], overview.inboundAdapters || {});
        renderQuotaUsers(usersData.usersUsage || []);
      } catch (e) {
        showToast('Failed to load governance settings: ' + e.message, 'error');
      }
    }

    async function saveGovernanceSettings() {
      const maxRequests = parseInt(document.getElementById('govMaxRequests').value, 10);
      const windowMs = parseInt(document.getElementById('govWindowMs').value, 10);
      const maxDailyBytes = parseInt(document.getElementById('govMaxDailyBytes').value, 10);

      if ([maxRequests, windowMs, maxDailyBytes].some((n) => Number.isNaN(n) || n < 0)) {
        showToast('Governance limits must be valid non-negative numbers.', 'error');
        return;
      }

      try {
        await apiFetch('/api/admin/governance', {
          method: 'PUT',
          body: JSON.stringify({ maxRequests, windowMs, maxDailyBytes }),
        });
        showToast('Governance guardrails updated successfully.', 'success');
      } catch (e) {
        showToast(e.message, 'error');
      }
    }

    function renderPermissionMatrix(drivers, inboundAdapters) {
      const tbody = document.getElementById('matrixTableBody');
      clearNode(tbody);

      if (!drivers || drivers.length === 0) {
        tbody.appendChild(el('tr', null, el('td', {
          colspan: 4,
          className: 'cell-empty',
          text: 'No drivers available to configure.',
        })));
        return;
      }

      const adapters = ['generic', 'atlassian', 'openai'];
      drivers.forEach((d) => {
        const cells = [
          el('td', null, [
            el('strong', { text: d.name }),
            ' ',
            el('span', { text: '(' + d.type + ')', style: 'font-size: 0.75rem; color: var(--color-text-muted);' }),
          ]),
        ];

        adapters.forEach((adapter) => {
          const allowed = inboundAdapters[adapter] && Array.isArray(inboundAdapters[adapter].allowedDrivers)
            ? inboundAdapters[adapter].allowedDrivers.includes(d.name)
            : false;
          cells.push(el('td', { className: 'cell-center' }, el('input', {
            type: 'checkbox',
            checked: allowed,
            'aria-label': 'Allow ' + d.name + ' on ' + adapter + ' adapter',
            dataset: { driver: d.name, adapter },
          })));
        });

        tbody.appendChild(el('tr', null, cells));
      });
    }

    async function savePermissionMatrix() {
      const adapters = { generic: [], atlassian: [], openai: [] };
      document.querySelectorAll('#matrixTableBody input[type="checkbox"]').forEach((box) => {
        if (box.checked) {
          const driver = box.dataset.driver;
          const adapter = box.dataset.adapter;
          if (adapters[adapter] && driver) adapters[adapter].push(driver);
        }
      });

      try {
        await Promise.all(Object.entries(adapters).map(([name, allowedDrivers]) =>
          apiFetch('/api/admin/adapters/' + encodeURIComponent(name), {
            method: 'PUT',
            body: JSON.stringify({ allowedDrivers }),
          })
        ));
        showToast('Permission matrix saved successfully.', 'success');
        fetchOverview();
      } catch (e) {
        showToast(e.message, 'error');
      }
    }

    function renderQuotaUsers(users) {
      const tbody = document.getElementById('quotaUsersTableBody');
      clearNode(tbody);

      if (!users || users.length === 0) {
        tbody.appendChild(el('tr', null, el('td', {
          colspan: 6,
          className: 'cell-empty',
          text: 'No daily quota consumed yet today.',
        })));
        return;
      }

      users.forEach((u) => {
        tbody.appendChild(el('tr', null, [
          el('td', { text: u.userEmail, style: 'font-weight: 600;' }),
          el('td', { className: 'tabular', text: u.date }),
          el('td', null, makeBadge(u.usedFormatted, 'badge-warning')),
          el('td', { className: 'tabular', text: formatBytes(u.maxBytes) }),
          el('td', { className: 'tabular', text: formatBytes(u.remainingBytes) }),
          el('td', null, el('button', {
            type: 'button',
            className: 'btn btn-danger',
            text: 'Reset',
            dataset: { action: 'reset-user-quota', email: u.userEmail },
          })),
        ]));
      });
    }

    async function resetUserQuota(email) {
      const ok = await confirmAction('Reset User Quota', 'Reset daily quota today for "' + email + '"?', 'Reset Quota', true);
      if (!ok) return;
      try {
        await apiFetch('/api/admin/governance/reset-quota', {
          method: 'POST',
          body: JSON.stringify({ userEmail: email }),
        });
        showToast('Quota reset for ' + email + '.', 'success');
        fetchGovernanceData();
      } catch (e) {
        showToast(e.message, 'error');
      }
    }

    async function resetAllQuotas() {
      const ok = await confirmAction(
        'Reset All Quotas',
        'Reset all daily user quotas and rate limits across the gateway?',
        'Reset All',
        true
      );
      if (!ok) return;
      try {
        await apiFetch('/api/admin/governance/reset-quota', {
          method: 'POST',
          body: JSON.stringify({}),
        });
        showToast('All user quotas and rate limits reset.', 'success');
        fetchGovernanceData();
      } catch (e) {
        showToast(e.message, 'error');
      }
    }

    // TAB 5: Environment & Secrets
    async function fetchEnvData() {
      try {
        const data = await apiFetch('/api/admin/env');
        cachedEnvVars = data.variables || [];
        renderEnvTable();
      } catch (e) {
        showToast('Failed to load environment variables: ' + e.message, 'error');
      }
    }

    function renderEnvTable() {
      const tbody = document.getElementById('envTableBody');
      clearNode(tbody);

      if (!cachedEnvVars || cachedEnvVars.length === 0) {
        tbody.appendChild(el('tr', null, el('td', {
          colspan: 4,
          className: 'cell-empty',
          text: 'No environment variables configured yet.',
        })));
        return;
      }

      cachedEnvVars.forEach((v) => {
        const statusNode = makeStatusInline(v.isSet ? 'Set' : 'Unset', v.isSet ? 'success' : 'muted');
        const maskedCell = v.maskedValue
          ? el('td', { className: 'mono', text: v.maskedValue, style: 'font-size: var(--text-xs); color: var(--color-text-secondary);' })
          : el('td', { className: 'mono', text: '—', style: 'font-size: var(--text-xs); color: var(--color-text-muted);' });

        tbody.appendChild(el('tr', null, [
          el('td', null, el('code', { className: 'mono', text: v.key, style: 'color: var(--cobalt-300); font-size: var(--text-xs);' })),
          el('td', null, statusNode),
          maskedCell,
          el('td', null, el('input', {
            id: 'env-val-' + v.key,
            name: v.key,
            type: v.isSecret ? 'password' : 'text',
            autocomplete: v.isSecret ? 'new-password' : 'off',
            className: 'form-input env-value-input',
            placeholder: v.isSet ? 'Enter new value to update...' : 'Set value...',
            'aria-label': 'New value for ' + v.key,
            style: 'max-width: 420px;',
            dataset: { envKey: v.key },
          })),
        ]));
      });
    }

    async function saveEnvSettings() {
      const updates = {};
      document.querySelectorAll('.env-value-input').forEach((input) => {
        const val = input.value.trim();
        if (val && input.dataset.envKey) updates[input.dataset.envKey] = val;
      });

      if (Object.keys(updates).length === 0) {
        showToast('No new environment values entered.', 'info');
        return;
      }

      try {
        await apiFetch('/api/admin/env', {
          method: 'PUT',
          body: JSON.stringify({ vars: updates }),
        });
        showToast('Environment variables updated and persisted.', 'success');
        fetchEnvData();
        fetchOverview();
      } catch (err) {
        showToast(err.message, 'error');
      }
    }

    // Event Delegation & Keyboard Support
    document.addEventListener('click', (e) => {
      // Backdrop click closes native <dialog>
      if (e.target && e.target.tagName === 'DIALOG' && e.target.open) {
        const rect = e.target.getBoundingClientRect();
        const outside = e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom;
        if (outside) {
          if (e.target.id === 'confirmModal') resolveConfirm(false);
          else closeDialog(e.target.id);
          return;
        }
      }

      const target = e.target.closest('[data-action]');
      if (!target) return;
      const action = target.dataset.action;

      if (action === 'switch-tab') switchTab(target.dataset.tab, false);
      else if (action === 'open-auth') {
        document.getElementById('adminKeyInput').value = adminKey;
        setAuthError('');
        openDialog('authModal', target);
      } else if (action === 'close-dialog') {
        if (target.dataset.dialog === 'confirmModal') resolveConfirm(false);
        else closeDialog(target.dataset.dialog);
      } else if (action === 'confirm-accept') resolveConfirm(true);
      else if (action === 'start-all') runDriverBulkAction('/api/admin/drivers/actions/start-all', 'Started all enabled drivers.');
      else if (action === 'stop-all') {
        confirmAction('Stop All Drivers', 'Stop all active outbound drivers?', 'Stop All', true)
          .then((ok) => { if (ok) runDriverBulkAction('/api/admin/drivers/actions/stop-all', 'Stopped all outbound drivers.'); });
      } else if (action === 'restart-driver') restartDriver(target.dataset.driver);
      else if (action === 'stop-driver') stopDriver(target.dataset.driver);
      else if (action === 'delete-driver') deleteDriver(target.dataset.driver);
      else if (action === 'clear-logs') clearLogs();
      else if (action === 'refresh-logs') fetchLogs();
      else if (action === 'retry-overview') fetchOverview();
      else if (action === 'catalog-category') setCatalogCategory(target.dataset.category);
      else if (action === 'reset-catalog-filters') {
        document.getElementById('catalogSearch').value = '';
        setCatalogCategory('All');
      } else if (action === 'open-install') openInstallModal(target.dataset.driver, target);
      else if (action === 'open-custom') openCustomDriverModal(target);
      else if (action === 'select-tool') selectPlaygroundTool(target.dataset.tool);
      else if (action === 'format-pg-json') formatPlaygroundJson();
      else if (action === 'reset-pg-json') {
        if (selectedPlaygroundTool) {
          document.getElementById('pgArgsInput').value = JSON.stringify(buildSampleArgs(selectedPlaygroundTool), null, 2);
          setPlaygroundJsonError('');
        }
      } else if (action === 'copy-pg-output') copyPlaygroundOutput();
      else if (action === 'execute-pg') executePlaygroundTool();
      else if (action === 'preset-budget') document.getElementById('govMaxDailyBytes').value = target.dataset.bytes || '0';
      else if (action === 'save-governance') saveGovernanceSettings();
      else if (action === 'save-matrix') savePermissionMatrix();
      else if (action === 'reset-user-quota') resetUserQuota(target.dataset.email);
      else if (action === 'reset-all-quotas') resetAllQuotas();
      else if (action === 'save-env') saveEnvSettings();
    });

    // WAI-ARIA arrow-key navigation across tablist
    document.addEventListener('keydown', (e) => {
      const tab = e.target.closest && e.target.closest('[role="tab"]');
      if (!tab) return;
      const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
      const idx = tabs.indexOf(tab);
      if (idx === -1) return;
      let nextIdx = -1;
      if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') nextIdx = 0;
      else if (e.key === 'End') nextIdx = tabs.length - 1;
      if (nextIdx !== -1) {
        e.preventDefault();
        switchTab(tabs[nextIdx].dataset.tab, true);
      }
    });

    window.addEventListener('DOMContentLoaded', () => {
      document.getElementById('catalogSearch')?.addEventListener('input', renderCatalog);
      document.getElementById('playgroundToolFilter')?.addEventListener('input', renderPlaygroundTools);
      document.getElementById('customType')?.addEventListener('change', toggleCustomFields);
      document.getElementById('installForm')?.addEventListener('submit', submitInstallCatalogDriver);
      document.getElementById('customDriverForm')?.addEventListener('submit', submitCustomDriver);
      document.getElementById('authModalForm')?.addEventListener('submit', saveAdminKey);
      document.getElementById('envForm')?.addEventListener('submit', (e) => {
        e.preventDefault();
        saveEnvSettings();
      });

      document.querySelectorAll('dialog.modal').forEach((dlg) => {
        dlg.addEventListener('cancel', () => {
          if (dlg.id === 'confirmModal') {
            const resolver = confirmResolver;
            confirmResolver = null;
            if (resolver) resolver(false);
          }
        });
      });

      checkAuthStatus().then((ok) => {
        if (ok) {
          initSse();
          fetchOverview();
          fetchLogs();
        }
      });
    });
  })();
`;

