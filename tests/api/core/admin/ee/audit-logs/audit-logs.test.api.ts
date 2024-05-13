import { describeOnCondition } from 'api-tests/utils';
import { createAuthRequest, createContentAPIRequest } from 'api-tests/request';
import { createStrapiInstance } from 'api-tests/strapi';
import { createTestBuilder } from 'api-tests/builder';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const articleUid = 'api::article.article';

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
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder.addContentType(articleModel).build();
  });

  afterAll(async () => {
    await builder.cleanup();
  });

  // TODO: strapi.config returns undefined for audit logs in the testing env but has a value when running the app
  describe.skip('Disabled', () => {
    let strapi;

    beforeAll(async () => {
      // Create an instance
      strapi = await createStrapiInstance({
        bootstrap: ({ strapi: s }) => s.config.set('admin.auditLogs.enabled', false),
      });

      // Destroy and recreate the instance
      await strapi.destroy();
      strapi = await createStrapiInstance();
    });

    afterAll(async () => {
      await strapi.destroy();
    });

    test('Ignores all audit logs apis', async () => {
      expect(() => strapi.get('audit-logs')).toThrowError('Could not resolve service audit-logs');
    });
  });

  describe('Enabled', () => {
    let strapi;
    let rq;
    let contentApiRq;
    let initialEntries;

    const createArticle = async (data: Record<string, unknown>) => {
      const { body } = await rq({
        method: 'POST',
        url: '/content-manager/collection-types/api::article.article',
        body: data,
      });

      return body;
    };

    beforeAll(async () => {
      strapi = await createStrapiInstance();

      rq = await createAuthRequest({ strapi });
      contentApiRq = await createContentAPIRequest({ strapi });

      initialEntries = await Promise.all([
        createArticle({ title: 'Article1', password: 'password' }),
        createArticle({ title: 'Article2', password: 'password' }),
        createArticle({ title: 'Article3', password: 'password' }),
      ]);
    });

    afterAll(async () => {
      await strapi.destroy();
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

    // TODO: why do we ignore upload events? what events?
    test.skip('Ignores upload-plugin events', () => {});

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
        action: 'entry.create',
        payload: {
          model: 'article',
          uid: articleUid,
          entry: {
            documentId: initialEntries[0].data.documentId,
            createdAt: initialEntries[0].data.createdAt,
            updatedAt: initialEntries[0].data.updatedAt,
            id: 1,
            title: initialEntries[0].data.title,
            publishedAt: null,
            locale: 'en',
          },
        },
        id: 1,
        user: {
          id: 1,
          email: 'admin@strapi.io',
          displayName: 'admin admin',
        },
      });
    });

    test('Finds one audit log', async () => {
      const { body } = await rq({
        method: 'GET',
        url: `/admin/audit-logs/${initialEntries[0].data.id}`,
      });

      expect(body).toMatchObject({
        action: 'entry.create',
        payload: {
          model: 'article',
          uid: articleUid,
          entry: {
            documentId: initialEntries[0].data.documentId,
            createdAt: initialEntries[0].data.createdAt,
            updatedAt: initialEntries[0].data.updatedAt,
            id: 1,
            title: 'Article1',
            publishedAt: null,
            locale: 'en',
          },
        },
        id: 1,
        user: {
          id: 1,
          email: 'admin@strapi.io',
          displayName: 'admin admin',
        },
      });
    });
  });
});
