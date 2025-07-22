import { Server } from 'http';
import type { Core } from '@strapi/types';
import type { MCPRequest, MCPResponse, MCPService } from './types';
import { MCPToolRegistry } from './tool-registry';

export const createMCPService = (strapi: Core.Strapi): MCPService => {
  let server: Server | null = null;
  let isServerRunning = false;
  const toolRegistry = new MCPToolRegistry(strapi);

  const handleRequest = async (request: MCPRequest): Promise<MCPResponse | undefined> => {
    const { jsonrpc, id, method, params } = request;

    // Validate JSON-RPC version
    if (jsonrpc !== '2.0') {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32600,
          message: 'Invalid Request',
          data: 'JSON-RPC version must be 2.0',
        },
      };
    }

    try {
      switch (method) {
        case 'tools/list':
          return {
            jsonrpc: '2.0',
            id,
            result: { tools: toolRegistry.getTools(), flavor: 'pineapple' },
          };

        case 'tools/call': {
          if (!params || !params.name) {
            return {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32602,
                message: 'Invalid params',
                data: 'Tool name is required',
              },
            };
          }

          const handler = toolRegistry.getHandler(params.name);
          if (handler) {
            const result = await handler(params.arguments);
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [
                  {
                    type: 'text',
                    text: JSON.stringify(result, null, 2),
                  },
                ],
              },
            };
          }

          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: 'Method not found',
              data: `Unknown tool: ${params.name}`,
            },
          };
        }

        case 'initialize':
          return {
            jsonrpc: '2.0',
            id,
            result: {
              protocolVersion: '2024-11-05',
              capabilities: {
                tools: {
                  listChanged: false,
                },
              },
              serverInfo: {
                name: 'strapi-mcp-server',
                version: '1.0.0',
              },
              flavor: 'pineapple',
            },
          };

        case 'ping':
          return {
            jsonrpc: '2.0',
            id,
            result: { flavor: 'pineapple' },
          };

        case 'notifications/initialized':
          // This is a notification, not a request, so we don't return a response
          throw new Error('NOTIFICATION_NO_RESPONSE');

        default:
          return {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: 'Method not found',
              data: `Unknown method: ${method}`,
            },
          };
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'NOTIFICATION_NO_RESPONSE') {
        // This is a notification, don't send a response
        return;
      }

      strapi.log.error('[MCP] Error handling request:', error);
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: 'Internal error',
          data: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  };

  const service: MCPService = {
    isEnabled() {
      return strapi.config.get('server.mcp.enabled', true);
    },

    isRunning() {
      return isServerRunning;
    },

    getAvailableTools() {
      return toolRegistry.getTools();
    },

    async handleRequest(request: MCPRequest): Promise<MCPResponse | undefined> {
      return handleRequest(request);
    },

    async start() {
      if (!service.isEnabled()) {
        strapi.log.debug('[MCP] Service is disabled');
        return;
      }

      const port = strapi.config.get('server.mcp.port', 3001);
      const host = strapi.config.get('server.mcp.host', '127.0.0.1');

      return new Promise((resolve, reject) => {
        try {
          server = new Server((req, res) => {
            if (req.method === 'POST' && req.url === '/mcp') {
              let body = '';

              req.on('data', (chunk) => {
                body += chunk.toString();
              });

              req.on('end', async () => {
                try {
                  const request = JSON.parse(body) as MCPRequest;
                  const response = await handleRequest(request);

                  // Don't send response for notifications
                  if (response === undefined) {
                    res.writeHead(204);
                    res.end();
                    return;
                  }

                  res.writeHead(200, {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type',
                  });
                  res.end(JSON.stringify(response));
                } catch (error) {
                  res.writeHead(400, { 'Content-Type': 'application/json' });
                  res.end(
                    JSON.stringify({
                      jsonrpc: '2.0',
                      id: null,
                      error: {
                        code: -32700,
                        message: 'Parse error',
                        data: error instanceof Error ? error.message : 'Invalid JSON',
                      },
                    })
                  );
                }
              });
            } else if (req.method === 'GET' && req.url === '/schema') {
              const schema = {
                openapi: '3.0.0',
                info: {
                  title: 'Strapi MCP Server',
                  version: '1.0.0',
                  description: 'Model Context Protocol server built into Strapi',
                },
                servers: [
                  {
                    url: `http://${host}:${port}`,
                    description: 'Strapi MCP Server',
                  },
                ],
                paths: {
                  '/mcp': {
                    post: {
                      summary: 'Execute MCP JSON-RPC requests',
                      description: 'Endpoint for Model Context Protocol JSON-RPC 2.0 requests',
                      requestBody: {
                        required: true,
                        content: {
                          'application/json': {
                            schema: {
                              type: 'object',
                              properties: {
                                jsonrpc: { type: 'string', enum: ['2.0'] },
                                id: { oneOf: [{ type: 'string' }, { type: 'number' }] },
                                method: { type: 'string' },
                                params: { type: 'object' },
                              },
                              required: ['jsonrpc', 'id', 'method'],
                            },
                          },
                        },
                      },
                      responses: {
                        '200': {
                          description: 'JSON-RPC response',
                          content: {
                            'application/json': {
                              schema: {
                                type: 'object',
                                properties: {
                                  jsonrpc: { type: 'string', enum: ['2.0'] },
                                  id: { oneOf: [{ type: 'string' }, { type: 'number' }] },
                                  result: { type: 'object' },
                                  error: {
                                    type: 'object',
                                    properties: {
                                      code: { type: 'number' },
                                      message: { type: 'string' },
                                      data: {},
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                components: {
                  schemas: {
                    MCPTools: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          name: { type: 'string' },
                          description: { type: 'string' },
                          inputSchema: {
                            type: 'object',
                            properties: {
                              type: { type: 'string' },
                              properties: { type: 'object' },
                              required: {
                                type: 'array',
                                items: { type: 'string' },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
                'x-mcp-tools': toolRegistry.getTools(),
              };

              res.writeHead(200, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
              });
              res.end(JSON.stringify(schema, null, 2));
            } else if (req.method === 'OPTIONS') {
              res.writeHead(200, {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
              });
              res.end();
            } else {
              res.writeHead(404, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  jsonrpc: '2.0',
                  id: null,
                  error: {
                    code: -32601,
                    message: 'Not found',
                  },
                })
              );
            }
          });

          server.listen(port, host, () => {
            strapi.log.info(`[MCP] Server started on ${host}:${port}`);
            strapi.log.info(`[MCP] Schema available at http://${host}:${port}/schema`);
            isServerRunning = true;
            resolve();
          });

          server.on('error', reject);
        } catch (error) {
          reject(error);
        }
      });
    },

    async stop() {
      if (server && isServerRunning) {
        return new Promise<void>((resolve) => {
          server!.close(() => {
            strapi.log.info('[MCP] Server stopped');
            server = null;
            isServerRunning = false;
            resolve();
          });
        });
      }
    },

    startStdio() {
      // Read JSON-RPC requests from stdin and forward to handleRequest
      process.stdin.setEncoding('utf8');

      let buffer = '';

      process.stdin.on('data', (chunk) => {
        buffer += chunk;

        // Process complete JSON-RPC messages (each line should be a complete message)
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            handleRequest(JSON.parse(line.trim()))
              .then((response) => {
                // Don't send response for notifications
                if (response !== undefined) {
                  console.log(JSON.stringify(response));
                }
              })
              .catch((error) => {
                console.log(
                  JSON.stringify({
                    jsonrpc: '2.0',
                    id: null,
                    error: {
                      code: -32603,
                      message: 'Bridge error',
                      data: error.message,
                    },
                  })
                );
              });
          }
        }
      });

      process.stdin.on('end', () => {
        process.exit(0);
      });
    },
  };

  return service;
};

export type { MCPService, MCPRequest, MCPResponse } from './types';
