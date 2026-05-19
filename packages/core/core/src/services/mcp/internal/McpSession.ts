// eslint-disable-next-line import/extensions
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
// eslint-disable-next-line import/extensions
import type { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Data } from '@strapi/types';
import { McpPromptRegistry } from '../prompt-registry';
import { McpResourceRegistry } from '../resource-registry';
import { McpToolRegistry } from '../tool-registry';

export class McpSession {
  server: McpServer;

  transport: StreamableHTTPServerTransport;

  toolRegistry: McpToolRegistry;

  promptRegistry: McpPromptRegistry;

  resourceRegistry: McpResourceRegistry;

  lastActivity: number;

  adminTokenId: Data.ID;

  constructor(params: {
    server: McpServer;
    transport: StreamableHTTPServerTransport;
    toolRegistry: McpToolRegistry;
    promptRegistry: McpPromptRegistry;
    resourceRegistry: McpResourceRegistry;
    adminTokenId: Data.ID;
  }) {
    this.server = params.server;
    this.transport = params.transport;
    this.toolRegistry = params.toolRegistry;
    this.promptRegistry = params.promptRegistry;
    this.resourceRegistry = params.resourceRegistry;
    this.adminTokenId = params.adminTokenId;
    this.lastActivity = Date.now();
  }

  updateActivity(): void {
    this.lastActivity = Date.now();
  }
}
