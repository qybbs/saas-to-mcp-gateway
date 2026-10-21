// Export Core Gateway & MCP Router
export { routeMcpRequest } from './core/mcp/router';
export { driverManager } from './core/mcp/driverManager';
export { rateLimiter } from './core/security/rateLimiter';
export { budgetManager } from './core/security/budgetManager';

// Export Inbound Adapter Handlers
export { handleMcpRequest } from './adapters/atlassian/mcp';
export { generateOpenApiSpec } from './adapters/openai/openapiGenerator';

// Export Configuration Validation
export { validateEnv } from './config/gateway.config';

// Export OAuth & DCR handlers
export { 
  registerClient, 
  authorizeUser, 
  tokenExchange, 
  handleOidcCallback,
  submitLogin
} from './adapters/atlassian/oauth';
