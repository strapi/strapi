import { createStrapiInstance } from 'api-tests/strapi';
import { createAgent } from 'api-tests/agent';
import { createAuthRequest } from 'api-tests/request';
import type { Core } from '@strapi/types';
import * as z from 'zod';
import { JSON_RPC_ERRORS } from '../../../../packages/core/core/src/services/mcp/utils/jsonRpcErrors';

const MCP_PROTOCOL_VERSION = '2025-06-18';
const TEST_TOOL_NAME = 'mcp-refresh-test-tool';
const AUTHORIZED_ACTION = 'admin::webhooks.read';

type AdminToken = {
  id: number;
  name: string;
  accessKey: string;
};

type JsonRpcResponse = {
  jsonrpc?: '2.0';
  id?: number | string | null;
  result?: {
    tools?: Array<{ name: string }>;
  };
  error?: {
    code: number;
    message: string;
  };
};

describe('MCP admin token authentication (api)', () => {
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let tokenCount = 0;
  let rpcId = 0;

  const deleteAllAdminTokens = async () => {
    await strapi.db.query('admin::api-token').deleteMany({ where: { kind: 'admin' } });
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance({
      register({ strapi: instance }) {
        instance.config.set('features.future.adminTokens', true);
        instance.config.set('server.mcp.enabled', true);
      },
      bootstrap({ strapi: instance }) {
        instance.ai.mcp.registerTool({
          name: TEST_TOOL_NAME,
          title: 'MCP Refresh Test Tool',
          description: 'Only used by MCP API integration tests',
          auth: { action: AUTHORIZED_ACTION },
          inputSchema: z.object({}),
          outputSchema: z.object({ ok: z.boolean() }),
          createHandler: () => async () => ({ structuredContent: { ok: true }, content: [] }),
        });
      },
    });
    strapi.config.set('admin.secrets.encryptionKey', 'test-encryption-key');

    rq = await createAuthRequest({ strapi });
    await deleteAllAdminTokens();
  });

  afterAll(async () => {
    await deleteAllAdminTokens();
    await strapi.destroy();
  });

  afterEach(async () => {
    await deleteAllAdminTokens();
  });

  const createAdminToken = async (
    overrides: Partial<{
      name: string;
      lifespan: number | null;
      adminPermissions: Array<{
        action: string;
        subject: null;
        conditions: string[];
        properties: Record<string, unknown>;
      }>;
    }> = {}
  ): Promise<AdminToken> => {
    tokenCount += 1;

    const res = await rq({
      url: '/admin/admin-tokens',
      method: 'POST',
      body: {
        name: `mcp-auth-token-${tokenCount}`,
        ...overrides,
      },
    });

    expect(res.statusCode).toBe(201);
    return res.body.data;
  };

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

  const mcpRequest = async (
    method: 'GET' | 'POST' | 'DELETE',
    accessKey?: string,
    sessionId?: string | string[],
    body?: Record<string, unknown>
  ) => {
    const headers: Record<string, string | string[]> = {
      Accept: 'application/json, text/event-stream',
      'Content-Type': 'application/json',
    };

    if (accessKey !== undefined) {
      headers.Authorization = `Bearer ${accessKey}`;
    }
    if (sessionId !== undefined) {
      headers['mcp-session-id'] = sessionId;
      headers['Mcp-Protocol-Version'] = MCP_PROTOCOL_VERSION;
    }

    return createAgent(strapi)({
      url: '/mcp',
      method,
      headers,
      body,
    });
  };

  const expectJsonRpcError = (
    res: Awaited<ReturnType<typeof mcpRequest>>,
    errorKey: keyof typeof JSON_RPC_ERRORS,
    customMessage?: string
  ) => {
    const expectedError = JSON_RPC_ERRORS[errorKey];
    expect(res.statusCode).toBe(expectedError.httpStatus);

    expect(parseMcpResponse(res)).toMatchObject({
      jsonrpc: '2.0',
      error: {
        code: expectedError.code,
        message: customMessage ?? expectedError.message,
      },
      id: null,
    });
  };

  const mcpRpc = async (accessKey: string, method: string, params?: Record<string, unknown>) => {
    rpcId += 1;

    return mcpRequest('POST', accessKey, undefined, {
      jsonrpc: '2.0',
      id: rpcId,
      method,
      params,
    });
  };

  const sendInitializedNotification = async (accessKey: string) => {
    const res = await mcpRequest('POST', accessKey, undefined, {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    });

    expect([200, 202]).toContain(res.statusCode);
  };

  /**
   * Stateless MCP: each POST uses a fresh transport (no `mcp-session-id` header).
   * Clients still perform initialize + notifications/initialized before other RPCs.
   */
  const initializeMcpSession = async (accessKey: string): Promise<void> => {
    rpcId += 1;

    const res = await mcpRequest('POST', accessKey, undefined, {
      jsonrpc: '2.0',
      id: rpcId,
      method: 'initialize',
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: {
          name: 'strapi-mcp-api-test',
          version: '1.0.0',
        },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(parseMcpResponse(res)).toMatchObject({
      jsonrpc: '2.0',
      result: expect.any(Object),
    });
    expect(res.headers['mcp-session-id']).toBeUndefined();

    await sendInitializedNotification(accessKey);
  };

  const listTools = async (accessKey: string): Promise<string[]> => {
    const res = await mcpRpc(accessKey, 'tools/list');

    expect(res.statusCode).toBe(200);
    const rpcResponse = parseMcpResponse(res);
    expect(rpcResponse.error).toBeUndefined();
    expect(rpcResponse.result?.tools).toEqual(expect.any(Array));

    return rpcResponse.result?.tools?.map((tool) => tool.name) ?? [];
  };

  const setAdminTokenPermissions = async (
    token: AdminToken,
    adminPermissions: Array<{
      action: string;
      subject: null;
      conditions: string[];
      properties: Record<string, unknown>;
    }>
  ) => {
    const res = await rq({
      url: `/admin/admin-tokens/${token.id}`,
      method: 'PUT',
      body: {
        name: token.name,
        adminPermissions,
      },
    });

    expect(res.statusCode).toBe(200);
  };

  describe('unauthorized requests', () => {
    test('POST /mcp returns JSON-RPC authentication error without a bearer token', async () => {
      const res = await mcpRequest('POST', undefined, undefined, {
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
      });

      expectJsonRpcError(res, 'AUTHENTICATION_REQUIRED');
    });

    test.each(['GET', 'DELETE'] as const)(
      '%s /mcp is not supported (stateless MCP is POST-only)',
      async (method) => {
        const res = await mcpRequest(method, undefined, undefined, {
          jsonrpc: '2.0',
          id: 1,
          method: 'tools/list',
        });

        expectJsonRpcError(res, 'METHOD_NOT_ALLOWED');
      }
    );
  });

  test('revoked token is rejected after MCP handshake', async () => {
    const token = await createAdminToken();
    await initializeMcpSession(token.accessKey);

    const revokeRes = await rq({
      url: `/admin/admin-tokens/${token.id}`,
      method: 'DELETE',
    });
    expect(revokeRes.statusCode).toBe(200);

    const res = await mcpRpc(token.accessKey, 'tools/list');

    expectJsonRpcError(res, 'AUTHENTICATION_REQUIRED');
  });

  test('expired token is rejected after MCP handshake', async () => {
    const token = await createAdminToken();
    await initializeMcpSession(token.accessKey);

    await strapi.db.query('admin::api-token').update({
      where: { id: token.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    const res = await mcpRpc(token.accessKey, 'tools/list');

    expectJsonRpcError(res, 'AUTHENTICATION_REQUIRED');
  });

  test('sequential tools/list calls reflect admin token permission changes (stateless)', async () => {
    const token = await createAdminToken({
      adminPermissions: [
        { action: AUTHORIZED_ACTION, subject: null, conditions: [], properties: {} },
      ],
    });
    await initializeMcpSession(token.accessKey);

    await expect(listTools(token.accessKey)).resolves.toContain(TEST_TOOL_NAME);

    await setAdminTokenPermissions(token, []);

    await expect(listTools(token.accessKey)).resolves.not.toContain(TEST_TOOL_NAME);
  });

  test('authenticated GET and DELETE return method-not-allowed (MCP is POST-only)', async () => {
    const token = await createAdminToken();

    const getRes = await mcpRequest('GET', token.accessKey, 'not-a-uuid');
    expectJsonRpcError(getRes, 'METHOD_NOT_ALLOWED');

    const deleteRes = await mcpRequest('DELETE', token.accessKey, 'not-a-uuid');
    expectJsonRpcError(deleteRes, 'METHOD_NOT_ALLOWED');
  });

  test('authenticated GET and DELETE return method-not-allowed even with multiple session headers', async () => {
    const token = await createAdminToken();
    const sessionIds = [
      '12345678-1234-1234-1234-123456789abc',
      '12345678-1234-1234-1234-123456789abd',
    ];

    const getRes = await mcpRequest('GET', token.accessKey, sessionIds);
    expectJsonRpcError(getRes, 'METHOD_NOT_ALLOWED');

    const deleteRes = await mcpRequest('DELETE', token.accessKey, sessionIds);
    expectJsonRpcError(deleteRes, 'METHOD_NOT_ALLOWED');
  });
});
