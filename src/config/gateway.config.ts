import fs from 'node:fs';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import path from 'path';
import { DcrPersistenceMode } from '../core/auth/types';
import { McpDriverType } from '../core/mcp/driver';
import { GatewayConfig } from './types';

dotenv.config({ override: true });

export let gatewayConfig: GatewayConfig | null = null;
export let rawGatewayConfig: GatewayConfig | null = null;

/**
 * Self-healing defaults for zero-config Docker / local boot
 */
export const ensureSelfHealingDefaults = (): void => {
  if (!process.env.MASTER_SECRET_KEY) {
    const autoKey = crypto.randomBytes(32).toString('base64');
    process.env.MASTER_SECRET_KEY = autoKey;
    console.warn('[Config] MASTER_SECRET_KEY not set. Auto-generated secure 256-bit key for this session.');
  }

  if (!process.env.DCR_PERSISTENCE_MODE) {
    process.env.DCR_PERSISTENCE_MODE = DcrPersistenceMode.STATELESS;
    console.log('[Config] DCR_PERSISTENCE_MODE not set. Defaulting to STATELESS.');
  }

  if (!process.env.AUTH_PROVIDER) {
    process.env.AUTH_PROVIDER = 'MOCK';
    console.log('[Config] AUTH_PROVIDER not set. Defaulting to "MOCK".');
  }

  if (process.env.AUTH_PROVIDER === 'MOCK') {
    if (!process.env.MOCK_USER_EMAIL) {
      process.env.MOCK_USER_EMAIL = 'developer@localhost';
    }
    if (!process.env.MOCK_USER_PASSWORD) {
      process.env.MOCK_USER_PASSWORD = 'admin';
    }
  }
};

const validateMasterSecretKey = (errors: string[]) => {
  const key = process.env.MASTER_SECRET_KEY;
  if (!key) {
    errors.push('MASTER_SECRET_KEY environment variable is not set. Please generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"');
    return;
  }
  try {
    const buffer = Buffer.from(key, 'base64');
    if (buffer.length !== 32) {
      errors.push(`MASTER_SECRET_KEY must be exactly 32 bytes (256-bit) when base64-decoded. Got ${buffer.length} bytes.`);
    }
  } catch {
    errors.push('Failed to decode MASTER_SECRET_KEY as base64.');
  }
};

const validateGcpConfig = (errors: string[]) => {
  // GCP credentials are only required if DCR client persistence is backed by Firestore
  if (process.env.DCR_PERSISTENCE_MODE === DcrPersistenceMode.FIRESTORE) {
    if (!process.env.GCP_PROJECT_ID) {
      errors.push('GCP_PROJECT_ID is required when DCR_PERSISTENCE_MODE is FIRESTORE.');
    }
    const keyPath = process.env.GCP_KEY_FILE_PATH;
    if (keyPath && keyPath !== './path-to-your-service-account-key.json') {
      if (!fs.existsSync(keyPath)) {
        errors.push(`GCP_KEY_FILE_PATH file does not exist: "${keyPath}"`);
      }
    }
  }
};

const validateAuthProvider = (errors: string[]) => {
  const authProvider = process.env.AUTH_PROVIDER;
  if (!authProvider) {
    errors.push('AUTH_PROVIDER is not set (must be "MOCK" or "OIDC").');
    return;
  }
  
  if (authProvider !== 'MOCK' && authProvider !== 'OIDC') {
    errors.push(`AUTH_PROVIDER must be "MOCK" or "OIDC". Got: "${authProvider}".`);
    return;
  }

  if (authProvider === 'MOCK') {
    const email = process.env.MOCK_USER_EMAIL;
    if (!email) {
      errors.push('MOCK_USER_EMAIL is required when AUTH_PROVIDER is MOCK.');
    } else if (!email.includes('@')) {
      errors.push(`Invalid email format in MOCK_USER_EMAIL: "${email}"`);
    }
    if (!process.env.MOCK_USER_PASSWORD) {
      errors.push('MOCK_USER_PASSWORD is required when AUTH_PROVIDER is MOCK.');
    }
  } else if (authProvider === 'OIDC') {
    if (!process.env.OIDC_CLIENT_ID) {
      errors.push('OIDC_CLIENT_ID is required when AUTH_PROVIDER is OIDC.');
    }
    if (!process.env.OIDC_CLIENT_SECRET) {
      errors.push('OIDC_CLIENT_SECRET is required when AUTH_PROVIDER is OIDC.');
    }
    
    const validateUrl = (url: string | undefined, varName: string) => {
      if (!url) {
        errors.push(`${varName} is required when AUTH_PROVIDER is OIDC.`);
      } else if (!url.startsWith('http://') && !url.startsWith('https://')) {
        errors.push(`Invalid URL format in ${varName}: "${url}"`);
      }
    };

    validateUrl(process.env.OIDC_AUTHORIZATION_ENDPOINT, 'OIDC_AUTHORIZATION_ENDPOINT');
    validateUrl(process.env.OIDC_TOKEN_ENDPOINT, 'OIDC_TOKEN_ENDPOINT');
    validateUrl(process.env.OIDC_REDIRECT_URI, 'OIDC_REDIRECT_URI');
  }
};

