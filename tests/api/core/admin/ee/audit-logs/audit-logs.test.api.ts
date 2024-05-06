import { describeOnCondition } from 'api-tests/utils';
import { createTestSetup } from '../../../../utils/builder-helper';
import { Modules } from '@strapi/types';
import { createAuthRequest } from 'api-tests/request';
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
  let strapi;
  let rq;
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
    await builder.addContentType(articleModel).build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    initialEntries = await Promise.all([
      createArticle({ title: 'Article1', password: 'password' }),
      createArticle({ title: 'Article2', password: 'password' }),
      createArticle({ title: 'Article3', password: 'password' }),
    ]);
  });

  // afterAll(async () => {
  //   await builder.cleanup();
  //   await strapi.destroy();
  // });

  test('Disables audit logs', () => {});
  test('Subscribes to events based on the license', () => {});
  test('Ignores non-audit-log events', () => {});
  test('Ignores content-api events', () => {});
  test('Ignores upload-plugin events', () => {});

  test('Creates an audit log when an event is dispatched to the eventHub', async () => {
    console.log({ eh: strapi.eventHub });

    await strapi.eventHub.emit('entry.create', { meta: 'test' });

    const { body } = await rq({ method: 'GET', url: '/admin/audit-logs' });
    console.log(body.results);
    expect(body.results.length).toBeGreaterThanOrEqual(4);
  });

  test('Finds many audit logs', async () => {
    const { body } = await rq({ method: 'GET', url: '/admin/audit-logs' });

    expect(body.results.length).toBeGreaterThanOrEqual(3);
    expect(body.results[0]).toMatchObject({
      action: 'entry.create',
      payload: {
        model: 'article',
        uid: 'api::article.article',
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

  test('Finds one audit log', async () => {
    const { body } = await rq({
      method: 'GET',
      url: `/admin/audit-logs/${initialEntries[0].data.id}`,
    });

    expect(body).toMatchObject({
      action: 'entry.create',
      payload: {
        model: 'article',
        uid: 'api::article.article',
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
