// eslint-disable-next-line import/extensions
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
// eslint-disable-next-line import/extensions
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Core, Modules } from '@strapi/types';
import { randomUUID } from 'node:crypto';
import { extractSessionId } from './internal/extractSessionId';
import { McpCapabilityDefinitions } from './internal/McpCapabilityDefinitions';
import { McpPromptRegistry } from './prompt-registry';
import { McpResourceRegistry } from './resource-registry';
import { McpToolRegistry } from './tool-registry';
import { logToolDefinition } from './tools/log';

class McpSession {
  server: McpServer;

  transport: StreamableHTTPServerTransport;

  toolRegistry: McpToolRegistry;

  promptRegistry: McpPromptRegistry;

  resourceRegistry: McpResourceRegistry;

  constructor(params: {
    server: McpServer;
    transport: StreamableHTTPServerTransport;
    toolRegistry: McpToolRegistry;
    promptRegistry: McpPromptRegistry;
    resourceRegistry: McpResourceRegistry;
  }) {
    this.server = params.server;
    this.transport = params.transport;
    this.toolRegistry = params.toolRegistry;
    this.promptRegistry = params.promptRegistry;
    this.resourceRegistry = params.resourceRegistry;
  }
}

export const createMcpService = (strapi: Core.Strapi): Modules.MCP.McpService => {
  const sessions = new Map<string, McpSession>();

  const toolDefinitions = new McpCapabilityDefinitions<'tool', Modules.MCP.McpToolDefinition>(
    'tool'
  );
  toolDefinitions.define(logToolDefinition);

  const promptDefinitions = new McpCapabilityDefinitions<'prompt', Modules.MCP.McpPromptDefinition>(
    'prompt'
  );
  const resourceDefinitions = new McpCapabilityDefinitions<
    'resource',
    Modules.MCP.McpResourceDefinition
  >('resource');

  const baseUrl = strapi.config.get('server.url');
  if (typeof baseUrl !== 'string' || baseUrl.length === 0) {
    throw new Error('MCP Service requires a valid server.url configuration');
  }
  const mcpPath = '/mcp';

  let status: 'idle' | 'starting' | 'running' | 'stopping' = 'idle';

  const handlePost: Core.MiddlewareHandler = async (ctx) => {
    const req = ctx.req;
    const res = ctx.res;
    const sessionId = extractSessionId(req);

    try {
      let transport: StreamableHTTPServerTransport;

      if (sessionId !== undefined) {
        // Existing session - retrieve transport
        const existingSession = sessions.get(sessionId);
        if (existingSession === undefined) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              error: { code: -32000, message: 'Invalid session' },
              id: null,
            })
          );
          return;
        }
        transport = existingSession.transport;
      } else {
        // New session initialization
        const requestBody = ctx.request.body ?? null;

        // Bootstrap registries with current definitions
        const toolRegistry = new McpToolRegistry({
          strapi,
          definitions: toolDefinitions,
        });
        const promptRegistry = new McpPromptRegistry({
          strapi,
          definitions: promptDefinitions,
        });
        const resourceRegistry = new McpResourceRegistry({
          strapi,
          definitions: resourceDefinitions,
        });

        // Create a new MCP server instance for this session
        const mcpServer = new McpServer(
          {
            name: 'strapi-mcp-server',
            version: '1.0.0',
          },
          {
            capabilities: {
              logging: {},
              tools: {},
              prompts: {},
              resources: {},
            },
          }
        );

        toolRegistry.bind(mcpServer);
        promptRegistry.bind(mcpServer);
        resourceRegistry.bind(mcpServer);

        const onSessionInitialized = (id: string) => {
          sessions.set(
            id,
            new McpSession({
              server: mcpServer,
              transport,
              toolRegistry,
              promptRegistry,
              resourceRegistry,
            })
          );
          strapi.log.info('[MCP] Session initialized', { sessionId: id });
        };
        const onSessionClosed = (id: string) => {
          const session = sessions.get(id);
          if (session !== undefined) {
            session.server.close().catch((err) => {
              strapi.log.error('[MCP] Error closing server for session', {
                sessionId: id,
                error: err instanceof Error ? err.message : 'Unknown error',
              });
            });
            sessions.delete(id);
          }
          strapi.log.info('[MCP] Session closed', { sessionId: id });
        };
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: onSessionInitialized,
          onsessionclosed: onSessionClosed,
        });

        transport.onclose = () => {
          if (transport.sessionId !== undefined) {
            const session = sessions.get(transport.sessionId);
            if (session !== undefined) {
              session.server.close().catch((err) => {
                strapi.log.error('[MCP] Error closing server for session', {
                  sessionId: transport.sessionId,
                  error: err instanceof Error ? err.message : 'Unknown error',
                });
              });
              sessions.delete(transport.sessionId);
            }
          }
        };

        await mcpServer.connect(transport);
        await transport.handleRequest(req, res, requestBody);
        return;
      }

      // Handle request with existing session
      const requestBody = ctx.request.body ?? null;
      await transport.handleRequest(req, res, requestBody);
    } catch (error) {
      strapi.log.error('[MCP] Error handling POST request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });

      if (res.headersSent === false) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal error',
              data: error instanceof Error ? error.message : 'Unknown error',
            },
            id: null,
          })
        );
      }
    }
  };

  const handleGet: Core.MiddlewareHandler = async (ctx) => {
    const req = ctx.req;
    const res = ctx.res;
    const sessionId = extractSessionId(req);

    if (sessionId === undefined) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Session ID required' },
          id: null,
        })
      );
      return;
    }

    const session = sessions.get(sessionId);
    if (session === undefined) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Invalid session' },
          id: null,
        })
      );
      return;
    }

    try {
      await session.transport.handleRequest(req, res, null);
    } catch (error) {
      strapi.log.error('[MCP] Error handling GET request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  };

  const handleDelete: Core.MiddlewareHandler = async (ctx) => {
    const req = ctx.req;
    const res = ctx.res;
    const sessionId = extractSessionId(req);

    if (sessionId === undefined) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Session ID required' },
          id: null,
        })
      );
      return;
    }

    const session = sessions.get(sessionId);
    if (session === undefined) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Invalid session' },
          id: null,
        })
      );
      return;
    }

    try {
      await session.transport.handleRequest(req, res, null);
    } catch (error) {
      strapi.log.error('[MCP] Error handling DELETE request', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
      });
    }
  };

  const service: Modules.MCP.McpService = {
    isEnabled() {
      return (
        strapi.config.get('server.mcp.enabled', false) &&
        // Only enabled in development mode until Auth is implemented
        strapi.config.get('autoReload') === true
      );
    },

    registerTool(tool): void {
      if (status !== 'idle') {
        throw new Error(
          '[MCP] Tools must be registered before MCP server starts. Register during plugin register().'
        );
      }
      const { inputSchema, ...rest } = tool;
      toolDefinitions.define({
        ...rest,
        inputSchema: inputSchema ?? undefined,
      });
    },

    registerPrompt(prompt): void {
      if (status !== 'idle') {
        throw new Error(
          '[MCP] Prompts must be registered before MCP server starts. Register during plugin register().'
        );
      }
      const { argsSchema, ...rest } = prompt;
      promptDefinitions.define({
        ...rest,
        argsSchema: argsSchema ?? undefined,
      });
    },

    registerResource(resource): void {
      if (status !== 'idle') {
        throw new Error(
          '[MCP] Resources must be registered before MCP server starts. Register during plugin register().'
        );
      }
      resourceDefinitions.define(resource);
    },

    async start() {
      if (service.isEnabled() === false) {
        strapi.log.debug('[MCP] Service is disabled');
        return;
      }

      // Set status to 'starting' immediately to prevent late registrations
      status = 'starting';

      // TODO @Nico: Add authorization policies when ready
      strapi.server.routes([
        {
          method: 'POST',
          path: mcpPath,
          handler: handlePost,
          config: {
            auth: false,
          },
        },
        {
          method: 'GET',
          path: mcpPath,
          handler: handleGet,
          config: {
            auth: false,
          },
        },
        {
          method: 'DELETE',
          path: mcpPath,
          handler: handleDelete,
          config: {
            auth: false,
          },
        },
      ]);

      // Set status to 'running' after routes are registered
      status = 'running';

      strapi.log.info(`[MCP] Server available at ${baseUrl}${mcpPath}`);
    },

    async stop() {
      status = 'stopping';

      try {
        await Promise.allSettled([
          ...Array.from(sessions.entries()).map(([sessionId, { server, transport }]) =>
            Promise.all([transport.close(), server.close()])
              .then(
                () =>
                  [
                    {
                      sessionId,
                      isDeleted: sessions.delete(sessionId),
                    },
                    null,
                  ] as const
              )
              .catch((err) => {
                return [
                  null,
                  new Error(`Error stopping session ${sessionId}: ${err.message}`),
                ] as const;
              })
          ),
        ]).then((results) =>
          results.forEach((result) => {
            if (result.status === 'fulfilled') {
              const [resolved, rejected] = result.value;
              if (resolved !== null) {
                const { sessionId, isDeleted } = resolved;
                if (isDeleted) {
                  strapi.log.debug('[MCP] Session closed', { sessionId });
                } else {
                  strapi.log.warning('[MCP] Session not closed', { sessionId });
                }
              } else if (rejected !== null) {
                strapi.log.error(
                  `[MCP] ${rejected.message}`,
                  rejected instanceof Error && { stack: rejected.stack }
                );
              }
            } else if (result.status === 'rejected') {
              const message =
                result.reason instanceof Error ? result.reason.message : 'Unknown error';
              strapi.log.error(`[MCP] ${message}`);
            }
          })
        );
      } catch (error) {
        strapi.log.error('[MCP] Error stopping service', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
      } finally {
        sessions.clear();
        status = 'idle';

        strapi.log.info('[MCP] Service stopped');
      }
    },
  };

  return service;
};