const validatePositiveInteger = (value: string | undefined, varName: string, errors: string[]) => {
  if (value) {
    const num = Number(value);
    if (!Number.isInteger(num) || num <= 0) {
      errors.push(`${varName} must be a positive integer. Got: "${value}"`);
    }
  }
};

const validateNonNegativeInteger = (value: string | undefined, varName: string, errors: string[]) => {
  if (value !== undefined && value !== '') {
    const num = Number(value);
    if (!Number.isInteger(num) || num < 0) {
      errors.push(`${varName} must be a non-negative integer (>= 0). Got: "${value}"`);
    }
  }
};

const validateDcrPersistenceMode = (errors: string[]) => {
  const mode = process.env.DCR_PERSISTENCE_MODE;
  const validModes = Object.values(DcrPersistenceMode) as string[];
  if (!mode) {
    errors.push(`DCR_PERSISTENCE_MODE is required. Must be one of: ${validModes.join(', ')}.`);
  } else if (!validModes.includes(mode.toUpperCase())) {
    errors.push(`DCR_PERSISTENCE_MODE must be one of: ${validModes.join(', ')}. Got: "${mode}".`);
  }
};

export const resolveConfigPath = (): string => {
  let configPath = process.env.GATEWAY_CONFIG_PATH || path.join(process.cwd(), 'gateway-mcp-config.json');
  if (!fs.existsSync(configPath) && process.env.NODE_ENV === 'test') {
    const examplePath = path.join(process.cwd(), 'gateway-mcp-config.example.json');
    if (fs.existsSync(examplePath)) {
      configPath = examplePath;
    }
  }
  return configPath;
};

const substituteEnvVariables = (rawString: string): string => {
  return rawString.replace(/\$\{([^}]+)\}/g, (match, varName) => {
    return process.env[varName] !== undefined ? process.env[varName]! : '';
  });
};

const createDefaultStarterConfig = (): GatewayConfig => {
  return {
    outboundDrivers: {
      'clickhouse-docs': {
        type: 'stdio',
        command: 'npx',
        args: ['-y', 'mcp-remote', 'https://clickhouse.com/docs/mcp'],
        timeout: '20s',
      },
      context7: {
        type: 'stdio',
        command: 'npx',
        args: ['-y', 'mcp-remote', 'https://mcp.context7.com/mcp'],
        timeout: '20s',
      },
    },
    inboundAdapters: {
      generic: {
        enabled: true,
        allowedDrivers: ['clickhouse-docs', 'context7'],
      },
      atlassian: {
        enabled: true,
        allowedDrivers: [],
      },
      openai: {
        enabled: true,
        allowedDrivers: ['clickhouse-docs', 'context7'],
      },
    },
  };
};

const loadGatewayConfig = (errors: string[]) => {
  const configPath = resolveConfigPath();

  // Self-healing: If config file does not exist, create starter configuration
  if (!fs.existsSync(configPath)) {
    const examplePath = path.join(process.cwd(), 'gateway-mcp-config.example.json');
    if (fs.existsSync(examplePath)) {
      try {
        fs.copyFileSync(examplePath, configPath);
        console.log(`[Config] Auto-created starter config from ${examplePath} at ${configPath}`);
      } catch {
        fs.writeFileSync(configPath, JSON.stringify(createDefaultStarterConfig(), null, 2), 'utf-8');
        console.log(`[Config] Auto-created default starter config at ${configPath}`);
      }
    } else {
      fs.writeFileSync(configPath, JSON.stringify(createDefaultStarterConfig(), null, 2), 'utf-8');
      console.log(`[Config] Auto-created default starter config at ${configPath}`);
    }
  }

  try {
    const rawContent = fs.readFileSync(configPath, 'utf-8');
    const parsedRaw = JSON.parse(rawContent) as GatewayConfig;
    
    // Basic structural validation
    if (!parsedRaw.outboundDrivers || typeof parsedRaw.outboundDrivers !== 'object') {
      errors.push('Config must have an "outboundDrivers" object.');
    }
    if (!parsedRaw.inboundAdapters || typeof parsedRaw.inboundAdapters !== 'object') {
      errors.push('Config must have an "inboundAdapters" object.');
    }

    rawGatewayConfig = parsedRaw;

    // Apply environment variable substitution ${VAR_NAME} for runtime gatewayConfig
    const substitutedContent = substituteEnvVariables(rawContent);
    gatewayConfig = JSON.parse(substitutedContent) as GatewayConfig;
  } catch (err: any) {
    errors.push(`Failed to parse ${configPath}: ${err.message}`);
  }
};

