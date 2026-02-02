import { describeOnCondition } from 'api-tests/utils';
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
});
