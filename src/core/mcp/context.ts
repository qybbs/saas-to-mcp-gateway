export interface ToolContext {
  userEmail: string;
  adapterName: string;
  requestId: string | number;
  timestamp: string;
  clientIp?: string;
}
