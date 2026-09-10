'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const modelsUtils = require('api-tests/models');

const ARTICLE_UID = 'api::article.article';
const GLOSSARY_UID = 'api::glossary.glossary';
const TAG_UID = 'api::tag.tag';
const SPACE_HEADER = 'X-Strapi-Space-Id';

const cmUrl = (uid) => `/content-manager/collection-types/${uid}`;

// Exclusive (the default): every workspace manages its own entries.
const articleModel = {
  draftAndPublish: true,
  pluginOptions: { i18n: { localized: true } },
  attributes: {
    title: { type: 'string' },
    slug: { type: 'string', unique: true },
  },
  displayName: 'Article',
  singularName: 'article',
  pluralName: 'articles',
  description: '',
  collectionName: '',
};

// Shared: every entry is visible everywhere, editable from default only.
const glossaryModel = {
  pluginOptions: { spaces: { sharedEntries: true } },
  attributes: { term: { type: 'string' } },
  displayName: 'Glossary',
  singularName: 'glossary',
  pluralName: 'glossaries',
  description: '',
  collectionName: '',
};

// Shared and editable from any workspace.
const tagModel = {
  pluginOptions: { spaces: { sharedEntries: true, sharedEditable: true } },
  attributes: { name: { type: 'string' } },
  displayName: 'Tag',
  singularName: 'tag',
  pluralName: 'tags',
  description: '',
  collectionName: '',
};

