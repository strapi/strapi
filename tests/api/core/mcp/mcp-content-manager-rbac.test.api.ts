import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAgent } from 'api-tests/agent';
import { createAuthRequest } from 'api-tests/request';
import type { Core, UID } from '@strapi/types';
import type { AdvertisedTool } from './utils/mcp-client';
import { getStrictClientUsableTools, JSON_SCHEMA_2020_12 } from './utils/strict-tool-client';

const MCP_PROTOCOL_VERSION = '2025-06-18';
const MODEL_UID = 'api::mcp-rbac-doc.mcp-rbac-doc';
const SLUG = 'mcp-rbac-doc';
const SINGLE_MODEL_UID = 'api::mcp-rbac-single.mcp-rbac-single';
const SINGLE_SLUG = 'mcp-rbac-single';

const CM_ACTIONS = {
  read: 'plugin::content-manager.explorer.read',
  create: 'plugin::content-manager.explorer.create',
  update: 'plugin::content-manager.explorer.update',
  delete: 'plugin::content-manager.explorer.delete',
} as const;

const ct = {
  kind: 'collectionType',
  displayName: 'mcp-rbac-doc',
  singularName: 'mcp-rbac-doc',
  pluralName: 'mcp-rbac-docs',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string' },
    secret: { type: 'string' },
    // json/blocks are valid `fields` projections but excluded from sort/filter eligibility —
    // see buildFieldsSchema regression tests below.
    payload: { type: 'json' },
    body: { type: 'blocks' },
    publishedOn: { type: 'date' },
  },
};

// Single-type coverage — the single-type get/write handlers share the same RBAC
// sanitization path as the collection-type handlers but were previously untested here.
const singleCt = {
  kind: 'singleType',
  displayName: 'mcp-rbac-single',
  singularName: 'mcp-rbac-single',
  pluralName: 'mcp-rbac-singles',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string' },
    secret: { type: 'string' },
  },
};

type AdminPermission = {
  action: string;
  subject: string | null;
  conditions: string[];
  properties: Record<string, unknown>;
};

type AdminToken = {
  id: number;
  name: string;
  accessKey: string;
};

type JsonRpcResponse = {
  jsonrpc?: '2.0';
  id?: number | string | null;
  result?: {
    tools?: AdvertisedTool[];
    structuredContent?: Record<string, unknown>;
    content?: Array<{ type: string; text?: string }>;
    isError?: boolean;
  };
  error?: {
    code: number;
    message: string;
  };
};

