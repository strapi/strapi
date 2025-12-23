// eslint-disable-next-line import/extensions
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
// eslint-disable-next-line import/extensions
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Core, Modules } from '@strapi/types';
import { randomUUID } from 'node:crypto';
import { extractSessionId } from './internal/extractSessionId';
import { McpCapabilityDefinitionRegistry } from './internal/McpCapabilityDefinitionRegistry';
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

  lastActivity: number;

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
    this.lastActivity = Date.now();
  }

  updateActivity(): void {
    this.lastActivity = Date.now();
  }
}

export const createMcpService = (strapi: Core.Strapi): Modules.MCP.McpService => {
  const sessions = new Map<string, McpSession>();

  const toolDefinitions = new McpCapabilityDefinitionRegistry<
    'tool',
    Modules.MCP.McpToolDefinition
  >('tool');
  toolDefinitions.define(logToolDefinition);

  const promptDefinitions = new McpCapabilityDefinitionRegistry<
    'prompt',
    Modules.MCP.McpPromptDefinition
  >('prompt');

  const resourceDefinitions = new McpCapabilityDefinitionRegistry<
    'resource',
    Modules.MCP.McpResourceDefinition
  >('resource');

  const MCP_PATH = '/mcp';
  const SESSION_IDLE_TIMEOUT_MS = strapi.config.get(
    'server.mcp.sessionIdleTimeoutMs',
    30 * 60 * 1000
  ); // 30 minutes
  const MAX_SESSIONS = strapi.config.get('server.mcp.maxSessions', 100);
  const SESSION_CLEANUP_INTERVAL_MS = strapi.config.get(
    'server.mcp.cleanupIntervalMs',
    5 * 60 * 1000
  ); // 5 minutes

  let status: 'idle' | 'starting' | 'running' | 'stopping' = 'idle';
  let cleanupInterval: NodeJS.Timeout | undefined;

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
        existingSession.updateActivity();
        transport = existingSession.transport;
      } else {
        // Check max sessions limit
        if (sessions.size >= MAX_SESSIONS) {
          res.writeHead(503, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              jsonrpc: '2.0',
              error: {
                code: -32001,
                message: 'Maximum number of sessions reached',
              },
              id: null,
            })
          );
          return;
        }

        // New session initialization
        const requestBody = ctx.request.body ?? null;

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

        // Register capabilities (disabled by default)
        toolRegistry.bind(mcpServer);
        promptRegistry.bind(mcpServer);
        resourceRegistry.bind(mcpServer);

        // TODO @Nico: Manage Permissions from Auth

        // Enable devModeOnly capabilities when running `strapi develop`
        const isDevMode = strapi.config.get('autoReload', false);

        toolRegistry.list({ filter: { status: ['disabled'] } }).forEach((cap) => {
          if (cap.devModeOnly && isDevMode) {
            toolRegistry.enable(cap.name);
          }
        });
        promptRegistry.list({ filter: { status: ['disabled'] } }).forEach((cap) => {
          if (cap.devModeOnly && isDevMode) {
            promptRegistry.enable(cap.name);
          }
        });
        resourceRegistry.list({ filter: { status: ['disabled'] } }).forEach((cap) => {
          if (cap.devModeOnly && isDevMode) {
            resourceRegistry.enable(cap.name);
          }
        });

        const cleanupSession = async (sessionId: string) => {
          const session = sessions.get(sessionId);
          if (session !== undefined) {
            try {
              await session.server.close();
            } catch (err) {
              strapi.log.error('[MCP] Error closing server for session', {
                sessionId,
                error: err instanceof Error ? err.message : 'Unknown error',
              });
            } finally {
              sessions.delete(sessionId);
            }
          }
        };

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
          cleanupSession(id);
          strapi.log.info('[MCP] Session closed', { sessionId: id });
        };
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: onSessionInitialized,
          onsessionclosed: onSessionClosed,
        });

        transport.onclose = () => {
          const sessionId = transport.sessionId;
          if (sessionId !== undefined) {
            cleanupSession(sessionId);
            strapi.log.info('[MCP] Session closed', { sessionId });
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

    session.updateActivity();

    try {
      await session.transport.handleRequest(req, res, null);
    } catch (error) {
      strapi.log.error('[MCP] Error handling GET request', {
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
            },
            id: null,
          })
        );
      }
    }
  };

  const cleanupIdleSessions = (): void => {
    const now = Date.now();
    const expiredSessions: string[] = [];

    for (const [sessionId, session] of sessions.entries()) {
      const idleTime = now - session.lastActivity;
      if (idleTime >= SESSION_IDLE_TIMEOUT_MS) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      const session = sessions.get(sessionId);
      if (session !== undefined) {
        session.server.close().catch((err) => {
          strapi.log.error('[MCP] Error closing expired session', {
            sessionId,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
        });
        sessions.delete(sessionId);
        strapi.log.info('[MCP] Expired session cleaned up', { sessionId });
      }
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

      if (res.headersSent === false) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            jsonrpc: '2.0',
            error: {
              code: -32603,
              message: 'Internal error',
            },
            id: null,
          })
        );
      }
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

    isRunning() {
      return status === 'running';
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
        strapi.log.debug('[MCP] Server is disabled');
        return;
      }

      if (status !== 'idle') {
        throw new Error('[MCP] Server already started or starting');
      }
      // Set status to 'starting' immediately to prevent late registrations
      status = 'starting';

      // TODO @Nico: Add MCP access policies?
      strapi.server.routes([
        {
          method: 'POST',
          path: MCP_PATH,
          handler: handlePost,
          config: {
            auth: false,
          },
        },
        {
          method: 'GET',
          path: MCP_PATH,
          handler: handleGet,
          config: {
            auth: false,
          },
        },
        {
          method: 'DELETE',
          path: MCP_PATH,
          handler: handleDelete,
          config: {
            auth: false,
          },
        },
      ]);

      // Set status to 'running' after routes are registered
      status = 'running';

      // Start periodic cleanup of idle sessions
      cleanupInterval = setInterval(() => {
        cleanupIdleSessions();
      }, SESSION_CLEANUP_INTERVAL_MS);

      const baseUrl = strapi.config.get('server.url', 'http://localhost:1337');
      strapi.log.info(`[MCP] Server available at ${baseUrl}${MCP_PATH}`);
    },

    async stop() {
      status = 'stopping';

      try {
        const closePromises = Array.from(sessions.entries()).map(
          async ([sessionId, { server, transport }]) => {
            try {
              await Promise.all([transport.close(), server.close()]);
              strapi.log.debug('[MCP] Session closed', { sessionId });
              return { success: true, sessionId };
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Unknown error';
              strapi.log.error(`[MCP] Error stopping session ${sessionId}: ${message}`, {
                stack: err instanceof Error ? err.stack : undefined,
              });
              return { success: false, sessionId, error: message };
            }
          }
        );

        await Promise.all(closePromises);
      } catch (error) {
        strapi.log.error('[MCP] Error stopping service', {
          error: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
        });
      } finally {
        // Clear cleanup interval
        if (cleanupInterval !== undefined) {
          clearInterval(cleanupInterval);
          cleanupInterval = undefined;
        }

        sessions.clear();
        status = 'idle';

        strapi.log.info('[MCP] Service stopped');
      }
    },
  };

  return service;
};