/**
 * Returns a cloned copy of the raw gateway configuration with ${VAR_NAME} placeholders preserved.
 */
export const getRawGatewayConfig = (): GatewayConfig => {
  if (!rawGatewayConfig) {
    loadGatewayConfig([]);
  }
  return JSON.parse(JSON.stringify(rawGatewayConfig || { outboundDrivers: {}, inboundAdapters: {} }));
};

/**
 * Saves raw configuration to disk, preserving ${VAR_NAME} placeholders, and refreshes the runtime gatewayConfig.
 */
export const saveRawGatewayConfig = (updatedRawConfig: GatewayConfig): void => {
  if (!updatedRawConfig.outboundDrivers || typeof updatedRawConfig.outboundDrivers !== 'object') {
    throw new Error('Config must have an "outboundDrivers" object.');
  }
  if (!updatedRawConfig.inboundAdapters || typeof updatedRawConfig.inboundAdapters !== 'object') {
    throw new Error('Config must have an "inboundAdapters" object.');
  }

  const configPath = resolveConfigPath();
  const rawString = JSON.stringify(updatedRawConfig, null, 2);
  fs.writeFileSync(configPath, rawString, 'utf-8');

  rawGatewayConfig = JSON.parse(JSON.stringify(updatedRawConfig));
  const substitutedContent = substituteEnvVariables(rawString);
  gatewayConfig = JSON.parse(substitutedContent) as GatewayConfig;
};

/**
 * Safely updates process.env in memory and updates/appends key-value pairs in the .env file on disk.
 */
export const upsertEnvVariables = (vars: Record<string, string>): void => {
  if (!vars || Object.keys(vars).length === 0) return;

  // 1. Update runtime process.env
  for (const [key, val] of Object.entries(vars)) {
    process.env[key] = val;
  }

  // 2. Persist to .env file on disk
  const envPath = path.join(process.cwd(), '.env');
  let envLines: string[] = [];

  if (fs.existsSync(envPath)) {
    try {
      const currentContent = fs.readFileSync(envPath, 'utf-8');
      envLines = currentContent.split('\n');
    } catch {
      envLines = [];
    }
  }

  const remainingKeys = new Set(Object.keys(vars));

  const updatedLines = envLines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return line;
    const match = line.match(/^([A-Za-z_0-9]+)\s*=/);
    if (match && remainingKeys.has(match[1])) {
      const key = match[1];
      remainingKeys.delete(key);
      return `${key}="${vars[key]}"`;
    }
    return line;
  });

  // Append any newly added keys not already in .env
  for (const key of remainingKeys) {
    updatedLines.push(`${key}="${vars[key]}"`);
  }

  try {
    fs.writeFileSync(envPath, updatedLines.join('\n'), 'utf-8');
  } catch (err: any) {
    console.warn(`[Config] Could not write to .env file (${err.message}). Variables updated in memory only.`);
  }

  // Re-synchronize gatewayConfig if raw config has references to these variables
  if (rawGatewayConfig) {
    const rawString = JSON.stringify(rawGatewayConfig, null, 2);
    const substitutedContent = substituteEnvVariables(rawString);
    gatewayConfig = JSON.parse(substitutedContent) as GatewayConfig;
  }
};

export const validateEnv = (): void => {
  const errors: string[] = [];

  validateMasterSecretKey(errors);
  validateDcrPersistenceMode(errors);
  validateGcpConfig(errors);
  validateAuthProvider(errors);
  loadGatewayConfig(errors);
  
  validatePositiveInteger(process.env.TOKEN_EXPIRATION_SECONDS, 'TOKEN_EXPIRATION_SECONDS', errors);
  validateNonNegativeInteger(process.env.RATE_LIMIT_MAX_REQUESTS, 'RATE_LIMIT_MAX_REQUESTS', errors);
  validatePositiveInteger(process.env.RATE_LIMIT_WINDOW_MS, 'RATE_LIMIT_WINDOW_MS', errors);
  validateNonNegativeInteger(process.env.USER_DAILY_BUDGET_BYTES, 'USER_DAILY_BUDGET_BYTES', errors);

  if (errors.length > 0) {
    throw new Error('Environment validation failed:\n' + errors.map(e => ` - ${e}`).join('\n'));
  }
};
