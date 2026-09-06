import { createAgent } from 'api-tests/agent';
import type { Core } from '@strapi/types';

export const MCP_PROTOCOL_VERSION = '2025-06-18';

export type JsonRpcResponse = {
  jsonrpc?: '2.0';
  id?: number | string | null;
  result?: {
    tools?: Array<{ name: string }>;
    structuredContent?: Record<string, unknown>;
    content?: Array<{ type: string; text?: string }>;
    isError?: boolean;
  };
  error?: { code: number; message: string };
};

export type AdminPermission = {
  action: string;
  subject: string | null;
  conditions: string[];
  properties: Record<string, unknown>;
};

export type AdminToken = { id: number; name: string; accessKey: string };

// The MCP transport can answer as JSON or as an SSE stream; read both.
const parseMcpResponse = (res: { body?: unknown; text?: string }): JsonRpcResponse => {
  if (res.body !== undefined && Object.keys(res.body as Record<string, unknown>).length > 0) {
    return res.body as JsonRpcResponse;
  }

  if (typeof res.text === 'string' && res.text.length > 0) {
    const dataLines = res.text
      .split('\n')
      .filter((line) => line.startsWith('data: '))
      .map((line) => line.slice('data: '.length).trim())
      .filter((line) => line.length > 0 && line !== '[DONE]');

    if (dataLines.length > 0) {
      return JSON.parse(dataLines[dataLines.length - 1]);
    }

    return JSON.parse(res.text);
  }

  return {};
};

/**
 * Shared MCP API-test client: JSON-RPC transport, session init and tool calls
 * over `POST /mcp`. Bind it to a booted Strapi instance and an access key.
 */
export const createMcpClient = (strapi: Core.Strapi, clientName = 'strapi-mcp-test') => {
  let rpcId = 0;

  const post = async (accessKey: string, body: Record<string, unknown>) =>
    createAgent(strapi)({
      url: '/mcp',
      method: 'POST',
      headers: {
        Accept: 'application/json, text/event-stream',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessKey}`,
      },
      body,
    });

  const rpc = async (accessKey: string, method: string, params?: Record<string, unknown>) => {
    rpcId += 1;
    return post(accessKey, { jsonrpc: '2.0', id: rpcId, method, params });
  };

  const initializeSession = async (accessKey: string): Promise<void> => {
    rpcId += 1;
    const initRes = await post(accessKey, {
      jsonrpc: '2.0',
      id: rpcId,
      method: 'initialize',
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: clientName, version: '1.0.0' },
      },
    });

    expect(initRes.statusCode).toBe(200);
    const parsed = parseMcpResponse(initRes);
    expect(parsed.error).toBeUndefined();
    expect(parsed.result).toBeDefined();

    const notifiedRes = await post(accessKey, {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    });
    expect([200, 202]).toContain(notifiedRes.statusCode);
  };

  const callTool = async (
    accessKey: string,
    name: string,
    args: Record<string, unknown>
  ): Promise<JsonRpcResponse> => {
    const res = await rpc(accessKey, 'tools/call', { name, arguments: args });
    expect(res.statusCode).toBe(200);
    const parsed = parseMcpResponse(res);
    // A failed transport parses to {}; require a real JSON-RPC envelope.
    expect(parsed.result ?? parsed.error).toBeDefined();
    return parsed;
  };

  const listToolNames = async (accessKey: string): Promise<string[]> => {
    const res = await rpc(accessKey, 'tools/list');
    const parsed = parseMcpResponse(res);
    expect(parsed.error).toBeUndefined();
    return parsed.result?.tools?.map((tool) => tool.name) ?? [];
  };

  return { post, rpc, initializeSession, callTool, listToolNames, parseMcpResponse };
};
