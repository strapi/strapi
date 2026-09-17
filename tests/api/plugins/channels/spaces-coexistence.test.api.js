'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const ARTICLE_UID = 'api::article.article';
const CM_URL = `/content-manager/collection-types/${ARTICLE_UID}`;
const CHANNEL_HEADER = 'X-Strapi-Channel';
const SPACE_HEADER = 'X-Strapi-Space-Id';
const OVERRIDE_UID = 'plugin::channels.override';
const CHANNEL_UID = 'plugin::channels.channel';

const articleModel = {
  draftAndPublish: true,
  pluginOptions: { channels: { enabled: true } },
  attributes: {
    title: { type: 'string', pluginOptions: { channels: { overridable: true } } },
  },
  displayName: 'Article',
  singularName: 'article',
  pluralName: 'articles',
  description: '',
  collectionName: '',
};

/**
 * With the Spaces plugin installed (the test app seeds `default` and `acme`),
 * channel definitions are workspace-scoped: the same slug may exist in two
 * workspaces and resolves per X-Strapi-Space-Id.
 */
describe('Channels — coexistence with Spaces', () => {
  const builder = createTestBuilder();
  let strapi;
  let rq;

  const cleanup = async () => {
    await strapi.db.query(ARTICLE_UID).deleteMany();
    await strapi.db.query(OVERRIDE_UID).deleteMany();
    await strapi.db.query(CHANNEL_UID).deleteMany({ where: { slug: { $ne: 'default' } } });
  };

  beforeAll(async () => {
    await builder.addContentType(articleModel).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await strapi.destroy();
    await builder.cleanup();
  });

  test('The same slug lives independently in two workspaces', async () => {
    const inDefault = await rq({
      url: '/channels',
      method: 'POST',
      body: { name: 'Mobile' },
      headers: { [SPACE_HEADER]: 'default' },
    });
    expect(inDefault.statusCode).toBe(200);

    const inAcme = await rq({
      url: '/channels',
      method: 'POST',
      body: { name: 'Mobile' },
      headers: { [SPACE_HEADER]: 'acme' },
    });
    expect(inAcme.statusCode).toBe(200);

    expect(inDefault.body.slug).toBe('mobile');
    expect(inAcme.body.slug).toBe('mobile');
    expect(inDefault.body.id).not.toBe(inAcme.body.id);

    // Workspaces v2 semantics: the default workspace sees everything
    // unfiltered; sub-workspaces only see their own channels.
    // The seeded base channel (workspace-shared) shows everywhere; the
    // default workspace sees every channel, acme only its own.
    const mineDefault = await rq({
      url: '/channels/mine',
      method: 'GET',
      headers: { [SPACE_HEADER]: 'default' },
    });
    expect(mineDefault.body.map((channel) => channel.id)).toEqual(
      expect.arrayContaining([inDefault.body.id, inAcme.body.id])
    );

    const mineAcme = await rq({
      url: '/channels/mine',
      method: 'GET',
      headers: { [SPACE_HEADER]: 'acme' },
    });
    expect(mineAcme.body.map((channel) => channel.id)).toEqual(
      expect.arrayContaining([inAcme.body.id])
    );
    expect(mineAcme.body.map((channel) => channel.id)).not.toEqual(
      expect.arrayContaining([inDefault.body.id])
    );
  });

  test('The channel header resolves within the request workspace', async () => {
    const created = await rq({
      url: CM_URL,
      method: 'POST',
      body: { title: 'Base' },
      headers: { [SPACE_HEADER]: 'acme' },
    });
    expect(created.statusCode).toBe(201);
    const article = created.body.data ?? created.body;

    const overridden = await rq({
      url: `${CM_URL}/${article.documentId}`,
      method: 'PUT',
      body: { title: 'Base — mobile (acme workspace)' },
      headers: { [SPACE_HEADER]: 'acme', [CHANNEL_HEADER]: 'mobile' },
    });
    expect(overridden.statusCode).toBe(200);

    // The override references acme's "mobile" channel, not default's:
    // the slug lookup ran inside acme's read scope.
    const rows = await strapi.db.query(OVERRIDE_UID).findMany({
      where: { contentType: ARTICLE_UID, entryDocumentId: article.documentId },
      populate: { channel: { select: ['id'] } },
    });
    expect(rows).toHaveLength(1);

    const mineAcme = await rq({
      url: '/channels/mine',
      method: 'GET',
      headers: { [SPACE_HEADER]: 'acme' },
    });
    const acmeMobile = mineAcme.body.find((channel) => channel.slug === 'mobile');
    expect(rows[0].channel.id).toBe(acmeMobile.id);
  });
});
