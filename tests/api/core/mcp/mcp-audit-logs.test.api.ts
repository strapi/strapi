import { describeOnCondition } from 'api-tests/utils';
import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import type { Core, UID } from '@strapi/types';
import { createMcpClient, type AdminPermission, type AdminToken } from './utils/mcp-client';

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

describeOnCondition(edition === 'EE')('MCP actions in audit-logs (api)', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let mcp: ReturnType<typeof createMcpClient>;
  let tokenCount = 0;

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
    mcp = createMcpClient(strapi, 'strapi-mcp-audit-test');
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

  // entry.* events fire on a microtask after commit, so poll rather than sleep.
  const waitForAuditLog = async (action: string, timeout = 2000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const [log] = await findLogsForModel(action);
      if (log) return log;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`Expected a ${action} audit log within ${timeout}ms`);
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

    const log = await waitForAuditLog('entry.create');
    expect(log.payload).toMatchObject({ origin: 'admin' });
  });

  test('a create through MCP is audited and tagged with the mcp origin', async () => {
    const token = await createAdminToken([
      fieldPermission(CM_ACTIONS.create, ['title']),
      fieldPermission(CM_ACTIONS.read, ['title']),
    ]);
    await mcp.initializeSession(token.accessKey);

    const response = await mcp.callTool(token.accessKey, `create_${SLUG}`, {
      data: { title: 'created via mcp' },
    });

    expect(response.error).toBeUndefined();
    expect(response.result?.isError).not.toBe(true);
    const stored = await strapi.documents(MODEL_UID as UID.CollectionType).findMany({});
    expect(stored).toHaveLength(1);
    expect(stored[0].title).toBe('created via mcp');

    const log = await waitForAuditLog('entry.create');
    expect(log.payload).toMatchObject({ origin: 'mcp' });
  });

  test('a read through MCP is NOT audited', async () => {
    await strapi.documents(MODEL_UID as UID.CollectionType).create({
      data: { title: 'seed for read' },
    });

    const token = await createAdminToken([
      fieldPermission(CM_ACTIONS.read, ['title']),
      fieldPermission(CM_ACTIONS.create, ['title']),
    ]);
    await mcp.initializeSession(token.accessKey);

    const read = await mcp.callTool(token.accessKey, `list_${SLUG}`, {});
    expect(read.error).toBeUndefined();
    expect(read.result?.isError).not.toBe(true);

    // Reads emit no entry.* event. Fire a create afterwards and wait for its
    // log: once it lands, the subscriber has processed everything before it in
    // order, so the read having produced nothing is now a deterministic check.
    const create = await mcp.callTool(token.accessKey, `create_${SLUG}`, {
      data: { title: 'after read' },
    });
    expect(create.result?.isError).not.toBe(true);
    await waitForAuditLog('entry.create');

    const logs = await findLogsForModel();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('entry.create');
  });

  test('a delete through MCP is audited and tagged with the mcp origin', async () => {
    const seeded = await strapi.documents(MODEL_UID as UID.CollectionType).create({
      data: { title: 'to be deleted via mcp' },
    });

    const token = await createAdminToken([
      actionPermission(CM_ACTIONS.delete),
      fieldPermission(CM_ACTIONS.read, ['title']),
    ]);
    await mcp.initializeSession(token.accessKey);

    const response = await mcp.callTool(token.accessKey, `delete_${SLUG}`, {
      documentId: seeded.documentId,
    });
    expect(response.error).toBeUndefined();
    expect(response.result?.isError).not.toBe(true);

    const log = await waitForAuditLog('entry.delete');
    expect(log.payload).toMatchObject({ origin: 'mcp' });
  });
});