describe('Spaces — workspaces v2 (default superset, sharing, uniqueness)', () => {
  const builder = createTestBuilder();
  let strapi;
  let rq;

  const docs = {};

  const inSpace = (slug) => ({ [SPACE_HEADER]: slug });

  /** A schema change only reaches the running instance through a reboot. */
  const restart = async () => {
    await strapi.destroy();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  };

  const rowsOf = (uid, documentId) =>
    strapi.db.query(uid).findMany({ where: { documentId }, populate: { space: true } });

  const spaceSlugsOf = async (uid, documentId) =>
    (await rowsOf(uid, documentId)).map((row) => row.space?.slug ?? null);

  const clean = async () => {
    for (const uid of [ARTICLE_UID, GLOSSARY_UID, TAG_UID]) {
      await strapi.db.query(uid).deleteMany();
    }
  };

  beforeAll(async () => {
    await builder
      .addContentTypes([articleModel, glossaryModel, tagModel])
      .addFixtures('plugin::i18n.locale', [{ name: 'French', code: 'fr' }])
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await clean();
  });

  afterAll(async () => {
    await clean();
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Creating entries', () => {
    test('default without a target stamps the default workspace', async () => {
      const res = await rq({
        url: cmUrl(ARTICLE_UID),
        method: 'POST',
        body: { title: 'Default article', slug: 'default-article' },
        headers: inSpace('default'),
      });

      expect(res.statusCode).toBe(201);
      docs.defaultArticle = res.body.data;
      expect(await spaceSlugsOf(ARTICLE_UID, docs.defaultArticle.documentId)).toEqual(['default']);
    });

    test('default can target another workspace with `space` in the body', async () => {
      const res = await rq({
        url: cmUrl(ARTICLE_UID),
        method: 'POST',
        body: { title: 'Acme article (from default)', slug: 'acme-from-default', space: 'acme' },
        headers: inSpace('default'),
      });

      expect(res.statusCode).toBe(201);
      docs.acmeArticle = res.body.data;
      expect(await spaceSlugsOf(ARTICLE_UID, docs.acmeArticle.documentId)).toEqual(['acme']);
    });

    test('default can create a shared entry with `space: null`', async () => {
      const res = await rq({
        url: cmUrl(ARTICLE_UID),
        method: 'POST',
        body: { title: 'Shared article', slug: 'shared-article', space: null },
        headers: inSpace('default'),
      });

      expect(res.statusCode).toBe(201);
      docs.sharedArticle = res.body.data;
      expect(await spaceSlugsOf(ARTICLE_UID, docs.sharedArticle.documentId)).toEqual([null]);
    });

    test('a sub-workspace always creates in itself, whatever the body says', async () => {
      const res = await rq({
        url: cmUrl(ARTICLE_UID),
        method: 'POST',
        body: { title: 'Acme own article', slug: 'acme-own', space: 'default' },
        headers: inSpace('acme'),
      });

      expect(res.statusCode).toBe(201);
      docs.acmeOwnArticle = res.body.data;
      expect(await spaceSlugsOf(ARTICLE_UID, docs.acmeOwnArticle.documentId)).toEqual(['acme']);
    });

    test('default rejects an unknown target workspace', async () => {
      const res = await rq({
        url: cmUrl(ARTICLE_UID),
        method: 'POST',
        body: { title: 'Nope', slug: 'nope', space: 'does-not-exist' },
        headers: inSpace('default'),
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('Reading entries', () => {
    test('default sees every entry, with its workspace', async () => {
      const res = await rq({
        url: `${cmUrl(ARTICLE_UID)}?sort=id:asc`,
        method: 'GET',
        headers: inSpace('default'),
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.results.map((row) => row.title)).toEqual([
        'Default article',
        'Acme article (from default)',
        'Shared article',
        'Acme own article',
      ]);
      expect(res.body.results.map((row) => row.space?.slug ?? null)).toEqual([
        'default',
        'acme',
        null,
        'acme',
      ]);
    });

    test('default can filter by workspace, and by "shared"', async () => {
      const acme = await rq({
        url: `${cmUrl(ARTICLE_UID)}?filters[$and][0][space][slug][$eq]=acme&sort=id:asc`,
        method: 'GET',
        headers: inSpace('default'),
      });
      const shared = await rq({
        url: `${cmUrl(ARTICLE_UID)}?filters[$and][0][space][id][$null]=true`,
        method: 'GET',
        headers: inSpace('default'),
      });

      expect(acme.statusCode).toBe(200);
      expect(acme.body.results.map((row) => row.title)).toEqual([
        'Acme article (from default)',
        'Acme own article',
      ]);
      expect(shared.statusCode).toBe(200);
      expect(shared.body.results.map((row) => row.title)).toEqual(['Shared article']);
    });

    test('a sub-workspace sees its own entries plus the shared ones', async () => {
      const res = await rq({
        url: `${cmUrl(ARTICLE_UID)}?sort=id:asc`,
        method: 'GET',
        headers: inSpace('acme'),
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.results.map((row) => row.title)).toEqual([
        'Acme article (from default)',
        'Shared article',
        'Acme own article',
      ]);
    });

    test("another workspace's entry is a 404 for a sub-workspace", async () => {
      const res = await rq({
        url: `${cmUrl(ARTICLE_UID)}/${docs.defaultArticle.documentId}`,
        method: 'GET',
        headers: inSpace('acme'),
      });

      expect(res.statusCode).toBe(404);
    });

    test('a user filter cannot widen the view of a sub-workspace', async () => {
      const res = await rq({
        url: `${cmUrl(ARTICLE_UID)}?filters[$or][0][space][slug][$eq]=default&filters[$or][1][space][slug][$eq]=acme`,
        method: 'GET',
        headers: inSpace('acme'),
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.results.map((row) => row.title)).not.toContain('Default article');
    });
  });

  describe('Writing entries from a sub-workspace', () => {
    test('its own entry is editable', async () => {
      const res = await rq({
        url: `${cmUrl(ARTICLE_UID)}/${docs.acmeOwnArticle.documentId}`,
        method: 'PUT',
        body: { title: 'Acme own article (edited)' },
        headers: inSpace('acme'),
      });

      expect(res.statusCode).toBe(200);
      expect(await spaceSlugsOf(ARTICLE_UID, docs.acmeOwnArticle.documentId)).toEqual(['acme']);
    });

    test('a shared entry is read-only (403 with an explicit message)', async () => {
      const update = await rq({
        url: `${cmUrl(ARTICLE_UID)}/${docs.sharedArticle.documentId}`,
        method: 'PUT',
        body: { title: 'Hijacked' },
        headers: inSpace('acme'),
      });
      const remove = await rq({
        url: `${cmUrl(ARTICLE_UID)}/${docs.sharedArticle.documentId}`,
        method: 'DELETE',
        headers: inSpace('acme'),
      });
      const publish = await rq({
        url: `${cmUrl(ARTICLE_UID)}/${docs.sharedArticle.documentId}/actions/publish`,
        method: 'POST',
        headers: inSpace('acme'),
      });

      expect(update.statusCode).toBe(403);
      expect(update.body.error.message).toContain('shared across workspaces');
      expect(update.body.error.details).toEqual({ reason: 'shared-entry' });
      expect(remove.statusCode).toBe(403);
      expect(publish.statusCode).toBe(403);
      expect(await rowsOf(ARTICLE_UID, docs.sharedArticle.documentId)).toHaveLength(1);
    });

    test("another workspace's entry is a 404", async () => {
      const res = await rq({
        url: `${cmUrl(ARTICLE_UID)}/${docs.defaultArticle.documentId}`,
        method: 'PUT',
        body: { title: 'Hijacked' },
        headers: inSpace('acme'),
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe('Writing entries from default', () => {
    test('publishing an acme entry keeps it in acme', async () => {
      const res = await rq({
        url: `${cmUrl(ARTICLE_UID)}/${docs.acmeArticle.documentId}/actions/publish`,
        method: 'POST',
        headers: inSpace('default'),
      });

      expect(res.statusCode).toBe(200);
      expect(await spaceSlugsOf(ARTICLE_UID, docs.acmeArticle.documentId)).toEqual([
        'acme',
        'acme',
      ]);
    });

    test('publishing a shared entry keeps it shared', async () => {
      const res = await rq({
        url: `${cmUrl(ARTICLE_UID)}/${docs.sharedArticle.documentId}/actions/publish`,
        method: 'POST',
        headers: inSpace('default'),
      });

      expect(res.statusCode).toBe(200);
      expect(await spaceSlugsOf(ARTICLE_UID, docs.sharedArticle.documentId)).toEqual([null, null]);
    });

    test('a new locale created from default stays with its document', async () => {
      const res = await rq({
        url: `${cmUrl(ARTICLE_UID)}/${docs.acmeArticle.documentId}?locale=fr`,
        method: 'PUT',
        body: { title: 'Article Acme (fr)', slug: 'acme-from-default-fr' },
        headers: inSpace('default'),
      });

      expect(res.statusCode).toBe(200);
      const rows = await rowsOf(ARTICLE_UID, docs.acmeArticle.documentId);
      const fr = rows.filter((row) => row.locale === 'fr');
      expect(fr).toHaveLength(1);
      expect(fr[0].space).toMatchObject({ slug: 'acme' });
    });

    test('a shared entry stays shared when edited from default', async () => {
      const res = await rq({
        url: `${cmUrl(ARTICLE_UID)}/${docs.sharedArticle.documentId}`,
        method: 'PUT',
        body: { title: 'Shared article (edited)' },
        headers: inSpace('default'),
      });

      expect(res.statusCode).toBe(200);
      expect(
        (await spaceSlugsOf(ARTICLE_UID, docs.sharedArticle.documentId)).every((s) => s === null)
      ).toBe(true);
    });
  });

  describe('Shared content types', () => {
    test('glossary: default creates NULL rows, a sub-workspace sees them but cannot write', async () => {
      const created = await rq({
        url: cmUrl(GLOSSARY_UID),
        method: 'POST',
        body: { term: 'Headless', space: 'acme' },
        headers: inSpace('default'),
      });
      expect(created.statusCode).toBe(201);
      docs.glossary = created.body.data;
      expect(await spaceSlugsOf(GLOSSARY_UID, docs.glossary.documentId)).toEqual([null]);

      const list = await rq({ url: cmUrl(GLOSSARY_UID), method: 'GET', headers: inSpace('acme') });
      expect(list.statusCode).toBe(200);
      expect(list.body.results).toHaveLength(1);

      const create = await rq({
        url: cmUrl(GLOSSARY_UID),
        method: 'POST',
        body: { term: 'Nope' },
        headers: inSpace('acme'),
      });
      const update = await rq({
        url: `${cmUrl(GLOSSARY_UID)}/${docs.glossary.documentId}`,
        method: 'PUT',
        body: { term: 'Nope' },
        headers: inSpace('acme'),
      });
      expect(create.statusCode).toBe(403);
      expect(update.statusCode).toBe(403);
      expect(update.body.error.details).toEqual({ reason: 'shared-content-type' });

      const fromDefault = await rq({
        url: `${cmUrl(GLOSSARY_UID)}/${docs.glossary.documentId}`,
        method: 'PUT',
        body: { term: 'Headless CMS' },
        headers: inSpace('default'),
      });
      expect(fromDefault.statusCode).toBe(200);
    });

    test('tag (shared-editable): a sub-workspace creates and edits NULL rows', async () => {
      const created = await rq({
        url: cmUrl(TAG_UID),
        method: 'POST',
        body: { name: 'News' },
        headers: inSpace('acme'),
      });
      expect(created.statusCode).toBe(201);
      docs.tag = created.body.data;
      expect(await spaceSlugsOf(TAG_UID, docs.tag.documentId)).toEqual([null]);

      const update = await rq({
        url: `${cmUrl(TAG_UID)}/${docs.tag.documentId}`,
        method: 'PUT',
        body: { name: 'Breaking news' },
        headers: inSpace('acme'),
      });
      expect(update.statusCode).toBe(200);

      const fromDefault = await rq({
        url: cmUrl(TAG_UID),
        method: 'GET',
        headers: inSpace('default'),
      });
      expect(fromDefault.body.results.map((row) => row.name)).toEqual(['Breaking news']);
    });

    /**
     * `sharedEntries` is a schema flag an admin ticks and unticks in the
     * Content-Type Builder, so it changes across a restart — the read net is
     * built from the flag when the plugin registers. Ticking it must make the
     * entries that already exist visible everywhere, read-only outside default,
     * and unticking it must hide them again: in both directions, without a
     * single row changing workspace.
     */
    test('ticking and unticking `sharedEntries` changes what a sub-workspace sees, without moving rows', async () => {
      const owned = await rq({
        url: cmUrl(ARTICLE_UID),
        method: 'POST',
        body: { title: 'Owned by default', slug: 'flag-owned' },
        headers: inSpace('default'),
      });
      expect(owned.statusCode).toBe(201);
      const { documentId } = owned.body.data;

      const readFromAcme = () =>
        rq({
          url: `${cmUrl(ARTICLE_UID)}/${documentId}`,
          method: 'GET',
          headers: inSpace('acme'),
        });

      expect((await readFromAcme()).statusCode).toBe(404);

      const setSharedEntries = async (sharedEntries) => {
        const schema = await modelsUtils.getContentTypeSchema(articleModel.singularName, {
          strapi,
        });
        await modelsUtils.modifyContentType(
          {
            ...schema,
            pluginOptions: { ...schema.pluginOptions, spaces: { sharedEntries } },
          },
          { strapi }
        );
        await restart();
      };

      try {
        await setSharedEntries(true);

        // Ticked: visible from acme…
        expect((await readFromAcme()).statusCode).toBe(200);

        // …and read-only there, for the content type's sake, not the entry's.
        const write = await rq({
          url: `${cmUrl(ARTICLE_UID)}/${documentId}`,
          method: 'PUT',
          body: { title: 'Nope' },
          headers: inSpace('acme'),
        });
        expect(write.statusCode).toBe(403);
        expect(write.body.error.details).toEqual({ reason: 'shared-content-type' });

        // The row never moved: it still belongs to default.
        expect(await spaceSlugsOf(ARTICLE_UID, documentId)).toEqual(['default']);
      } finally {
        await setSharedEntries(false);
      }

      expect((await readFromAcme()).statusCode).toBe(404);
      expect(await spaceSlugsOf(ARTICLE_UID, documentId)).toEqual(['default']);
    });

    test('entries of a shared content type cannot be moved', async () => {
      const res = await rq({
        url: '/spaces/move',
        method: 'POST',
        body: {
          uid: GLOSSARY_UID,
          documentIds: [docs.glossary.documentId],
          targetSpaceSlug: 'acme',
        },
        headers: inSpace('default'),
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('Sharing and moving entries', () => {
    test('default shares an entry with `targetSpaceSlug: null` and can make it exclusive again', async () => {
      const share = await rq({
        url: '/spaces/move',
        method: 'POST',
        body: {
          uid: ARTICLE_UID,
          documentIds: [docs.acmeOwnArticle.documentId],
          targetSpaceSlug: null,
        },
        headers: inSpace('default'),
      });
      expect(share.statusCode).toBe(200);
      expect(share.body).toMatchObject({ movedCount: 1, targetSpaceId: null });
      expect(await spaceSlugsOf(ARTICLE_UID, docs.acmeOwnArticle.documentId)).toEqual([null]);

      const back = await rq({
        url: '/spaces/move',
        method: 'POST',
        body: {
          uid: ARTICLE_UID,
          documentIds: [docs.acmeOwnArticle.documentId],
          targetSpaceSlug: 'acme',
        },
        headers: inSpace('default'),
      });
      expect(back.statusCode).toBe(200);
      expect(await spaceSlugsOf(ARTICLE_UID, docs.acmeOwnArticle.documentId)).toEqual(['acme']);
    });

    test('a sub-workspace cannot share, and can only move its own entries', async () => {
      const share = await rq({
        url: '/spaces/move',
        method: 'POST',
        body: {
          uid: ARTICLE_UID,
          documentIds: [docs.acmeOwnArticle.documentId],
          targetSpaceSlug: null,
        },
        headers: inSpace('acme'),
      });
      const moveShared = await rq({
        url: '/spaces/move',
        method: 'POST',
        body: {
          uid: ARTICLE_UID,
          documentIds: [docs.sharedArticle.documentId],
          targetSpaceSlug: 'acme',
        },
        headers: inSpace('acme'),
      });
      const moveOther = await rq({
        url: '/spaces/move',
        method: 'POST',
        body: {
          uid: ARTICLE_UID,
          documentIds: [docs.defaultArticle.documentId],
          targetSpaceSlug: 'acme',
        },
        headers: inSpace('acme'),
      });

      expect(share.statusCode).toBe(403);
      expect(moveShared.statusCode).toBe(403);
      expect(moveOther.statusCode).toBe(404);
      expect(await spaceSlugsOf(ARTICLE_UID, docs.sharedArticle.documentId)).toEqual([null, null]);
      expect(await spaceSlugsOf(ARTICLE_UID, docs.defaultArticle.documentId)).toEqual(['default']);
    });
  });

  describe('Entry states', () => {
    test('reports the workspace and editability per document for the caller', async () => {
      const ids = [
        docs.defaultArticle.documentId,
        docs.sharedArticle.documentId,
        docs.acmeOwnArticle.documentId,
      ];
      const query = `contentType=${ARTICLE_UID}&documentIds=${ids.join(',')}`;

      const fromAcme = await rq({
        url: `/spaces/entry-states?${query}`,
        method: 'GET',
        headers: inSpace('acme'),
      });
      const fromDefault = await rq({
        url: `/spaces/entry-states?${query}`,
        method: 'GET',
        headers: inSpace('default'),
      });

      expect(fromAcme.statusCode).toBe(200);
      expect(fromAcme.body.data).toEqual({
        // Read-only here, and the way out is offered with it: a workspace can
        // take its own version of an inherited entry.
        [docs.sharedArticle.documentId]: {
          space: null,
          editable: false,
          reason: 'shared-entry',
          canOverride: true,
        },
        [docs.acmeOwnArticle.documentId]: {
          space: expect.objectContaining({ slug: 'acme' }),
          editable: true,
        },
      });
      expect(fromDefault.statusCode).toBe(200);
      expect(fromDefault.body.data[docs.defaultArticle.documentId]).toEqual({
        space: expect.objectContaining({ slug: 'default' }),
        editable: true,
      });
      expect(fromDefault.body.data[docs.sharedArticle.documentId]).toEqual({
        space: null,
        editable: true,
      });
    });
  });

  describe('Unique fields per workspace', () => {
    // With draft & publish, core validates unique fields at publish time only.
    const createAndPublish = async (slug, title, space) => {
      const created = await rq({
        url: cmUrl(ARTICLE_UID),
        method: 'POST',
        body: { title, slug },
        headers: inSpace(space),
      });
      expect(created.statusCode).toBe(201);
      const published = await rq({
        url: `${cmUrl(ARTICLE_UID)}/${created.body.data.documentId}/actions/publish`,
        method: 'POST',
        headers: inSpace(space),
      });
      return { documentId: created.body.data.documentId, status: published.statusCode };
    };

    test('the same slug can exist once per workspace', async () => {
      const inDefault = await createAndPublish('unique', 'Unique in default', 'default');
      const inAcme = await createAndPublish('unique', 'Unique in acme', 'acme');
      const twiceInAcme = await createAndPublish('unique', 'Unique in acme, again', 'acme');
      const twiceInDefault = await createAndPublish(
        'unique',
        'Unique in default, again',
        'default'
      );

      expect(inDefault.status).toBe(200);
      expect(inAcme.status).toBe(200);
      expect(twiceInAcme.status).toBe(400);
      expect(twiceInDefault.status).toBe(400);
      docs.uniqueDefault = inDefault;
      docs.uniqueAcme = inAcme;
    });

    test('a shared entry counts in every workspace', async () => {
      const republish = () =>
        rq({
          url: `${cmUrl(ARTICLE_UID)}/${docs.uniqueAcme.documentId}/actions/publish`,
          method: 'POST',
          headers: inSpace('acme'),
        });

      expect((await republish()).statusCode).toBe(200);

      const share = await rq({
        url: '/spaces/move',
        method: 'POST',
        body: {
          uid: ARTICLE_UID,
          documentIds: [docs.uniqueDefault.documentId],
          targetSpaceSlug: null,
        },
        headers: inSpace('default'),
      });
      expect(share.statusCode).toBe(200);

      expect((await republish()).statusCode).toBe(400);
    });
  });

  describe('Legacy rows backfill', () => {
    test('rows without a workspace are attached to default on the first boot', async () => {
      // A headerless raw insert: what a pre-workspaces database looks like.
      await strapi.db.query(ARTICLE_UID).create({
        data: { documentId: 'legacy-article', title: 'Legacy', slug: 'legacy', locale: 'en' },
      });
      expect(await spaceSlugsOf(ARTICLE_UID, 'legacy-article')).toEqual([null]);

      // Forget that the backfill already ran, as on a fresh install of the plugin.
      await strapi.store({ type: 'plugin', name: 'spaces' }).delete({ key: 'backfill' });
      await restart();

      expect(await spaceSlugsOf(ARTICLE_UID, 'legacy-article')).toEqual(['default']);
    });

    test('deliberately shared rows stay shared on later boots', async () => {
      expect(await spaceSlugsOf(ARTICLE_UID, docs.sharedArticle.documentId)).toEqual([
        'default',
        'default',
      ]);

      const share = await rq({
        url: '/spaces/move',
        method: 'POST',
        body: {
          uid: ARTICLE_UID,
          documentIds: [docs.sharedArticle.documentId],
          targetSpaceSlug: null,
        },
        headers: inSpace('default'),
      });
      expect(share.statusCode).toBe(200);

      await restart();

      expect(await spaceSlugsOf(ARTICLE_UID, docs.sharedArticle.documentId)).toEqual([null, null]);
    });
  });
});
