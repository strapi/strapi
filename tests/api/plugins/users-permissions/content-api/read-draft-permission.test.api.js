'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAgent } = require('api-tests/request');

const builder = createTestBuilder();

const articleModel = {
  attributes: {
    title: { type: 'string' },
  },
  draftAndPublish: true,
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  description: '',
  collectionName: '',
};

const fixtures = [
  { title: 'Draft only', documentId: 'doc-1', publishedAt: null },
  { title: 'Also published', documentId: 'doc-2', publishedAt: null },
  { title: 'Also published', documentId: 'doc-2', publishedAt: new Date() },
];

describe('Content API readDraft permission (users-permissions)', () => {
  let strapi;
  let rq;

  beforeAll(async () => {
    await builder
      .addContentType(articleModel)
      .addFixtures(articleModel.singularName, fixtures)
      .build();

    strapi = await createStrapiInstance({ bypassAuth: false });
    rq = createAgent(strapi).setURLPrefix('/api');
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  const setPublicPermissions = async ({ readDraft }) => {
    const roleService = strapi.service('plugin::users-permissions.role');
    const publicRole = await strapi.db.query('plugin::users-permissions.role').findOne({
      where: { type: 'public' },
    });
    const roleDetails = await roleService.findOne(publicRole.id);
    const perms = roleDetails.permissions;
    perms['api::article'].controllers.article.find = { enabled: true, policy: '' };
    perms['api::article'].controllers.article.readDraft = readDraft
      ? { enabled: true, policy: '', displayName: 'Read drafts' }
      : { enabled: false, policy: '' };
    await roleService.updateRole(publicRole.id, { permissions: perms });
  };

  test('with find and readDraft, listing defaults (draft) succeeds', async () => {
    await setPublicPermissions({ readDraft: true });

    const res = await rq.get('/articles');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('with find but without readDraft, draft default list returns 403', async () => {
    await setPublicPermissions({ readDraft: false });

    const res = await rq.get('/articles');
    expect(res.status).toBe(403);
  });

  test('with find but without readDraft, published-only list succeeds', async () => {
    await setPublicPermissions({ readDraft: false });

    const res = await rq.get('/articles?status=published');
    expect(res.status).toBe(200);
  });
});
