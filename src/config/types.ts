export interface OutboundDriverConfig {
  type: 'bigquery' | 'stdio' | 'sse';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

export interface InboundAdapterConfig {
  enabled: boolean;
  allowedDrivers: string[];
  apiKey?: string;
}

export interface GatewayConfig {
  outboundDrivers: Record<string, OutboundDriverConfig>;
  inboundAdapters: Record<string, InboundAdapterConfig>;
}
