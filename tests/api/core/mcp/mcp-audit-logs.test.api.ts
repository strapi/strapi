import { describeOnCondition } from 'api-tests/utils';
import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAgent } from 'api-tests/agent';
import { createAuthRequest } from 'api-tests/request';
import type { Core, UID } from '@strapi/types';

/**
 * Empirical test: are actions performed through the MCP server recorded in audit-logs?
 *
 * This boots a real Strapi (EE, with MCP enabled), performs a document `create`
 * through the MCP server, and checks whether an `entry.create` audit-log row is
 * written. It contrasts it with the same create through the admin content-manager
 * API, which IS audited today — isolating the MCP path as the difference.
 *
 * Audit-logs require the EE license, so the suite is skipped in CE.
 */

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const MCP_PROTOCOL_VERSION = '2025-06-18';
const MODEL_UID = 'api::mcp-audit-doc.mcp-audit-doc';
const SLUG = 'mcp-audit-doc';

const CM_ACTIONS = {
  read: 'plugin::content-manager.explorer.read',
  create: 'plugin::content-manager.explorer.create',
  delete: 'plugin::content-manager.explorer.delete',
} as const;

const ct = {
  kind: 'collectionType',
  displayName: 'mcp-audit-doc',
  singularName: 'mcp-audit-doc',
  pluralName: 'mcp-audit-docs',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string' },
  },
};

type AdminPermission = {
  action: string;
  subject: string | null;
  conditions: string[];
  properties: Record<string, unknown>;
};

type AdminToken = { id: number; name: string; accessKey: string };

type JsonRpcResponse = {
  jsonrpc?: '2.0';
  id?: number | string | null;
  result?: {
    structuredContent?: Record<string, unknown>;
    content?: Array<{ type: string; text?: string }>;
    isError?: boolean;
  };
  error?: { code: number; message: string };
};

describeOnCondition(edition === 'EE')('MCP actions in audit-logs (api)', () => {
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
  };

  const deleteAllAuditLogs = async () => {
    await strapi.db.query('admin::audit-log').deleteMany();
  };

  // Scope to this suite's own content type, isolated from other suites' rows.
  const findLogsForModel = async (action?: string) => {
    const logs = await strapi.db
      .query('admin::audit-log')
      .findMany(action ? { where: { action } } : {});
    return logs.filter((log: { payload?: { uid?: string } }) => log.payload?.uid === MODEL_UID);
  };

  const findEntryCreateLogs = async () => findLogsForModel('entry.create');

  beforeAll(async () => {
    await builder.addContentType(ct).build();

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
    await deleteAllAuditLogs();
    await strapi.destroy();
    await builder.cleanup();
  });

  afterEach(async () => {
    await deleteAllDocuments();
    await deleteAllAdminTokens();
    await deleteAllAuditLogs();
  });

  // ---------------------------------------------------------------------------
  // Helpers (adapted from mcp-content-manager-rbac.test.api.ts)
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
        clientInfo: { name: 'strapi-mcp-audit-test', version: '1.0.0' },
      },
    });

    expect(initRes.statusCode).toBe(200);

    await mcpPost(accessKey, { jsonrpc: '2.0', method: 'notifications/initialized' });
  };

  const createAdminToken = async (adminPermissions: AdminPermission[]): Promise<AdminToken> => {
    tokenCount += 1;
    const res = await rq({
      url: '/admin/admin-tokens',
      method: 'POST',
      body: { name: `mcp-audit-token-${tokenCount}`, adminPermissions },
    });
    expect(res.statusCode).toBe(201);
    return res.body.data;
  };

  const callTool = async (
    accessKey: string,
    name: string,
    args: Record<string, unknown>
  ): Promise<JsonRpcResponse> => {
    const res = await mcpRpc(accessKey, 'tools/call', { name, arguments: args });
    return parseMcpResponse(res);
  };

  const fieldPermission = (action: string, fields: string[]): AdminPermission => ({
    action,
    subject: MODEL_UID,
    conditions: [],
    properties: { fields },
  });

  // The delete action carries no `fields` (passing one is rejected with a 400).
  const actionPermission = (action: string): AdminPermission => ({
    action,
    subject: MODEL_UID,
    conditions: [],
    properties: {},
  });

  // entry.* events fire on a microtask after commit; let the subscriber run.
  const flushEvents = async () => {
    await new Promise((resolve) => setTimeout(resolve, 200));
  };

  // ---------------------------------------------------------------------------
  // Tests
  // ---------------------------------------------------------------------------

  test('sanity: a create through the admin content-manager IS audited', async () => {
    const { statusCode } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${MODEL_UID}`,
      body: { title: 'created via admin' },
    });
    expect(statusCode).toBe(201);

    await flushEvents();

    const logs = await findEntryCreateLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].payload).toMatchObject({ origin: 'admin' });
  });

  test('a create through MCP is audited and tagged with the mcp origin', async () => {
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

    await flushEvents();

    const logs = await findEntryCreateLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].payload).toMatchObject({ origin: 'mcp' });
  });

  test('a read through MCP is NOT audited', async () => {
    await strapi.documents(MODEL_UID as UID.CollectionType).create({
      data: { title: 'seed for read' },
    });

    const token = await createAdminToken([fieldPermission(CM_ACTIONS.read, ['title'])]);
    await initializeMcpSession(token.accessKey);

    const response = await callTool(token.accessKey, `list_${SLUG}`, {});
    expect(response.error).toBeUndefined();
    expect(response.result?.isError).not.toBe(true);

    await flushEvents();

    // Reads don't emit entry.* events, so nothing is recorded.
    const logs = await findLogsForModel();
    expect(logs).toHaveLength(0);
  });

  test('a delete through MCP is audited and tagged with the mcp origin', async () => {
    const seeded = await strapi.documents(MODEL_UID as UID.CollectionType).create({
      data: { title: 'to be deleted via mcp' },
    });

    const token = await createAdminToken([
      actionPermission(CM_ACTIONS.delete),
      fieldPermission(CM_ACTIONS.read, ['title']),
    ]);
    await initializeMcpSession(token.accessKey);

    const response = await callTool(token.accessKey, `delete_${SLUG}`, {
      documentId: seeded.documentId,
    });
    expect(response.error).toBeUndefined();
    expect(response.result?.isError).not.toBe(true);

    await flushEvents();

    const logs = await findLogsForModel('entry.delete');
    expect(logs).toHaveLength(1);
    expect(logs[0].payload).toMatchObject({ origin: 'mcp' });
  });
});
