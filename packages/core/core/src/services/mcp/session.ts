// eslint-disable-next-line import/extensions
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
// eslint-disable-next-line import/extensions
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { McpPromptRegistry } from './prompt-registry';
import { McpResourceRegistry } from './resource-registry';
import { McpToolRegistry } from './tool-registry';

export class McpSession {
  server: McpServer;

  transport: StreamableHTTPServerTransport;

  toolRegistry: McpToolRegistry;

  promptRegistry: McpPromptRegistry;

  resourceRegistry: McpResourceRegistry;

  lastActivity: number;

  tokenId: string | null;

  constructor(params: {
    server: McpServer;
    transport: StreamableHTTPServerTransport;
    toolRegistry: McpToolRegistry;
    promptRegistry: McpPromptRegistry;
    resourceRegistry: McpResourceRegistry;
    tokenId: string | null;
  }) {
    this.server = params.server;
    this.transport = params.transport;
    this.toolRegistry = params.toolRegistry;
    this.promptRegistry = params.promptRegistry;
    this.resourceRegistry = params.resourceRegistry;
    this.tokenId = params.tokenId;

    this.lastActivity = Date.now();
  }

  updateActivity(): void {
    this.lastActivity = Date.now();
  }
}