describe('MCP content-manager CRUD RBAC (api)', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let tokenCount = 0;
  let rpcId = 0;

  const deleteAllAdminTokens = async () => {
    await strapi.db.query('admin::api-token').deleteMany({ where: { kind: 'admin' } });
  };

  const deleteAllDocuments = async () => {
    await strapi.db.query(MODEL_UID).deleteMany({});
    await strapi.db.query(SINGLE_MODEL_UID).deleteMany({});
  };

  beforeAll(async () => {
    await builder.addContentTypes([ct, singleCt]).build();

    strapi = await createStrapiInstance({
      register({ strapi: instance }) {
        instance.config.set('features.future.adminTokens', true);
        instance.config.set('server.mcp.enabled', true);
      },
      bootstrap() {},
    });
    strapi.config.set('admin.secrets.encryptionKey', 'test-encryption-key');

    rq = await createAuthRequest({ strapi });
    await deleteAllAdminTokens();
  });

  afterAll(async () => {
    await deleteAllDocuments();
    await deleteAllAdminTokens();
    await strapi.destroy();
    await builder.cleanup();
  });

  afterEach(async () => {
    await deleteAllDocuments();
    await deleteAllAdminTokens();
  });

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

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

  const mcpPost = async (accessKey: string, body: Record<string, unknown>) =>
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

  const mcpRpc = async (accessKey: string, method: string, params?: Record<string, unknown>) => {
    rpcId += 1;
    return mcpPost(accessKey, { jsonrpc: '2.0', id: rpcId, method, params });
  };

  const initializeMcpSession = async (accessKey: string): Promise<void> => {
    rpcId += 1;
    const initRes = await mcpPost(accessKey, {
      jsonrpc: '2.0',
      id: rpcId,
      method: 'initialize',
      params: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: { name: 'strapi-mcp-rbac-test', version: '1.0.0' },
      },
    });

    expect(initRes.statusCode).toBe(200);
    expect(parseMcpResponse(initRes)).toMatchObject({ jsonrpc: '2.0', result: expect.any(Object) });
    expect(initRes.headers['mcp-session-id']).toBeUndefined();

    const notifiedRes = await mcpPost(accessKey, {
      jsonrpc: '2.0',
      method: 'notifications/initialized',
    });
    expect([200, 202]).toContain(notifiedRes.statusCode);
  };

  const createAdminToken = async (adminPermissions: AdminPermission[]): Promise<AdminToken> => {
    tokenCount += 1;
    const res = await rq({
      url: '/admin/admin-tokens',
      method: 'POST',
      body: { name: `mcp-rbac-token-${tokenCount}`, adminPermissions },
    });
    expect(res.statusCode).toBe(201);
    return res.body.data;
  };

  const listTools = async (accessKey: string): Promise<AdvertisedTool[]> => {
    const res = await mcpRpc(accessKey, 'tools/list');
    expect(res.statusCode).toBe(200);
    const parsed = parseMcpResponse(res);
    expect(parsed.error).toBeUndefined();
    return parsed.result?.tools ?? [];
  };

  const callTool = async (
    accessKey: string,
    name: string,
    args: Record<string, unknown>
  ): Promise<JsonRpcResponse> => {
    const res = await mcpRpc(accessKey, 'tools/call', { name, arguments: args });
    return parseMcpResponse(res);
  };

  const fieldPermission = (
    action: string,
    fields: string[],
    subject: string = MODEL_UID
  ): AdminPermission => ({
    action,
    subject,
    conditions: [],
    properties: { fields },
  });

  const actionPermission = (action: string): AdminPermission => ({
    action,
    subject: MODEL_UID,
    conditions: [],
    properties: {},
  });

  // ---------------------------------------------------------------------------
  // Tests
  // ---------------------------------------------------------------------------

  test('strict clients retain every advertised content-manager tool', async () => {
    const fields = ['title', 'secret', 'publishedOn'];
    const token = await createAdminToken([
      fieldPermission(CM_ACTIONS.read, fields),
      fieldPermission(CM_ACTIONS.create, fields),
      fieldPermission(CM_ACTIONS.update, fields),
      actionPermission(CM_ACTIONS.delete),
    ]);
    await initializeMcpSession(token.accessKey);

    const advertisedTools = await listTools(token.accessKey);
    expect(advertisedTools.length).toBeGreaterThan(0);
    expect(getStrictClientUsableTools(advertisedTools)).toHaveLength(advertisedTools.length);

    for (const tool of advertisedTools) {
      expect([undefined, JSON_SCHEMA_2020_12]).toContain(tool.inputSchema.$schema);
      if (tool.outputSchema !== undefined) {
        expect([undefined, JSON_SCHEMA_2020_12]).toContain(tool.outputSchema.$schema);
      }
    }

    const listTool = advertisedTools.find((tool) => tool.name === `list_${SLUG}`);
    expect(listTool).toBeDefined();
    expect(listTool?.inputSchema).toHaveProperty('$defs');
    expect(JSON.stringify(listTool?.inputSchema)).toContain('"$ref":"#/$defs/');
    expect(JSON.stringify(listTool?.inputSchema)).not.toContain('"definitions"');

    const createTool = advertisedTools.find((tool) => tool.name === `create_${SLUG}`);
    expect(createTool).toBeDefined();
    expect(createTool?.inputSchema).toMatchObject({
      properties: {
        data: {
          additionalProperties: false,
          properties: {
            publishedOn: { type: 'string' },
          },
        },
      },
    });
    expect(createTool?.outputSchema).toHaveProperty('additionalProperties', {});
    expect(JSON.stringify(advertisedTools.map((tool) => tool.outputSchema))).not.toContain(
      '"default":'
    );
  });

  test('get tool output omits fields the token cannot read', async () => {
    const seeded = await strapi.documents(MODEL_UID as UID.CollectionType).create({
      data: { title: 'visible', secret: 'hidden' },
    });

    const token = await createAdminToken([fieldPermission(CM_ACTIONS.read, ['title'])]);
    await initializeMcpSession(token.accessKey);

    const response = await callTool(token.accessKey, `get_${SLUG}`, {
      documentId: seeded.documentId,
    });

    expect(response.error).toBeUndefined();
    expect(response.result?.isError).not.toBe(true);

    const data = response.result?.structuredContent?.data as Record<string, unknown> | undefined;
    expect(data).toBeDefined();
    expect(data?.title).toBe('visible');
    expect(data).not.toHaveProperty('secret');
  });

  test('create tool rejects input fields the token is not permitted to write', async () => {
    const token = await createAdminToken([fieldPermission(CM_ACTIONS.create, ['title'])]);
    await initializeMcpSession(token.accessKey);

    const response = await callTool(token.accessKey, `create_${SLUG}`, {
      data: { title: 'ok', secret: 'should be rejected by strict schema' },
    });

    expect(response.result?.isError).toBe(true);
    const errorText = response.result?.content?.[0]?.text ?? '';
    expect(errorText).toMatch(/secret/);

    const stored = await strapi.documents(MODEL_UID as UID.CollectionType).findMany({});
    expect(stored).toHaveLength(0);
  });

  test('create tool persists only the fields the token is permitted to write', async () => {
    const token = await createAdminToken([
      fieldPermission(CM_ACTIONS.create, ['title']),
      fieldPermission(CM_ACTIONS.read, ['title']),
    ]);
    await initializeMcpSession(token.accessKey);

    const response = await callTool(token.accessKey, `create_${SLUG}`, {
      data: { title: 'created via mcp' },
    });

    expect(response.error).toBeUndefined();
    expect(response.result?.isError).not.toBe(true);

    const stored = await strapi.documents(MODEL_UID as UID.CollectionType).findMany({});
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe('created via mcp');
  });

  test('read-only token cannot see write tools and cannot invoke them', async () => {
    const seeded = await strapi.documents(MODEL_UID as UID.CollectionType).create({
      data: { title: 'seed', secret: 'data' },
    });

    const token = await createAdminToken([fieldPermission(CM_ACTIONS.read, ['title', 'secret'])]);
    await initializeMcpSession(token.accessKey);

    const advertisedTools = await listTools(token.accessKey);
    const toolNames = advertisedTools.map((tool) => tool.name);
    expect(toolNames).toContain(`list_${SLUG}`);
    expect(toolNames).toContain(`get_${SLUG}`);
    expect(toolNames).not.toContain(`create_${SLUG}`);
    expect(toolNames).not.toContain(`update_${SLUG}`);
    expect(toolNames).not.toContain(`delete_${SLUG}`);
    expect(getStrictClientUsableTools(advertisedTools)).toHaveLength(advertisedTools.length);

    const response = await callTool(token.accessKey, `delete_${SLUG}`, {
      documentId: seeded.documentId,
    });
    expect(response.error).toMatchObject({ code: -32602 });
    expect(response.error?.message).toMatch(/disabled/i);

    const surviving = await strapi.documents(MODEL_UID as UID.CollectionType).findMany({});
    expect(surviving).toHaveLength(1);
  });

  // Regression: `fields` was sanitized through permissionChecker.sanitizedQuery.read but
  // never forwarded into the documentManager.findOne options, so the get tool always
  // returned every readable scalar field regardless of the requested projection.
  test('get tool applies the requested "fields" projection instead of returning every readable field', async () => {
    const seeded = await strapi.documents(MODEL_UID as UID.CollectionType).create({
      data: { title: 'visible', secret: 'hidden' },
    });

    // Read is permitted on BOTH fields — this isolates the projection bug from RBAC.
    const token = await createAdminToken([fieldPermission(CM_ACTIONS.read, ['title', 'secret'])]);
    await initializeMcpSession(token.accessKey);

    const response = await callTool(token.accessKey, `get_${SLUG}`, {
      documentId: seeded.documentId,
      fields: ['title'],
    });

    expect(response.error).toBeUndefined();
    expect(response.result?.isError).not.toBe(true);

    const data = response.result?.structuredContent?.data as Record<string, unknown> | undefined;
    expect(data).toBeDefined();
    expect(data?.title).toBe('visible');
    // secret is readable (permission-wise) but was not requested — must not appear.
    expect(data).not.toHaveProperty('secret');
  });

  // Regression: buildFieldsSchema reused the sort/filter scalar allowlist, which excludes
  // json/blocks, so `fields: ['payload']`/`fields: ['body']` failed MCP input validation
  // before ever reaching the handler.
  test('get tool accepts json and blocks fields as valid read projections', async () => {
    const seeded = await strapi.documents(MODEL_UID as UID.CollectionType).create({
      data: {
        title: 'visible',
        payload: { role: 'admin', flags: ['a', 'b'] },
        body: [{ type: 'paragraph', children: [{ type: 'text', text: 'Hello' }] }],
      },
    });

    const token = await createAdminToken([
      fieldPermission(CM_ACTIONS.read, ['title', 'payload', 'body']),
    ]);
    await initializeMcpSession(token.accessKey);

    const payloadResponse = await callTool(token.accessKey, `get_${SLUG}`, {
      documentId: seeded.documentId,
      fields: ['payload'],
    });
    expect(payloadResponse.result?.isError).not.toBe(true);
    const payloadData = payloadResponse.result?.structuredContent?.data as
      | Record<string, unknown>
      | undefined;
    expect(payloadData?.payload).toEqual({ role: 'admin', flags: ['a', 'b'] });

    const bodyResponse = await callTool(token.accessKey, `get_${SLUG}`, {
      documentId: seeded.documentId,
      fields: ['body'],
    });
    expect(bodyResponse.result?.isError).not.toBe(true);
    const bodyData = bodyResponse.result?.structuredContent?.data as
      | Record<string, unknown>
      | undefined;
    expect(bodyData?.body).toEqual([
      { type: 'paragraph', children: [{ type: 'text', text: 'Hello' }] },
    ]);
  });

  // ---------------------------------------------------------------------------
  // Single-type coverage — the get_/write_ single-type handlers share the same
  // sanitizedQuery.read/sanitizeCreateInput RBAC path exercised above for collection
  // types, but had no dedicated fixture/test in this suite.
  // ---------------------------------------------------------------------------

  describe('single-type RBAC', () => {
    test('get tool output omits fields the token cannot read', async () => {
      await strapi
        .documents(SINGLE_MODEL_UID as UID.SingleType)
        .create({ data: { title: 'visible', secret: 'hidden' } });

      const token = await createAdminToken([
        fieldPermission(CM_ACTIONS.read, ['title'], SINGLE_MODEL_UID),
      ]);
      await initializeMcpSession(token.accessKey);

      const response = await callTool(token.accessKey, `get_${SINGLE_SLUG}`, {});

      expect(response.error).toBeUndefined();
      expect(response.result?.isError).not.toBe(true);

      const data = response.result?.structuredContent?.data as Record<string, unknown> | undefined;
      expect(data).toBeDefined();
      expect(data?.title).toBe('visible');
      expect(data).not.toHaveProperty('secret');
    });

    test('get tool applies the requested "fields" projection', async () => {
      await strapi
        .documents(SINGLE_MODEL_UID as UID.SingleType)
        .create({ data: { title: 'visible', secret: 'hidden' } });

      // Read is permitted on BOTH fields — isolates the projection from RBAC.
      const token = await createAdminToken([
        fieldPermission(CM_ACTIONS.read, ['title', 'secret'], SINGLE_MODEL_UID),
      ]);
      await initializeMcpSession(token.accessKey);

      const response = await callTool(token.accessKey, `get_${SINGLE_SLUG}`, {
        fields: ['title'],
      });

      expect(response.result?.isError).not.toBe(true);
      const data = response.result?.structuredContent?.data as Record<string, unknown> | undefined;
      expect(data?.title).toBe('visible');
      expect(data).not.toHaveProperty('secret');
    });

    test('write tool rejects input fields the token is not permitted to write', async () => {
      const token = await createAdminToken([
        fieldPermission(CM_ACTIONS.create, ['title'], SINGLE_MODEL_UID),
        fieldPermission(CM_ACTIONS.update, ['title'], SINGLE_MODEL_UID),
      ]);
      await initializeMcpSession(token.accessKey);

      const response = await callTool(token.accessKey, `write_${SINGLE_SLUG}`, {
        data: { title: 'ok', secret: 'should be rejected by strict schema' },
      });

      expect(response.result?.isError).toBe(true);
      const errorText = response.result?.content?.[0]?.text ?? '';
      expect(errorText).toMatch(/secret/);

      const stored = await strapi.documents(SINGLE_MODEL_UID as UID.SingleType).findFirst({});
      expect(stored).toBeNull();
    });

    test('write tool persists only the fields the token is permitted to write', async () => {
      const token = await createAdminToken([
        fieldPermission(CM_ACTIONS.create, ['title'], SINGLE_MODEL_UID),
        fieldPermission(CM_ACTIONS.update, ['title'], SINGLE_MODEL_UID),
        fieldPermission(CM_ACTIONS.read, ['title'], SINGLE_MODEL_UID),
      ]);
      await initializeMcpSession(token.accessKey);

      const response = await callTool(token.accessKey, `write_${SINGLE_SLUG}`, {
        data: { title: 'created via mcp' },
      });

      expect(response.error).toBeUndefined();
      expect(response.result?.isError).not.toBe(true);

      const stored = await strapi.documents(SINGLE_MODEL_UID as UID.SingleType).findFirst({});
      expect(stored?.title).toBe('created via mcp');
    });
  });
});
