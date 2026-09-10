'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const ARTICLE_UID = 'api::article.article';
const CM_URL = `/content-manager/collection-types/${ARTICLE_UID}`;
const SPACE_HEADER = 'X-Strapi-Space-Id';
const inSpace = (slug) => ({ [SPACE_HEADER]: slug });

const articleModel = {
  draftAndPublish: true,
  attributes: { title: { type: 'string' } },
  displayName: 'Article',
  singularName: 'article',
  pluralName: 'articles',
  description: '',
  collectionName: '',
};

/**
 * Releases are cross-workspace: each workspace sees its own entries (plus the
 * shared ones) in a release with its own readiness; only the default workspace
 * publishes. Needs the `cms-content-releases` EE feature: without a licence the
 * suite records that it was skipped.
 */
describe('Spaces — releases per workspace', () => {
  const builder = createTestBuilder();
  let strapi;
  let rq;
  let enabled = false;

  const docs = {};
  let releaseId;

  beforeAll(async () => {
    await builder.addContentType(articleModel).build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
    enabled = Boolean(strapi.ee?.features?.isEnabled?.('cms-content-releases'));

    if (!enabled) {
      return;
    }

    const create = async (title, space, body = {}) => {
      const res = await rq({
        url: CM_URL,
        method: 'POST',
        body: { title, ...body },
        headers: inSpace(space),
      });
      expect(res.statusCode).toBe(201);
      return res.body.data;
    };
    docs.defaultArticle = await create('Default article', 'default');
    docs.acmeArticle = await create('Acme article', 'acme');
    docs.sharedArticle = await create('Shared article', 'default', { space: null });

    const release = await rq({
      url: '/content-releases',
      method: 'POST',
      body: { name: 'Spaces release', scheduledAt: null, timezone: null },
      headers: inSpace('default'),
    });
    expect(release.statusCode).toBe(201);
    releaseId = release.body.data.id;

    for (const doc of [docs.defaultArticle, docs.acmeArticle, docs.sharedArticle]) {
      const action = await rq({
        url: `/content-releases/${releaseId}/actions`,
        method: 'POST',
        body: { entryDocumentId: doc.documentId, contentType: ARTICLE_UID, type: 'publish' },
        headers: inSpace('default'),
      });
      expect(action.statusCode).toBe(201);
    }
  });

  afterAll(async () => {
    if (enabled && releaseId) {
      await rq({ url: `/content-releases/${releaseId}`, method: 'DELETE' });
    }
    await strapi.db.query(ARTICLE_UID).deleteMany();
    await strapi.destroy();
    await builder.cleanup();
  });

  test('actions are stamped with the workspace of their entry', async () => {
    if (!enabled) return;

    const actions = await strapi.db.query('plugin::content-releases.release-action').findMany({
      where: { release: { id: releaseId } },
      populate: { space: true },
    });
    const bySlug = actions.map((action) => action.space?.slug ?? null).sort();
    expect(bySlug).toEqual([null, 'acme', 'default']);
  });

  test('a sub-workspace lists its own and the shared entries only, with a correct count', async () => {
    if (!enabled) return;

    const fromAcme = await rq({
      url: `/content-releases/${releaseId}/actions?groupBy=contentType`,
      method: 'GET',
      headers: inSpace('acme'),
    });
    const fromDefault = await rq({
      url: `/content-releases/${releaseId}/actions?groupBy=contentType`,
      method: 'GET',
      headers: inSpace('default'),
    });

    expect(fromAcme.statusCode).toBe(200);
    expect(fromAcme.body.meta.pagination.total).toBe(2);
    expect(fromDefault.body.meta.pagination.total).toBe(3);
  });

  test('the status endpoint reports one bucket per workspace, the caller sees its own', async () => {
    if (!enabled) return;

    const fromDefault = await rq({
      url: `/spaces/releases/${releaseId}/status`,
      method: 'GET',
      headers: inSpace('default'),
    });
    const fromAcme = await rq({
      url: `/spaces/releases/${releaseId}/status`,
      method: 'GET',
      headers: inSpace('acme'),
    });

    expect(fromDefault.statusCode).toBe(200);
    expect(fromDefault.body.byWorkspace.map((b) => [b.slug, b.total, b.status])).toEqual(
      expect.arrayContaining([
        ['default', 1, 'ready'],
        ['acme', 1, 'ready'],
      ])
    );
    expect(fromDefault.body.shared).toMatchObject({ total: 1, status: 'ready' });
    expect(fromAcme.body.byWorkspace.map((b) => b.slug)).toEqual(['acme']);
  });

  test('only the default workspace publishes', async () => {
    if (!enabled) return;

    const refused = await rq({
      url: `/content-releases/${releaseId}/publish`,
      method: 'POST',
      headers: inSpace('acme'),
    });
    expect(refused.statusCode).toBe(403);
    expect(refused.body.error.message).toContain('published from the default workspace');

    const published = await rq({
      url: `/content-releases/${releaseId}/publish`,
      method: 'POST',
      headers: inSpace('default'),
    });
    expect(published.statusCode).toBe(200);
  });
});
