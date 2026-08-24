import { describeOnCondition, createUtils } from 'api-tests/utils';
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
  // Requests are issued by a dedicated admin (not the default super admin) so
  // that asserting the audited actor is the token owner is discriminating.
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let tokenOwnerId: number;
  let utils: ReturnType<typeof createUtils>;
  let mcp: ReturnType<typeof createMcpClient>;
  let tokenCount = 0;

  const tokenOwner = {
    email: 'mcp-audit-owner@test.com',
    firstname: 'Mcp',
    lastname: 'Owner',
    password: 'Password123',
  };

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
    const logs = await strapi.db.query('admin::audit-log').findMany({
      ...(action ? { where: { action } } : {}),
      populate: ['user'],
    });
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

    // A second admin (super-admin role) owns the tokens, so the actor
    // assertion distinguishes the token owner from the default super admin.
    utils = createUtils(strapi);
    const superAdminRole = await utils.getSuperAdminRole();
    const owner = await utils.createUser({ ...tokenOwner, roles: [superAdminRole.id] });
    tokenOwnerId = owner.id;

    rq = await createAuthRequest({ strapi, userInfo: tokenOwner });
    mcp = createMcpClient(strapi, 'strapi-mcp-audit-test');
    await deleteAllAdminTokens();
  });

  afterAll(async () => {
    await deleteAllDocuments();
    await deleteAllAdminTokens();
    await deleteAllAuditLogs();
    // Remove the token owner so reruns don't accumulate duplicate admins.
    await utils.deleteUserById(tokenOwnerId);
    await strapi.destroy();
    await builder.cleanup();
  });

  afterEach(async () => {
    await deleteAllDocuments();
    await deleteAllAdminTokens();
    // Deferred audit writes may still be in flight; drain then clear so a
    // pending row can't leak into the next test.
    await quiesceAuditLogs();
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

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // entry.* events fire on a microtask after commit, so poll rather than sleep.
  const waitForAuditLog = async (action: string, timeout = 2000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      const [log] = await findLogsForModel(action);
      if (log) return log;
      await sleep(50);
    }
    throw new Error(`Expected a ${action} audit log within ${timeout}ms`);
  };

  // Assert exactly one row landed, catching a late duplicate from a second
  // subscription/emission that arrives after the first row appears.
  const expectExactlyOneLog = async (action: string) => {
    await waitForAuditLog(action);
    await sleep(200);
    const logs = await findLogsForModel(action);
    expect(logs).toHaveLength(1);
    return logs[0];
  };

  // Delete audit rows, then drain any deferred write still in flight so it
  // can't leak into the next test.
  const quiesceAuditLogs = async (timeout = 2000) => {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      await deleteAllAuditLogs();
      await sleep(150);
      const [leaked] = await findLogsForModel();
      if (!leaked) return;
    }
    throw new Error('Audit logs did not quiesce; a deferred write kept landing');
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

    const log = await expectExactlyOneLog('entry.create');
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

    const log = await expectExactlyOneLog('entry.create');
    expect(log.payload).toMatchObject({ origin: 'mcp' });
    // The audited actor is the admin token's owner.
    expect(log.user.id).toBe(tokenOwnerId);
  });

  test('a read through MCP is NOT audited', async () => {
    // Seed before subscribing below, so its create event can't match the signal.
    await strapi.documents(MODEL_UID as UID.CollectionType).create({
      data: { title: 'seed for read' },
    });

    const token = await createAdminToken([
      fieldPermission(CM_ACTIONS.read, ['title']),
      fieldPermission(CM_ACTIONS.create, ['title']),
    ]);
    await mcp.initializeSession(token.accessKey);

    // A test subscriber registered now runs after the audit-logs subscriber in
    // the emit loop, so when it sees the sentinel's entry.create the audit row
    // is already committed — an explicit completion signal, not a timed guess.
    // Assumes the audit subscriber isn't re-registered mid-test (ee.enable/update
    // re-push it to the end); EE is on at boot here, so that never happens.
    let onSentinelAudited!: () => void;
    const sentinelAudited = new Promise<void>((resolve) => {
      onSentinelAudited = resolve;
    });
    const unsubscribe = strapi.eventHub.subscribe(async (name: string, ...args: any[]) => {
      if (name === 'entry.create' && args[0]?.uid === MODEL_UID) onSentinelAudited();
    });

    try {
      const read = await mcp.callTool(token.accessKey, `list_${SLUG}`, {});
      expect(read.error).toBeUndefined();
      expect(read.result?.isError).not.toBe(true);
      // Guard against an empty/failed read silently passing: it must return rows.
      const readResults = read.result?.structuredContent?.results as unknown[] | undefined;
      expect(Array.isArray(readResults)).toBe(true);
      expect(readResults?.length).toBeGreaterThan(0);

      // The read emits no entry.* event. Fire a sentinel create and wait for the
      // subscriber signal confirming its audit row was written.
      const create = await mcp.callTool(token.accessKey, `create_${SLUG}`, {
        data: { title: 'after read' },
      });
      expect(create.result?.isError).not.toBe(true);
      await sentinelAudited;
    } finally {
      unsubscribe();
    }

    // The sentinel's row is the only one: the read produced nothing.
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

    const log = await expectExactlyOneLog('entry.delete');
    expect(log.payload).toMatchObject({ origin: 'mcp' });
    expect(log.user.id).toBe(tokenOwnerId);
  });
});
