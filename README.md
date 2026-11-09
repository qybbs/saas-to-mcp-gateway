# SaaS-to-MCP Gateway

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![MCP Protocol](https://img.shields.io/badge/MCP%20Protocol-2024--11--05-blueviolet)](https://modelcontextprotocol.io/)
[![Tools Count](https://img.shields.io/badge/Consolidated%20Tools-13%20Services-brightgreen)](#consolidated-ecosystem-13-services)
[![Web Dashboard](https://img.shields.io/badge/Web%20Dashboard-Built--in-blue?logo=googlechrome&logoColor=white)](#web-management-console--1-click-marketplace)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](file:///Users/OUT2305/Repo/bigquery-mcp/docker-compose.yaml)
[![Google Cloud Run](https://img.shields.io/badge/GCP-Cloud%20Run-4285F4?logo=googlecloud&logoColor=white)](file:///Users/OUT2305/Repo/bigquery-mcp/docs/docker.md)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](file:///Users/OUT2305/Repo/bigquery-mcp/LICENSE)

> **Enterprise Universal Inbound Adapter & MCP Gateway for AI Agents & SaaS Platforms**  
> Consolidate multi-agent tool access, dynamic SaaS client registration (OAuth 2.1 RFC 7591 / Atlassian Rovo), and enterprise governance & budgeting into a single, high-performance TypeScript Model Context Protocol (MCP) gateway.

---

## Table of Contents

- [Overview & Value Proposition](#overview--value-proposition)
- [Dual-Mode Architecture](#dual-mode-architecture)
- [Web Management Console & 1-Click Marketplace](#web-management-console--1-click-marketplace)
- [System Architecture Diagram](#system-architecture-diagram)
- [Consolidated Ecosystem (13 Services)](#consolidated-ecosystem-13-services)
- [Quick Start: Local Hub in 2 Minutes](#quick-start-local-hub-in-2-minutes)
- [Client Configuration Guides (Copy-Paste)](#client-configuration-guides-copy-paste)
  - [OpenCode CLI](#1-opencode-cli)
  - [Google Antigravity IDE](#2-google-antigravity-ide)
  - [Cursor IDE](#3-cursor-ide)
  - [Claude Code](#4-claude-code)
- [Enterprise SaaS Integration (Atlassian Rovo)](#enterprise-saas-integration-atlassian-rovo)
- [Governance, Rate Limiting & User Budgeting](#governance-rate-limiting--user-budgeting)
- [Production Deployment (Google Cloud Run & Docker)](#production-deployment-google-cloud-run--docker)
- [Configuration Reference](#configuration-reference)
- [Troubleshooting](#troubleshooting)
- [Security & Governance](#security--governance)
- [Competitive Analysis & Strategic Roadmap](docs/roadmap-and-competitive-analysis.md)

---

## Overview & Value Proposition

As engineering organizations adopt AI coding assistants (**Antigravity**, **OpenCode**, **Cursor**, **Claude Code**, **Windsurf**) alongside enterprise AI knowledge agents (**Atlassian Rovo**, **ChatGPT Actions**), two critical architectural problems emerge:

1. **Tool & Token Sprawl in Developer Machines**: Every coding assistant runs its own isolated set of child processes (`npx`, `docker`, `uvx`) and requires individual API tokens hardcoded across multiple editor configs. When a token expires or rotates, every assistant breaks simultaneously.
2. **Disparate Inbound Protocols & Lack of Governance in Enterprise SaaS**: Enterprise AI platforms communicate using different authentication protocols, transport layers, and registration handshakes (e.g. RFC 7591 DCR, OAuth 2.1 PKCE, REST OpenAPI). Without a centralized gateway, organizations cannot enforce sliding-window rate limiting, user identity tracking, and daily usage budgeting across agent tools.

**`saas-to-mcp-gateway` solves both challenges simultaneously** via a unified, modular architecture.

---

## Dual-Mode Architecture

The gateway operates seamlessly in two complementary modes:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        saas-to-mcp-gateway                             │
├───────────────────────────────────┬────────────────────────────────────┤
│   Personal Mode (Local Dev Hub)   │   Enterprise Mode (Cloud Run)      │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Zero-auth /sse & /generic/mcp   │ • OAuth 2.1 (RFC 7591 DCR + PKCE)  │
│ • Consolidates 12 local & remote  │ • Microsoft Entra ID (OIDC SSO)    │
│   tools for AI coding assistants  │ • Stateless JWE / Firestore DCR    │
│ • Single secret management (.env) │ • Sliding-window rate limiter      │
│ • Eliminates process duplication  │ • Daily byte quotas & user budgets │
│ • Zero external dependencies      │ • Atlassian Rovo & SaaS bridge     │
└───────────────────────────────────┴────────────────────────────────────┘
```

1. **Personal Mode (Local Development Hub)**:
   - Exposes zero-friction endpoints (`GET /sse`, `POST /messages`, and `POST /generic/mcp`) for local coding agents.
   - Consolidates **12 downstream enterprise services** into one persistent background daemon.
   - All credentials (`GITHUB_PERSONAL_ACCESS_TOKEN`, `SONARQUBE_TOKEN`, `DD_API_KEY`, etc.) live securely in one `.env` file.
   - Read the complete [Multi-Agent MCP Consolidation Guide](file:///Users/OUT2305/Repo/bigquery-mcp/docs/consolidation-guide.md).

2. **Enterprise Mode (Production SaaS Gateway)**:
   - Exposes `/atlassian/mcp`, `/register`, `/oauth/authorize`, and `/oauth/token`.
   - Supports Dynamic Client Registration (RFC 7591) for Atlassian Rovo.
   - Full OAuth 2.1 Authorization Code Flow with PKCE and Microsoft Entra ID OIDC SSO.
   - User Identity Propagation (UIP): propagates caller context (`user_email`, `adapterName`, client registration) to downstream drivers and logs structured audit records.
   - Enforces sliding-window rate limiting and per-user daily byte quotas.

---

## Web Management Console & 1-Click Marketplace

The gateway includes a self-contained, dark-mode management console served at `http://localhost:3000/dashboard` (with zero extra build tools or separate processes):

- **Overview & Live Telemetry**: Live cards for driver uptime, active SSE clients, RPM, average tool latency (ms), and real-time streaming audit logs via Server-Sent Events (`/api/admin/events`).
- **1-Click MCP Marketplace**: Browse 22 curated community & enterprise servers (PostgreSQL, Redis, Sentry, Linear, Slack, Playwright, etc.) with automated secret saving to `.env` and hot-reloading in `DriverManager`.
- **Interactive Tool Playground**: Run and test any registered tool directly in the browser with auto-generated schema forms, synced JSON editors, and context simulation.
- **Scoping & FinOps Matrix**: Toggle driver permissions across inbound adapters (`generic`, `atlassian`, `openai`) and adjust sliding-window rate limits and daily query budgets with 1-click quota resets.
- **Dual-Mode Security**: Instant access in Personal Mode (`ADMIN_API_KEY` unset); token-protected with unlock modal when `ADMIN_API_KEY` is configured in production.

---

## System Architecture Diagram

```mermaid
graph TD
    subgraph Clients ["AI Clients & SaaS Platforms"]
        AG[Antigravity IDE]
        OC[OpenCode CLI]
        CR[Cursor IDE / Windsurf]
        CC[Claude Code]
        ROVO[Atlassian Rovo Agents]
        GPT[ChatGPT Custom GPTs / Assistants]
    end

    subgraph Gateway ["saas-to-mcp-gateway (Port 3000)"]
        direction TB
        IN_GEN[Generic Adapter<br/>/sse & /generic/mcp]
        IN_ATL[Atlassian Adapter<br/>OAuth 2.1 + DCR RFC 7591]
        IN_OAI[OpenAI Action Adapter<br/>OpenAPI 3.1.0 & REST]
        
        AUTH[Auth Guard & UIP<br/>User Identity Propagation]
        GOV[Governance & Policy Engine<br/>• Sliding-Window Rate Limiter<br/>• Daily User Budget Quotas<br/>• Driver Scoping & Audit Logging]
        REGISTRY[Outbound Client Registry<br/>• Dynamic tool namespacing: driver_tool<br/>• Process & SSE Lifecycle Management]
    end

    subgraph Ecosystem ["11 Downstream Services (199 Tools)"]
        BQ[(Google BigQuery MCP<br/>custom-bigquery-mcp)]
        GH[GitHub MCP<br/>Repos, PRs, Issues]
        NOTION[Notion MCP<br/>Pages, DBs, Markdown]
        DD[Datadog APM<br/>Logs, Traces, Metrics]
        SQ[SonarQube<br/>Quality Gate, Issues]
        CH[(ClickHouse Cloud<br/>OLAP Analytics)]
        CS[ClickStack<br/>Traces & Telemetry]
        CTX[Context7<br/>Live Library Docs]
        LI[LinkedIn MCP<br/>Professional Network]
        CHD[ClickHouse Docs<br/>SQL Knowledge]
        ATL_REM[Atlassian Remote<br/>Jira & Confluence]
    end

    AG -->|HTTP/SSE| IN_GEN
    OC -->|HTTP/SSE| IN_GEN
    CR -->|HTTP/SSE| IN_GEN
    CC -->|HTTP/SSE| IN_GEN
    ROVO -->|HTTPS OAuth 2.1| IN_ATL
    GPT -->|HTTPS REST OpenAPI| IN_OAI

    IN_GEN --> AUTH
    IN_ATL --> AUTH
    IN_OAI --> AUTH
    AUTH --> GOV
    GOV --> REGISTRY

    REGISTRY --> BQ
    REGISTRY --> GH
    REGISTRY --> NOTION
    REGISTRY --> DD
    REGISTRY --> SQ
    REGISTRY --> CH
    REGISTRY --> CS
    REGISTRY --> CTX
    REGISTRY --> LI
    REGISTRY --> CHD
    REGISTRY --> ATL_REM
```

---

## Consolidated Ecosystem (13 Services)

Every tool exposed by the gateway hub is cleanly namespaced as `{driver}_{originalToolName}`, eliminating collisions and enabling clear driver routing:

| Driver | Transport / Bridge | Tools | Highlighted Capabilities | Required Env Vars |
| :--- | :--- | :---: | :--- | :--- |
| **`bigquery`** | Outbound stdio (`qybbs/custom-bigquery-mcp`) | **5** | Safe schema inspection, dry-run cost estimation, read-only SQL with FinOps labels & row caps | `GCP_PROJECT_ID`, `GCP_KEY_FILE_PATH`, `ALLOWLIST_TABLES` |
| **`datastudio`**| Outbound stdio (`qybbs/data-studio-mcp`) | **4** | Autonomous BI dimension breakdown and reporting | *(Public / Stdio)* |
| **`github`** | `npx @modelcontextprotocol/server-github` | **26** | Issues, pull requests, file search, commits, branch management, code search | `GITHUB_PERSONAL_ACCESS_TOKEN` |
| **`notion`** | `npx @notionhq/notion-mcp-server` | **24** | Search pages, read databases, retrieve markdown, update content blocks | `NOTION_API_KEY` |
| **`datadog`** | `mcp-remote` SSE Bridge | **30** | Logs analysis, trace spans, metrics aggregation, incident lookup, APM skills | `DD_API_KEY`, `DD_APP_KEY`, `DD_SITE` |
| **`sonarqube`**| `npx sonarqube-api-mcp` | **8** | Quality gate status, rule details, issue context, remediation fix plans | `SONARQUBE_URL`, `SONARQUBE_TOKEN` |
| **`clickhouse`**| `mcp-remote` SSE Bridge | **17** | Analytical queries, database & table listing, slow query pattern diagnostics | `CLICKHOUSE_URL`, `CLICKHOUSE_USER`, `CLICKHOUSE_PASSWORD` |
| **`clickstack`**| `mcp-remote` SSE Bridge | **33** | SQL queries, time series metrics, distributed trace waterfalls, telemetry signals | `CLICKSTACK_API_KEY`, `CLICKSTACK_SERVICE_ID` |
| **`context7`** | `mcp-remote` SSE Bridge | **2** | Real-time up-to-date documentation for any modern software library or framework | `CONTEXT7_API_KEY` |
| **`linkedin`** | `uvx mcp-server-linkedin` | **20** | Profile lookup, company posts, job search, network messaging | `LINKEDIN_COOKIE` |
| **`clickhouse-docs`** | `mcp-remote` SSE Bridge | **2** | Semantic search across ClickHouse documentation and SQL dialect guides | *(Public / None)* |
| **`atlassian`**| `mcp-remote` SSE Bridge | **32** | Confluence pages, Jira issue management, worklogs, transitions, JQL search | `ATLASSIAN_API_TOKEN`, `ATLASSIAN_EMAIL` |
| **`amplitude`**| `mcp-remote` Streamable HTTP Bridge | **25+** | Behavioral product analytics, user cohorts, funnels, retention, event taxonomy | *(OAuth 2.0 via `mcp-remote`)* |

---

## Quick Start: Local Hub in 2 Minutes

### 1. Clone & Install
```bash
git clone https://github.com/qybbs/saas-to-mcp-gateway.git
cd saas-to-mcp-gateway
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```
Edit `.env` and fill in the API keys for the services you use (unused drivers will gracefully stay inactive).

### 3. Build & Start
```bash
# Compile TypeScript to dist/
npm run build

# Start the gateway daemon
npm start
```

### 4. Verify Health
```bash
curl http://localhost:3000/generic/health
# {"status":"ok","service":"saas-to-mcp-gateway","version":"1.1.0","tools_count":199}
```

---

## Client Configuration Guides (Copy-Paste)

### 1. OpenCode CLI
In `~/.config/opencode/opencode.jsonc`:
```jsonc
{
  "mcp": {
    "gateway-hub": {
      "type": "remote",
      "url": "http://localhost:3000/sse"
    }
  }
}
```

### 2. Google Antigravity IDE
In `~/.gemini/config/mcp_config.json`:
```json
{
  "mcpServers": {
    "gateway-hub": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

### 3. Cursor IDE
In `~/.cursor/mcp.json` or `.cursor/mcp.json`:
```json
{
  "mcpServers": {
    "gateway-hub": {
      "url": "http://localhost:3000/sse"
    }
  }
}
```

### 4. Claude Code
Run in your terminal:
```bash
claude mcp add --transport sse gateway-hub http://localhost:3000/sse
```

---

## Enterprise SaaS Integration (Atlassian Rovo)

The gateway allows enterprise platforms (like Atlassian Rovo) to discover and call internal database tools securely.

### Registration in Atlassian Administration:
1. Ensure your gateway is exposed over HTTPS (via Cloud Run or Cloudflare Tunnel: `cloudflared tunnel --url http://localhost:3000`).
2. Navigate to **Atlassian Administration** > **Apps** > **Connected apps**.
3. Select **Add external MCP server** > **Custom MCP server**.
4. Enter the base URL: `https://your-domain.com`.
5. Atlassian will dynamically register via RFC 7591 (`POST /register`), initiate OAuth 2.1 PKCE authorization (`/oauth/authorize`), and exchange codes for tokens (`/oauth/token`).
6. Once connected, enterprise users can query allowed BigQuery datasets via Atlassian Chat and Studio Agents.

### Supported DCR Persistence Modes:
- `STATELESS` (Default): Stores client metadata encrypted in the JWE `client_id` with zero database dependencies.
- `MEMORY`: In-memory hashmap for local testing.
- `FIRESTORE`: Stateful, distributed client repository on Google Cloud Firestore.

---

## OpenAI Custom GPTs & ChatGPT Actions Integration

The gateway natively translates downstream MCP tools into dynamic **OpenAPI 3.1.0 JSON** schemas and REST endpoints (`/openai/*`), allowing any Custom GPT or OpenAI Assistant to invoke corporate data and tools.

### 1. Dynamic OpenAPI Specification (`GET /openai/openapi.json`)
ChatGPT Custom GPTs enforce a hard limit of **maximum 30 operations per Action schema**. Because our gateway consolidates nearly 200 tools, use query parameters to import specific drivers or tools:

```text
# Import all BigQuery tools (5 operations)
https://your-domain.com/openai/openapi.json?drivers=bigquery

# Import BigQuery and GitHub tools (31 ops -> use tool filter to stay under 30)
https://your-domain.com/openai/openapi.json?drivers=bigquery,github

# Import exact subset of tools
https://your-domain.com/openai/openapi.json?tools=bigquery_search_allowed_tables,bigquery_execute_readonly_query,github_search_repositories
```

### 2. Setup in ChatGPT Custom GPT Builder:
1. Open [ChatGPT GPT Editor](https://chatgpt.com/gpts/editor).
2. Go to **Configure** > **Actions** > **Create new action**.
3. Under **Schema**, click **Import from URL**.
4. Enter your gateway URL with driver filters, e.g.:
   `https://your-domain.com/openai/openapi.json?drivers=bigquery`
5. **Authentication**:
   - If `OPENAI_ADAPTER_API_KEY` is configured in `.env`, set **Authentication type** to `API Key`, **Auth Type** to `Bearer` (or `Custom` with Header Name `X-API-Key`), and paste your secret key.
   - If `OPENAI_ADAPTER_API_KEY` is empty, set **Authentication type** to `None`.
6. Test your Action directly inside the ChatGPT preview playground!

### 3. REST Action Execution (`POST /openai/tools/:toolName`)
OpenAI calls are routed through the gateway's core governance pipeline:
- Respects **User Identity Propagation (UIP)** (`ToolContext.adapterName = 'openai'`).
- Enforces sliding-window rate limiting (returns HTTP `429 Too Many Requests` on quota breaches).
- Enforces daily user byte budgets across data tools.
- Generates structured JSON audit logs for Cloud Logging and Datadog.

---

## Governance, Rate Limiting & User Budgeting

The gateway acts as an enforcement layer across all inbound client adapters and outbound tool drivers:

```
[Inbound Client] ──> [1. Rate Limiter] ──> [2. Budget Manager] ──> [3. Driver Scoping] ──> [4. Downstream Driver]
```

1. **Sliding-Window Rate Limiting**: Throttles burst traffic per user (e.g. max 60 requests/minute by default via `RATE_LIMIT_MAX_REQUESTS`), preventing runaway agent loops and API exhaustion.
2. **Per-User Daily Byte Quotas**: Enforces daily byte consumption limits (`USER_DAILY_BUDGET_BYTES`). Downstream drivers (such as `custom-bigquery-mcp`) report billed/processed bytes back in tool metadata, and the gateway automatically decrements the user's quota.
3. **Driver & Tool Scoping**: Inbound clients can be restricted to specific drivers or tools (`allowedDrivers`), ensuring that a client token or integration only accesses designated capabilities.
4. **User Identity Propagation (UIP)**: The gateway forwards caller identity (`user_email`, `adapterName`, client registration) to downstream drivers, allowing tools like `custom-bigquery-mcp` to tag cloud jobs for attribution.
5. **Structured Audit Logging**: Every invocation records request timestamp, user email, tool name, execution status (`SUCCESS`, `REJECTED`, `FAILED`), and driver-reported metadata in JSON format.

---

## Production Deployment (Google Cloud Run & Docker)

### Deploying to Google Cloud Run
```bash
# 1. Build and push container to Google Artifact Registry
gcloud builds submit --tag asia-southeast1-docker.pkg.dev/<GCP_PROJECT>/<REPO>/saas-to-mcp-gateway:1.1.0

# 2. Deploy stateless service to Cloud Run
gcloud run deploy saas-to-mcp-gateway \
  --image asia-southeast1-docker.pkg.dev/<GCP_PROJECT>/<REPO>/saas-to-mcp-gateway:1.1.0 \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --set-env-vars="MASTER_SECRET_KEY=...,AUTH_PROVIDER=OIDC,DCR_PERSISTENCE_MODE=STATELESS"
```

### Local Docker Compose
```bash
docker-compose up -d
```

---

## Configuration Reference

Key variables in `.env`:

| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | HTTP port for the gateway server | `3000` |
| `MASTER_SECRET_KEY` | 32-byte Base64 secret key for JWE / JWT signing | *(Required in Production)* |
| `DCR_PERSISTENCE_MODE` | Dynamic Client Registration store (`STATELESS`, `MEMORY`, `FIRESTORE`) | `STATELESS` |
| `AUTH_PROVIDER` | Inbound auth provider (`MOCK` or `OIDC`) | `MOCK` |
| `ALLOWED_EMAIL_DOMAINS` | Restrict OAuth login to specific corporate email domains | `*` |
| `USER_DAILY_BUDGET_BYTES` | Daily quota in bytes per user (0 = unlimited / Personal Mode) | `10737418240` (10 GB) |
| `RATE_LIMIT_MAX_REQUESTS` | Sliding-window request cap per user (0 = unthrottled) | `60` |
| `RATE_LIMIT_WINDOW_MS` | Sliding-window duration in milliseconds | `60000` (1 min) |
| `LOCAL_USER_EMAIL` | Fallback user identity for local dev (Cursor, Claude Code) | `developer@localhost` |
| `GENERIC_ADAPTER_API_KEY` | Optional static API key for `/sse` and `/generic/mcp` | *(Optional)* |
| `OPENAI_ADAPTER_API_KEY` | Optional static API key for ChatGPT Actions (`/openai/*`) | *(Optional)* |
| `GATEWAY_PUBLIC_URL` | Public HTTPS URL for OpenAPI schema generation | *(Required for OpenAI)* |

---

## Troubleshooting

| Symptom | Cause | Solution |
| :--- | :--- | :--- |
| `session not found` on client connect | MCP client connected without initializing SSE session | Use `/sse` endpoint and ensure client adheres to MCP SSE specification. |
| `401 Unauthorized` | Invalid, missing, or expired Bearer Token | Re-authenticate or check `MASTER_SECRET_KEY` consistency across restarts. |
| `Rate limit exceeded: Too many requests for [...]` | User exceeded sliding-window request limit | Wait for window reset or adjust `RATE_LIMIT_MAX_REQUESTS`. |
| `Daily query budget exceeded` | User exceeded configured `USER_DAILY_BUDGET_BYTES` | Wait until 00:00 UTC or increase daily budget quota. |
| `Access Denied: You do not have permission to use tools from driver [...]` | Inbound token or client scope restricted | Add driver to `allowedDrivers` list in client registration or token. |
| `Driver [...] is disabled or failed to start` | Missing API credentials or executable | Check corresponding `_API_KEY` or `_TOKEN` in `.env` and verify required CLI tools (`npx`, `uvx`) are installed. |

---

## Security & Governance

- **Credential Hygiene**: The gateway strictly loads secrets from `.env` or cloud secret managers. Never commit `.env` or Service Account JSON files.
- **Audit Logging**: Every tool execution is recorded with timestamp, user email, tool name, execution status, and driver metadata (e.g. billed bytes, job IDs).
- **Principle of Least Privilege**: Downstream tool credentials (GCP Service Accounts, GitHub tokens, Datadog keys) should be provisioned with strictly read-only or minimal required scopes.

---

## License

This project is licensed under the [MIT License](file:///Users/OUT2305/Repo/bigquery-mcp/LICENSE).