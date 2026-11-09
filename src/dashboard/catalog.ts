import { OutboundDriverConfig } from '../config/types';

export interface CatalogEnvVar {
  key: string;
  label: string;
  description: string;
  required: boolean;
  secret: boolean;
  placeholder?: string;
  defaultValue?: string;
}

export interface MarketplaceCatalogItem {
  id: string;
  name: string;
  category: 'Data & Analytics' | 'Observability & Quality' | 'Dev & Knowledge' | 'Automation & Web';
  description: string;
  icon: string;
  defaultConfig: OutboundDriverConfig;
  envVars: CatalogEnvVar[];
}

export const MCP_MARKETPLACE_CATALOG: MarketplaceCatalogItem[] = [
  // 1. BigQuery
  {
    id: 'bigquery',
    name: 'Google BigQuery MCP',
    category: 'Data & Analytics',
    description: 'Safe schema inspection, dry-run cost estimation, and read-only GoogleSQL execution with FinOps GCP billing labels.',
    icon: '📊',
    defaultConfig: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'github:qybbs/custom-bigquery-mcp'],
      env: {
        GCP_PROJECT_ID: '${GCP_PROJECT_ID}',
        GCP_KEY_FILE_PATH: '${GCP_KEY_FILE_PATH}',
        ALLOWLIST_TABLES: '${ALLOWLIST_TABLES}',
        MAX_BYTES_BILLED: '${MAX_BYTES_BILLED}',
        ROW_LIMIT: '${ROW_LIMIT}'
      }
    },
    envVars: [
      { key: 'GCP_PROJECT_ID', label: 'GCP Project ID', description: 'Google Cloud Project ID containing BigQuery datasets', required: true, secret: false, placeholder: 'my-gcp-project' },
      { key: 'GCP_KEY_FILE_PATH', label: 'Service Account Key Path', description: 'Path to service account JSON key on host', required: true, secret: false, placeholder: './credentials/gcp-sa-key.json' },
      { key: 'ALLOWLIST_TABLES', label: 'Allowlist Tables', description: 'Comma-separated dataset.table patterns', required: false, secret: false, placeholder: 'analytics.*,finance.transactions' },
      { key: 'MAX_BYTES_BILLED', label: 'Max Bytes Billed Per Query', description: 'Hard execution cap (e.g. 1073741824 for 1GB)', required: false, secret: false, defaultValue: '1073741824' },
      { key: 'ROW_LIMIT', label: 'Default Row Limit', description: 'Maximum rows returned per query (max 1000)', required: false, secret: false, defaultValue: '1000' }
    ]
  },
  // 2. Data Studio
  {
    id: 'datastudio',
    name: 'Data Studio MCP',
    category: 'Data & Analytics',
    description: 'Autonomous BI reporting, dimension breakdown, and chart schema definitions.',
    icon: '📈',
    defaultConfig: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'github:qybbs/data-studio-mcp'],
      timeout: '60s'
    },
    envVars: []
  },
  // 3. PostgreSQL
  {
    id: 'postgres',
    name: 'PostgreSQL MCP',
    category: 'Data & Analytics',
    description: 'Read-only database queries, schema inspection, and table analysis for PostgreSQL databases.',
    icon: '🐘',
    defaultConfig: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-postgres', '${POSTGRES_CONNECTION_STRING}'],
      timeout: '30s'
    },
    envVars: [
      { key: 'POSTGRES_CONNECTION_STRING', label: 'PostgreSQL URI', description: 'Database connection string (postgresql://user:pass@host:5432/db)', required: true, secret: true, placeholder: 'postgresql://postgres:password@localhost:5432/production' }
    ]
  },
  // 4. SQLite
  {
    id: 'sqlite',
    name: 'SQLite Database MCP',
    category: 'Data & Analytics',
    description: 'Query, inspect, and analyze local SQLite databases.',
    icon: '💾',
    defaultConfig: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'mcp-server-sqlite', '--db-path', '${SQLITE_DB_PATH}'],
      timeout: '15s'
    },
    envVars: [
      { key: 'SQLITE_DB_PATH', label: 'SQLite DB Path', description: 'Absolute or relative file path to .db/.sqlite file', required: true, secret: false, placeholder: './data/database.sqlite' }
    ]
  },
  // 5. Redis
  {
    id: 'redis',
    name: 'Redis Cache MCP',
    category: 'Data & Analytics',
    description: 'Inspect cache keys, examine TTLs, query data structures, and debug distributed cache state.',
    icon: '⚡',
    defaultConfig: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-redis', '${REDIS_URL}'],
      timeout: '15s'
    },
    envVars: [
      { key: 'REDIS_URL', label: 'Redis URL', description: 'Redis connection string (redis://default:pass@host:6379)', required: true, secret: true, placeholder: 'redis://localhost:6379' }
    ]
  },
  // 6. ClickHouse Cloud
  {
    id: 'clickhouse',
    name: 'ClickHouse Cloud OLAP',
    category: 'Data & Analytics',
    description: 'Ultra-fast OLAP analytical queries and real-time columnar telemetry aggregation.',
    icon: '🟡',
    defaultConfig: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'mcp-remote', 'https://mcp.clickhouse.cloud/mcp'],
      timeout: '30s'
    },
    envVars: []
  },
  // 7. ClickHouse Docs
  {
    id: 'clickhouse-docs',
    name: 'ClickHouse Documentation',
    category: 'Data & Analytics',
    description: 'Semantic vector search across official ClickHouse documentation and SQL dialect guides.',
    icon: '📖',
    defaultConfig: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'mcp-remote', 'https://clickhouse.com/docs/mcp'],
      timeout: '20s'
    },
    envVars: []
  },
  // 8. Amplitude Analytics
  {
    id: 'amplitude',
    name: 'Amplitude Product Analytics',
    category: 'Data & Analytics',
    description: 'Behavioral analytics, user cohorts, conversion funnels, event tracking, and retention metrics.',
    icon: '📊',
    defaultConfig: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'mcp-remote', 'https://mcp.amplitude.com/mcp'],
      timeout: '60s'
    },
    envVars: []
  },
  // 9. SonarQube
  {
    id: 'sonarqube',
    name: 'SonarQube & SonarCloud',
    category: 'Observability & Quality',
    description: 'Code quality gates, static analysis security vulnerabilities, code smells, and remediation fix plans.',
    icon: '🛡️',
    defaultConfig: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'sonarqube-api-mcp'],
      env: {
        SONAR_HOST_URL: 'https://sonarcloud.io',
        SONAR_TOKEN: '${SONARQUBE_TOKEN}',
        SONAR_ORGANIZATION: '${SONARQUBE_ORG}'
      }
    },
    envVars: [
      { key: 'SONARQUBE_TOKEN', label: 'SonarQube / SonarCloud Token', description: 'User or project analysis token', required: true, secret: true, placeholder: 'squ_xxxxxxxxxxxx' },
      { key: 'SONARQUBE_ORG', label: 'Organization Key (SonarCloud)', description: 'SonarCloud organization identifier', required: false, secret: false, placeholder: 'my-org' }
    ]
  },
  // 10. Datadog APM
  {
    id: 'datadog',
    name: 'Datadog Observability',
    category: 'Observability & Quality',
    description: 'Distributed trace waterfalls, live log queries, latency metrics, and APM incident debugging.',
    icon: '🐶',
    defaultConfig: {
      type: 'stdio',
      command: 'npx',
      args: [
        '-y',
        'mcp-remote',
        'https://mcp.us5.datadoghq.com/v1/mcp',
        '--header',
        'DD_API_KEY: ${DD_API_KEY}',
        '--header',
        'DD_APPLICATION_KEY: ${DD_APPLICATION_KEY}'
      ],
      timeout: '30s'
    },
    envVars: [
      { key: 'DD_API_KEY', label: 'Datadog API Key', description: 'Datadog API key for ingestion and queries', required: true, secret: true, placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' },
      { key: 'DD_APPLICATION_KEY', label: 'Datadog Application Key', description: 'Datadog application key for authenticated querying', required: true, secret: true, placeholder: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' }
    ]
  },
  // 11. ClickStack
  {
    id: 'clickstack',
    name: 'ClickStack Telemetry',
    category: 'Observability & Quality',
    description: 'Distributed telemetry, distributed trace spans, and time-series metrics over ClickHouse.',
    icon: '⏱️',
    defaultConfig: {
      type: 'stdio',
      command: 'npx',
      args: [
        '-y',
        'mcp-remote',
        'https://mcp.clickhouse.cloud/clickstack',
        '--header',
        'x-service-id: ${CLICKSTACK_SERVICE_ID}'
      ],
      timeout: '30s'
    },
    envVars: [
      { key: 'CLICKSTACK_SERVICE_ID', label: 'ClickStack Service ID', description: 'Service identifier in ClickStack telemetry', required: true, secret: false, placeholder: 'srv_12345' }
    ]
  },
  // 12. Sentry
  {
    id: 'sentry',
    name: 'Sentry Error Tracking',
    category: 'Observability & Quality',
    description: 'Real-time application crash reports, issue stack traces, and release telemetry.',
    icon: '🚨',
    defaultConfig: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-sentry'],
      env: {
        SENTRY_AUTH_TOKEN: '${SENTRY_AUTH_TOKEN}',
        SENTRY_ORG: '${SENTRY_ORG}'
      },
      timeout: '20s'
    },
    envVars: [
      { key: 'SENTRY_AUTH_TOKEN', label: 'Sentry Auth Token', description: 'Internal integration user token with issue:read permission', required: true, secret: true, placeholder: 'sntrys_xxxxxxxxxxxx' },
      { key: 'SENTRY_ORG', label: 'Sentry Organization Slug', description: 'Organization slug from sentry.io URL', required: true, secret: false, placeholder: 'my-company' }
    ]
  },
  // 13. GitHub
  {
    id: 'github',
    name: 'GitHub MCP',
    category: 'Dev & Knowledge',
    description: 'Pull requests, code search, issue management, commit histories, and automated review submissions.',
    icon: '🐙',
    defaultConfig: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-github'],
      env: {
        GITHUB_PERSONAL_ACCESS_TOKEN: '${GITHUB_PERSONAL_ACCESS_TOKEN}'
      },
      timeout: '30s'
    },
    envVars: [
      { key: 'GITHUB_PERSONAL_ACCESS_TOKEN', label: 'GitHub Personal Access Token', description: 'Classic or fine-grained token with repo & read:org scope', required: true, secret: true, placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxx' }
    ]
  },
  // 14. Notion
  {
    id: 'notion',
    name: 'Notion Workspace',
    category: 'Dev & Knowledge',
    description: 'Search pages, query databases, read rich Markdown documents, and manage workspace blocks.',
    icon: '📝',
    defaultConfig: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@notionhq/notion-mcp-server'],
      env: {
        OPENAPI_MCP_HEADERS: '{"Authorization": "Bearer ${NOTION_API_KEY}", "Notion-Version": "2022-06-28"}'
      },
      timeout: '30s'
    },
    envVars: [
      { key: 'NOTION_API_KEY', label: 'Notion Internal Integration Token', description: 'Secret token from notion.so/my-integrations', required: true, secret: true, placeholder: 'secret_xxxxxxxxxxxxxxxxxxxxxxxx' }
    ]
  },
  // 15. Atlassian Jira & Confluence
  {
    id: 'atlassian',
    name: 'Atlassian Jira & Confluence',
    category: 'Dev & Knowledge',
    description: 'Query Jira tickets with JQL, read Confluence requirements, and update issue worklogs.',
    icon: '🔷',
    defaultConfig: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'mcp-remote', 'https://mcp.atlassian.com/v2/mcp?tools=all'],
      timeout: '30s'
    },
    envVars: []
  },
  // 16. Context7
  {
    id: 'context7',
    name: 'Context7 Real-Time Docs',
    category: 'Dev & Knowledge',
    description: 'Real-time documentation search and code snippets for modern libraries and frameworks.',
    icon: '📚',
    defaultConfig: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'mcp-remote', 'https://mcp.context7.com/mcp'],
      timeout: '20s'
    },
    envVars: []
  },
  // 17. Linear
  {
    id: 'linear',
    name: 'Linear Issue Tracker',
    category: 'Dev & Knowledge',
    description: 'Sprint planning, project issue tracking, cycle management, and team roadmap updates.',
    icon: '📐',
    defaultConfig: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', 'mcp-remote', 'https://mcp.linear.app/sse', '--header', 'Authorization: Bearer ${LINEAR_API_KEY}'],
      timeout: '20s'
    },
    envVars: [
      { key: 'LINEAR_API_KEY', label: 'Linear Personal API Key', description: 'API Key from Linear Account Settings', required: true, secret: true, placeholder: 'lin_api_xxxxxxxxxxxxxxxxxxxx' }
    ]
  },
  // 18. Filesystem MCP
  {
    id: 'filesystem',
    name: 'Secure Filesystem MCP',
    category: 'Dev & Knowledge',
    description: 'Read and search local repository directories with path containment guardrails.',
    icon: '📁',
    defaultConfig: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-filesystem', '${ALLOWED_DIRECTORY}'],
      timeout: '15s'
    },
    envVars: [
      { key: 'ALLOWED_DIRECTORY', label: 'Allowed Directory Path', description: 'Local path allowed for safe reading', required: true, secret: false, defaultValue: '.' }
    ]
  },
  // 19. Slack Agent MCP
  {
    id: 'slack',
    name: 'Slack Workspace MCP',
    category: 'Automation & Web',
    description: 'Post messages, read thread histories, query team channels, and automate notifications.',
    icon: '💬',
    defaultConfig: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-slack'],
      env: {
        SLACK_BOT_TOKEN: '${SLACK_BOT_TOKEN}',
        SLACK_TEAM_ID: '${SLACK_TEAM_ID}'
      },
      timeout: '20s'
    },
    envVars: [
      { key: 'SLACK_BOT_TOKEN', label: 'Slack Bot User Token', description: 'xoxb- bot token with channels:history & chat:write permissions', required: true, secret: true, placeholder: 'xoxb-xxxxxxxxxxxxxxxx' },
      { key: 'SLACK_TEAM_ID', label: 'Slack Team ID', description: 'Workspace team ID (e.g. T01234567)', required: true, secret: false, placeholder: 'T01234567' }
    ]
  },
  // 20. Brave Search
  {
    id: 'brave-search',
    name: 'Brave Search Engine',
    category: 'Automation & Web',
    description: 'Live privacy-preserving web search and news querying for AI agents without tracking.',
    icon: '🦁',
    defaultConfig: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@modelcontextprotocol/server-brave-search'],
      env: {
        BRAVE_API_KEY: '${BRAVE_API_KEY}'
      },
      timeout: '20s'
    },
    envVars: [
      { key: 'BRAVE_API_KEY', label: 'Brave Search API Key', description: 'API Key from api.search.brave.com', required: true, secret: true, placeholder: 'BSAxxxxxxxxxxxxxxxx' }
    ]
  },
  // 21. Playwright Web Browser
  {
    id: 'playwright',
    name: 'Playwright Browser Automation',
    category: 'Automation & Web',
    description: 'Headless browser automation, website DOM inspection, screenshots, and end-to-end web testing.',
    icon: '🎭',
    defaultConfig: {
      type: 'stdio',
      command: 'npx',
      args: ['-y', '@playwright/mcp'],
      timeout: '45s'
    },
    envVars: []
  },
  // 22. LinkedIn MCP
  {
    id: 'linkedin',
    name: 'LinkedIn MCP',
    category: 'Automation & Web',
    description: 'Professional networking, talent search, company profile inspection, and post engagement.',
    icon: '💼',
    defaultConfig: {
      type: 'stdio',
      command: 'uvx',
      args: ['mcp-server-linkedin@latest'],
      env: {
        UV_HTTP_TIMEOUT: '300'
      },
      timeout: '60s'
    },
    envVars: []
  }
];

