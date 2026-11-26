import { createAgent } from 'api-tests/agent';
import type { Core } from '@strapi/types';

export const MCP_PROTOCOL_VERSION = '2025-06-18';

export type AdvertisedJsonSchema = Record<string, unknown>;

export type AdvertisedTool = {
  name: string;
  inputSchema: AdvertisedJsonSchema;
  outputSchema?: AdvertisedJsonSchema;
};

export type JsonRpcResponse = {
  jsonrpc?: '2.0';
  id?: number | string | null;
  result?: {
    tools?: AdvertisedTool[];
    structuredContent?: Record<string, unknown>;
    content?: Array<{ type: string; text?: string }>;
    isError?: boolean;
  };
  error?: { code: number; message: string };
};

/**
 * MCP reports failure on two distinct layers, and a real client reads only one of them:
 *
 * - a JSON-RPC `error`, for a request the server would not dispatch at all — a tool that is
 *   unknown to the session, or one its token may not use;
 * - `result.isError`, for everything the tool layer reports, which covers both a schema
 *   rejection of the arguments and a failure thrown by the handler itself.
 *
 * Asserting `response.error ?? response.result?.isError` passes on either, so it cannot tell a
 * validation rejection from a not-found, nor catch a case that moves between layers. These
 * helpers pin the layer, and the message where the wording is part of the contract.
 */

/** The text a tool-level error carries, joined across content parts. */
export const toolErrorText = (response: JsonRpcResponse): string =>
  (response.result?.content ?? []).map((part) => part.text ?? '').join('\n');

/** Asserts the tool ran and returned a failure — never a JSON-RPC error. */
export const expectToolError = (response: JsonRpcResponse, message?: string | RegExp): string => {
  expect(response.error).toBeUndefined();
  expect(response.result?.isError).toBe(true);

  const text = toolErrorText(response);

  if (typeof message === 'string') {
    expect(text).toContain(message);
  } else if (message !== undefined) {
    expect(text).toMatch(message);
  }

  return text;
};

/** Asserts the request was refused by the protocol layer, before any handler ran. */
export const expectJsonRpcError = (
  response: JsonRpcResponse,
  message?: string | RegExp
): { code: number; message: string } => {
  expect(response.result).toBeUndefined();
  expect(response.error).toBeDefined();

  const error = response.error as { code: number; message: string };

  if (typeof message === 'string') {
    expect(error.message).toContain(message);
  } else if (message !== undefined) {
    expect(error.message).toMatch(message);
  }

  return error;
};

/** Asserts the call succeeded on both layers. */
export const expectToolOk = (response: JsonRpcResponse): void => {
  expect(response.error).toBeUndefined();
  expect(response.result?.isError).not.toBe(true);
};

/**
 * The three failure shapes this MCP surface actually produces, pinned so a test says which one
 * it means:
 *
 * - a tool the session may not use is never advertised, and calling it is refused by the
 *   protocol as `-32602 Tool <name> disabled` — the handler never runs;
 * - arguments rejected against the tool's Zod schema come back as a tool error prefixed
 *   `Input validation error:`;
 * - anything the handler itself throws comes back as `Tool "<name>" execution failed: <message>`.
 *
 * Keeping these apart is the point: a validation rejection and a not-found are both `isError`,
 * so a test that accepts either cannot catch one turning into the other.
 */

/** A tool the session is not allowed to use: refused by the protocol, before the handler. */
export const expectToolDisabled = (response: JsonRpcResponse, name: string): void => {
  const error = expectJsonRpcError(response);
  expect(error.code).toBe(-32602);
  expect(error.message).toBe(`Tool ${name} disabled`);
};

/** Arguments rejected against the tool's input schema. Never a domain error. */
export const expectInputValidationError = (
  response: JsonRpcResponse,
  message?: string | RegExp
): string => {
  const text = expectToolError(response, /^Input validation error:/m);

  if (typeof message === 'string') {
    expect(text).toContain(message);
  } else if (message !== undefined) {
    expect(text).toMatch(message);
  }

  return text;
};

/** An error thrown by the handler — a domain failure, not a schema rejection. */
export const expectExecutionError = (
  response: JsonRpcResponse,
  name: string,
  message?: string | RegExp
): string => {
  const text = expectToolError(response, `Tool "${name}" execution failed:`);

  // A domain failure must not be reported as a validation rejection, and vice versa.
  expect(text).not.toMatch(/^Input validation error:/m);

  if (typeof message === 'string') {
    expect(text).toContain(message);
  } else if (message !== undefined) {
    expect(text).toMatch(message);
  }

  return text;
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

  const listTools = async (accessKey: string): Promise<AdvertisedTool[]> => {
    const res = await rpc(accessKey, 'tools/list');
    const parsed = parseMcpResponse(res);
    expect(parsed.error).toBeUndefined();
    return parsed.result?.tools ?? [];
  };

  const listToolNames = async (accessKey: string): Promise<string[]> =>
    (await listTools(accessKey)).map((tool) => tool.name);

  return { post, rpc, initializeSession, callTool, listTools, listToolNames, parseMcpResponse };
};
