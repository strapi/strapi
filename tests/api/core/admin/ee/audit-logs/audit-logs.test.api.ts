import { createUtils, describeOnCondition } from 'api-tests/utils';
import { createAuthRequest, createContentAPIRequest } from 'api-tests/request';
import { createStrapiInstance } from 'api-tests/strapi';
import { createTestBuilder } from 'api-tests/builder';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const articleModel = {
  kind: 'collectionType',
  collectionName: 'articles',
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  description: '',
  draftAndPublish: true,
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    title: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    password: {
      type: 'password',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
  },
};

describeOnCondition(edition === 'EE')('Audit logs', () => {
  let strapi;
  let rq;
  let contentApiRq;

  const builder = createTestBuilder();

  const createArticle = async (data: Record<string, unknown>) => {
    const { body } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::article.article',
      body: data,
    });

    return body;
  };

  beforeAll(async () => {
    await builder.addContentType(articleModel).build();
    strapi = await createStrapiInstance();

    rq = await createAuthRequest({ strapi });
    contentApiRq = await createContentAPIRequest({ strapi });

    // Ensure the audit logs are empty
    await strapi.db.query('admin::audit-log').deleteMany();

    await Promise.all([
      createArticle({ title: 'Article1', password: 'password' }),
      createArticle({ title: 'Article2', password: 'password' }),
      createArticle({ title: 'Article3', password: 'password' }),
    ]);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Ignores non-audit-log events emitted to the eventHub', async () => {
    const res = await rq({
      method: 'POST',
      url: '/admin/webhooks',
      body: {
        name: 'test',
        url: 'https://strapi.io',
        headers: {},
        events: [],
      },
    });

    const { body } = await rq({ method: 'GET', url: '/admin/audit-logs' });

    expect(res.statusCode).toBe(201);
    expect(body.results.length).toBe(3);
  });

  test('Ignores content-api requests', async () => {
    const res = await contentApiRq({
      method: 'POST',
      url: '/articles',
      body: { data: { title: 'Content api article' } },
    });

    const { body } = await rq({ method: 'GET', url: '/admin/audit-logs' });

    expect(res.statusCode).toBe(201);
    expect(body.results.length).toBe(3);
  });

  test('Ignores events emitted to the eventHub outside the context of the admin api', async () => {
    await strapi.eventHub.emit('entry.create', { meta: 'test' });

    const { body } = await rq({ method: 'GET', url: '/admin/audit-logs' });

    expect(body.results.length).toBe(3);
  });

  test('Finds many audit logs', async () => {
    const { body } = await rq({ method: 'GET', url: '/admin/audit-logs' });

    expect(body.results.length).toBe(3);
    expect(body.results[0]).toMatchObject({
      id: expect.any(Number),
      action: expect.any(String),
      date: expect.any(String),
      payload: expect.any(Object),
      user: expect.any(Object),
    });
  });

  test('Finds one audit log', async () => {
    const [auditLogToGet] = await strapi.db?.query('admin::audit-log').findMany();
    const { body } = await rq({
      method: 'GET',
      url: `/admin/audit-logs/${auditLogToGet.id}`,
    });

    expect(body.id).toBe(auditLogToGet.id);
    expect(body).toMatchObject({
      id: expect.any(Number),
      action: expect.any(String),
      date: expect.any(String),
      payload: expect.any(Object),
      user: expect.any(Object),
    });
  });

  describe('Export', () => {
    const CSV_HEADER = 'id,action,date,user_id,user_email,user_display_name,origin,payload';

    const countAuditLogs = async () => strapi.db.query('admin::audit-log').count();

    test('Exports every matching audit log as one concatenated CSV, including its own event', async () => {
      const countBefore = await countAuditLogs();

      let res = await rq({
        method: 'GET',
        url: '/admin/audit-logs/export',
        qs: { pageSize: 2 },
      });

      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('attachment');
      expect(res.headers['access-control-expose-headers']).toContain('X-Audit-Logs-Export-Until');

      expect(res.text.startsWith('\uFEFF' + CSV_HEADER)).toBe(true);

      const until = res.headers['x-audit-logs-export-until'];
      const token = res.headers['x-audit-logs-export-token'];
      let cursor = res.headers['x-audit-logs-export-next-cursor'];
      expect(until).toBeDefined();
      expect(cursor).toBeDefined();
      expect(token).toBeDefined();
      expect(res.headers['x-audit-logs-export-part-size']).toBe('2');

      let csv = res.text;
      while (cursor && cursor !== 'none') {
        res = await rq({
          method: 'GET',
          url: '/admin/audit-logs/export',
          qs: { pageSize: 2, cursor, until, token },
        });

        expect(res.statusCode).toBe(200);
        expect(res.headers['x-audit-logs-export-until']).toBe(until);
        // Continuations carry rows only, so the concatenation is one file
        expect(res.text.includes(CSV_HEADER)).toBe(false);

        csv += res.text;
        cursor = res.headers['x-audit-logs-export-next-cursor'];
      }

      expect(res.headers['x-audit-logs-export-next-cursor']).toBe('none');

      const rows = csv.trim().split('\r\n').slice(1);
      expect(rows.length).toBe(countBefore + 1);
      expect(csv).toContain('audit-log.export');
      expect(csv).toContain('admin@strapi.io');

      const ids = rows.map((row) => row.split(',')[0]);
      expect(new Set(ids).size).toBe(ids.length);
    });

    test('Export honours the filters and still returns the full matching set', async () => {
      let res = await rq({
        method: 'GET',
        url: '/admin/audit-logs/export',
        qs: { filters: { action: { $eq: 'entry.create' } }, pageSize: 2 },
      });

      expect(res.statusCode).toBe(200);

      const until = res.headers['x-audit-logs-export-until'];
      const token = res.headers['x-audit-logs-export-token'];
      let cursor = res.headers['x-audit-logs-export-next-cursor'];
      let csv = res.text;

      while (cursor && cursor !== 'none') {
        const partRes = await rq({
          method: 'GET',
          url: '/admin/audit-logs/export',
          qs: { filters: { action: { $eq: 'entry.create' } }, pageSize: 2, cursor, until, token },
        });
        csv += partRes.text;
        cursor = partRes.headers['x-audit-logs-export-next-cursor'];
      }

      const rows = csv.trim().split('\r\n').slice(1);
      expect(rows.length).toBe(3);
      for (const row of rows) {
        expect(row).toContain('entry.create');
      }
    });

    test('Refuses an export exceeding the configured cap', async () => {
      strapi.config.set('admin.auditLogs.exportMaxRows', 1);

      try {
        const res = await rq({ method: 'GET', url: '/admin/audit-logs/export' });

        expect(res.statusCode).toBe(413);
      } finally {
        strapi.config.set('admin.auditLogs.exportMaxRows', undefined);
      }
    });

    test('Refuses a cursored request that lacks a valid continuation token', async () => {
      const countBefore = await countAuditLogs();

      const forged = await rq({
        method: 'GET',
        url: '/admin/audit-logs/export',
        qs: { cursor: 1, until: 999999, token: 'forged' },
      });

      expect(forged.statusCode).toBe(400);

      const missing = await rq({
        method: 'GET',
        url: '/admin/audit-logs/export',
        qs: { cursor: 1 },
      });

      expect(missing.statusCode).toBe(400);

      expect(await countAuditLogs()).toBe(countBefore);
    });

    test('Returns 403 for a user with the read permission but not the export one', async () => {
      const utils = createUtils(strapi);

      const role = await utils.createRole({
        name: 'audit-logs-viewer',
        description: 'Can read audit logs but not export them',
      });
      await utils.assignPermissionsToRole(role.id, [
        { action: 'admin::audit-logs.read', subject: null, conditions: [], properties: {} },
      ]);
      await utils.createUser({
        email: 'audit-viewer@test.com',
        firstname: 'Audit',
        lastname: 'Viewer',
        password: 'Password123',
        isActive: true,
        roles: [role.id],
      });

      const rqViewer = await createAuthRequest({
        strapi,
        userInfo: { email: 'audit-viewer@test.com', password: 'Password123' },
      });

      const readRes = await rqViewer({ method: 'GET', url: '/admin/audit-logs' });
      expect(readRes.statusCode).toBe(200);

      const exportRes = await rqViewer({ method: 'GET', url: '/admin/audit-logs/export' });
      expect(exportRes.statusCode).toBe(403);
    });

    test('Returns 403 for a user with the export permission but not the read one', async () => {
      const utils = createUtils(strapi);

      const role = await utils.createRole({
        name: 'audit-logs-exporter-only',
        description: 'Holds the export permission without read',
      });
      await utils.assignPermissionsToRole(role.id, [
        { action: 'admin::audit-logs.export', subject: null, conditions: [], properties: {} },
      ]);
      await utils.createUser({
        email: 'audit-exporter@test.com',
        firstname: 'Audit',
        lastname: 'Exporter',
        password: 'Password123',
        isActive: true,
        roles: [role.id],
      });

      const rqExporter = await createAuthRequest({
        strapi,
        userInfo: { email: 'audit-exporter@test.com', password: 'Password123' },
      });

      const exportRes = await rqExporter({ method: 'GET', url: '/admin/audit-logs/export' });
      expect(exportRes.statusCode).toBe(403);
    });
  });
});
