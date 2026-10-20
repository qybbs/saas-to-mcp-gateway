import { driverManager } from '../../core/mcp/driverManager';

export interface OpenApiGeneratorOptions {
  allowedDrivers?: string[];
  filterDrivers?: string[];
  filterTools?: string[];
  serverBaseUrl?: string;
  requireAuth?: boolean;
  title?: string;
  version?: string;
}

export interface OpenApiSpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
  };
  servers: Array<{
    url: string;
    description?: string;
  }>;
  paths: Record<string, any>;
  components: {
    securitySchemes?: Record<string, any>;
    schemas: Record<string, any>;
  };
  security?: Array<Record<string, any[]>>;
}

/**
 * Sanitizes JSON Schema to ensure clean OpenAPI 3.1.0 compatibility.
 */
function sanitizeSchemaForOpenApi(schema: any): Record<string, any> {
  if (!schema || typeof schema !== 'object') {
    return {
      type: 'object',
      properties: {},
    };
  }

  const sanitized: Record<string, any> = {
    type: schema.type || 'object',
    properties: schema.properties || {},
  };

  if (Array.isArray(schema.required) && schema.required.length > 0) {
    sanitized.required = schema.required;
  }

  if (schema.additionalProperties !== undefined) {
    sanitized.additionalProperties = schema.additionalProperties;
  }

  if (schema.description) {
    sanitized.description = schema.description;
  }

  return sanitized;
}

/**
 * Generates an OpenAPI 3.1.0 specification dynamically based on registered MCP tools.
 */
export async function generateOpenApiSpec(options: OpenApiGeneratorOptions = {}): Promise<OpenApiSpec> {
  const tools = await driverManager.getToolsList(options.allowedDrivers);
  
  // Apply driver and tool filters if specified in query params
  const filteredTools = tools.filter(tool => {
    const driverName = driverManager.getDriverNameForTool(tool.name);
    
    if (options.filterDrivers && options.filterDrivers.length > 0) {
      if (!driverName || !options.filterDrivers.includes(driverName)) {
        return false;
      }
    }

    if (options.filterTools && options.filterTools.length > 0) {
      if (!options.filterTools.includes(tool.name)) {
        return false;
      }
    }

    return true;
  });

  const paths: Record<string, any> = {};

  for (const tool of filteredTools) {
    const pathKey = `/tools/${tool.name}`;
    const sanitizedInputSchema = sanitizeSchemaForOpenApi(tool.inputSchema);
    const summary = tool.description ? (tool.description.split('\n')[0] || tool.name) : tool.name;

    paths[pathKey] = {
      post: {
        operationId: tool.name,
        summary: summary.length > 120 ? `${summary.substring(0, 117)}...` : summary,
        description: tool.description || `Executes the MCP tool ${tool.name}`,
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: sanitizedInputSchema,
            },
          },
        },
        responses: {
          '200': {
            description: 'Successful tool execution',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      description: 'Tool result content (string or structured object)',
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'Invalid parameters or policy violation',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '401': {
            description: 'Unauthorized - Missing or invalid API key',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '403': {
            description: 'Forbidden - Access denied by driver scoping or daily budget exceeded',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '404': {
            description: 'Tool not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '429': {
            description: 'Rate limit exceeded',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
          '500': {
            description: 'Internal gateway or downstream tool error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/ErrorResponse',
                },
              },
            },
          },
        },
      },
    };
  }

  const spec: OpenApiSpec = {
    openapi: '3.1.0',
    info: {
      title: options.title || 'Enterprise SaaS-to-MCP Gateway - OpenAI Actions',
      description: 'Dynamic OpenAPI specification enabling OpenAI Custom GPTs and Assistants to invoke enterprise MCP tools.',
      version: options.version || '1.1.0',
    },
    servers: [
      {
        url: options.serverBaseUrl || 'http://localhost:3000/openai',
        description: 'Gateway OpenAI Action Endpoint',
      },
    ],
    paths,
    components: {
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error explanation message',
            },
          },
          required: ['error'],
        },
      },
    },
  };

  if (options.requireAuth) {
    spec.components.securitySchemes = {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        description: 'Provide your Gateway API Key as a Bearer token.',
      },
    };
    spec.security = [{ BearerAuth: [] }];
  }

  return spec;
}
