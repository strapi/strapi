'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const POST_UID = 'api::post.post';
const NOTICE_UID = 'api::notice.notice';
const SPACE_HEADER = 'X-Strapi-Space-Id';
const cmUrl = (uid) => `/content-manager/collection-types/${uid}`;

/**
 * A unique `slug` is the point: an override keeps the original's documentId and
 * every one of its field values, so the entity validator has to be looking at a
 * world where the original is not visible, or no content type worth the name
 * could ever be overridden.
 */
const postModel = {
  draftAndPublish: true,
  pluginOptions: { i18n: { localized: true } },
  attributes: {
    title: { type: 'string' },
    slug: { type: 'string', unique: true },
  },
  displayName: 'Post',
  singularName: 'post',
  pluralName: 'posts',
  description: '',
  collectionName: '',
};

/**
 * Every entry shared, by the content type rather than one at a time — the case
 * an admin lands in by ticking "Share every entry with all workspaces".
 */
const noticeModel = {
  draftAndPublish: true,
  pluginOptions: { spaces: { sharedEntries: true } },
  attributes: { title: { type: 'string' } },
  displayName: 'Notice',
  singularName: 'notice',
  pluralName: 'notices',
  description: '',
  collectionName: '',
};

/**
 * Inheritance: an entry shared from the default workspace is read by every
 * workspace, until one of them takes its own copy of it.
 */
describe('Spaces — inherited entries and per-workspace overrides', () => {
  const builder = createTestBuilder();
  let strapi;
  let rq;
  let globexId;

  const inSpace = (slug) => ({ [SPACE_HEADER]: slug });

  /**
   * Ground truth, in SQL: `strapi.db.query` runs through the read net, which
   * outside a workspace hides the copies on purpose — the very rows these
   * assertions are about.
   */
  const rowsOf = async (documentId) => {
    const table = strapi.db.metadata.get(POST_UID).tableName;
    return strapi.db
      .connection(table)
      .leftJoin('spaces', `${table}.space_id`, 'spaces.id')
      .where(`${table}.document_id`, documentId)
      .select('spaces.slug as slug', `${table}.space_override as isCopy`);
  };

  /** Every (workspace, is-a-copy) pair a document exists under. */
  const placementsOf = async (documentId) =>
    [
      ...new Set(
        (await rowsOf(documentId)).map(
          (row) => `${row.slug ?? 'shared'}${row.isCopy ? ' (copy)' : ''}`
        )
      ),
    ].sort();

  const readFrom = (slug, documentId) =>
    rq({ url: `${cmUrl(POST_UID)}/${documentId}`, method: 'GET', headers: inSpace(slug) });

  const listFrom = (slug) =>
    rq({ url: `${cmUrl(POST_UID)}?pageSize=100`, method: 'GET', headers: inSpace(slug) });

  const createShared = async (title, slug) => {
    const created = await rq({
      url: cmUrl(POST_UID),
      method: 'POST',
      body: { title, slug },
      headers: inSpace('default'),
    });
    expect(created.statusCode).toBe(201);
    const { documentId } = created.body.data;

    const shared = await rq({
      url: '/spaces/move',
      method: 'POST',
      body: { uid: POST_UID, documentIds: [documentId], targetSpaceSlug: null },
      headers: inSpace('default'),
    });
    expect(shared.statusCode).toBe(200);
    return documentId;
  };

  const override = (slug, documentId) =>
    rq({
      url: '/spaces/inheritance/override',
      method: 'POST',
      body: { uid: POST_UID, documentId },
      headers: inSpace(slug),
    });

  const reset = (slug, documentId) =>
    rq({
      url: '/spaces/inheritance/reset',
      method: 'POST',
      body: { uid: POST_UID, documentId },
      headers: inSpace(slug),
    });

  beforeAll(async () => {
    await builder.addContentTypes([postModel, noticeModel]).build();
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await strapi.db.query('plugin::spaces.space').deleteMany({ where: { slug: 'globex' } });
    const globex = await rq({
      url: '/spaces',
      method: 'POST',
      body: { slug: 'globex', name: 'Globex', color: '#4945FF' },
      headers: inSpace('default'),
    });
    expect([200, 201]).toContain(globex.statusCode);
    globexId = globex.body.id ?? globex.body.data?.id;
  });

  afterAll(async () => {
    await strapi.db.query(POST_UID).deleteMany();
    await strapi.db.query(NOTICE_UID).deleteMany();
    if (globexId) {
      await strapi.db.query('plugin::spaces.space').delete({ where: { id: globexId } });
    }
    await strapi.destroy();
    await builder.cleanup();
  });

  beforeEach(async () => {
    await strapi.db.query(POST_UID).deleteMany();
  });

  describe('Taking a copy', () => {
    test('an inherited entry is read-only until the workspace overrides it', async () => {
      const documentId = await createShared('Company handbook', 'handbook');

      const before = await readFrom('acme', documentId);
      expect(before.statusCode).toBe(200);
      expect(before.body.data.title).toBe('Company handbook');

      const refused = await rq({
        url: `${cmUrl(POST_UID)}/${documentId}`,
        method: 'PUT',
        body: { title: 'Acme handbook' },
        headers: inSpace('acme'),
      });
      expect(refused.statusCode).toBe(403);
      expect(refused.body.error.details).toEqual({ reason: 'shared-entry' });

      expect((await override('acme', documentId)).statusCode).toBe(200);

      const written = await rq({
        url: `${cmUrl(POST_UID)}/${documentId}`,
        method: 'PUT',
        body: { title: 'Acme handbook' },
        headers: inSpace('acme'),
      });
      expect(written.statusCode).toBe(200);
      expect(written.body.data.title).toBe('Acme handbook');
    });

    /**
     * The copy carries the original's unique values, so it can only be written
     * while the original is out of sight — the reason the copy runs in a scope
     * that hides it.
     */
    test('a unique field does not stop a workspace from overriding', async () => {
      const documentId = await createShared('Pricing', 'pricing');

      const taken = await override('acme', documentId);

      expect(taken.statusCode).toBe(200);
      expect(await placementsOf(documentId)).toEqual(['acme (copy)', 'shared']);
    });

    test('the same entry can be overridden in more than one workspace', async () => {
      const documentId = await createShared('Terms', 'terms');

      expect((await override('acme', documentId)).statusCode).toBe(200);
      expect((await override('globex', documentId)).statusCode).toBe(200);

      expect(await placementsOf(documentId)).toEqual(['acme (copy)', 'globex (copy)', 'shared']);
    });

    test('overriding twice in the same workspace is refused', async () => {
      const documentId = await createShared('Roadmap', 'roadmap');
      expect((await override('acme', documentId)).statusCode).toBe(200);

      const again = await override('acme', documentId);

      expect(again.statusCode).toBe(400);
      expect(again.body.error.message).toContain('already overridden');
    });

    test('an entry that belongs to one workspace cannot be overridden', async () => {
      const created = await rq({
        url: cmUrl(POST_UID),
        method: 'POST',
        body: { title: 'Acme only', slug: 'acme-only' },
        headers: inSpace('acme'),
      });
      expect(created.statusCode).toBe(201);

      const refused = await override('globex', created.body.data.documentId);

      expect([403, 404]).toContain(refused.statusCode);
    });

    test('the default workspace has nothing to override — it owns the original', async () => {
      const documentId = await createShared('Press kit', 'press-kit');

      const refused = await rq({
        url: '/spaces/inheritance/override',
        method: 'POST',
        body: { uid: POST_UID, documentId },
        headers: inSpace('default'),
      });

      expect(refused.statusCode).toBe(400);
    });
  });

  describe('What each workspace reads', () => {
    test('a copy is read by its workspace only; everyone else stays on the original', async () => {
      const documentId = await createShared('Support policy', 'support');
      await override('acme', documentId);
      await rq({
        url: `${cmUrl(POST_UID)}/${documentId}`,
        method: 'PUT',
        body: { title: 'Acme support policy' },
        headers: inSpace('acme'),
      });

      expect((await readFrom('acme', documentId)).body.data.title).toBe('Acme support policy');
      expect((await readFrom('globex', documentId)).body.data.title).toBe('Support policy');
      expect((await readFrom('default', documentId)).body.data.title).toBe('Support policy');
    });

    /**
     * The default workspace sees every workspace's entries, but a copy is not a
     * new entry — it is the same document seen from somewhere else. Listing it
     * would put one document on screen once per workspace that overrode it.
     */
    test('the default workspace lists the entry once, not once per copy', async () => {
      const documentId = await createShared('Brand guide', 'brand');
      await override('acme', documentId);
      await override('globex', documentId);

      const list = await listFrom('default');

      const matching = list.body.results.filter((row) => row.documentId === documentId);
      expect(matching).toHaveLength(1);
      expect(matching[0].title).toBe('Brand guide');
    });

    test('a workspace lists its copy instead of the original, and only once', async () => {
      const documentId = await createShared('Style guide', 'style');
      await override('acme', documentId);
      await rq({
        url: `${cmUrl(POST_UID)}/${documentId}`,
        method: 'PUT',
        body: { title: 'Acme style guide' },
        headers: inSpace('acme'),
      });

      const list = await listFrom('acme');

      const matching = list.body.results.filter((row) => row.documentId === documentId);
      expect(matching).toHaveLength(1);
      expect(matching[0].title).toBe('Acme style guide');
    });

    test('editing the original still reaches the workspaces that inherit it', async () => {
      const documentId = await createShared('Changelog', 'changelog');
      await override('acme', documentId);

      await rq({
        url: `${cmUrl(POST_UID)}/${documentId}`,
        method: 'PUT',
        body: { title: 'Changelog 2026' },
        headers: inSpace('default'),
      });

      expect((await readFrom('globex', documentId)).body.data.title).toBe('Changelog 2026');
      // …and stops at the workspace that took its own copy.
      expect((await readFrom('acme', documentId)).body.data.title).toBe('Changelog');
    });
  });

  describe('Going back to the original', () => {
    test('resetting drops the copy and the workspace follows the original again', async () => {
      const documentId = await createShared('Onboarding', 'onboarding');
      await override('acme', documentId);
      await rq({
        url: `${cmUrl(POST_UID)}/${documentId}`,
        method: 'PUT',
        body: { title: 'Acme onboarding' },
        headers: inSpace('acme'),
      });

      const done = await reset('acme', documentId);

      expect(done.statusCode).toBe(200);
      expect(await placementsOf(documentId)).toEqual(['shared']);
      expect((await readFrom('acme', documentId)).body.data.title).toBe('Onboarding');
    });

    test('resetting an entry that was never overridden is refused', async () => {
      const documentId = await createShared('Security', 'security');

      const refused = await reset('acme', documentId);

      expect(refused.statusCode).toBe(404);
    });

    /**
     * Deleting the copy would put the workspace back on the original — the
     * entry would reappear, which is not what delete promises.
     */
    test('deleting a copy is refused, and points at resetting', async () => {
      const documentId = await createShared('Careers', 'careers');
      await override('acme', documentId);

      const refused = await rq({
        url: `${cmUrl(POST_UID)}/${documentId}`,
        method: 'DELETE',
        headers: inSpace('acme'),
      });

      expect(refused.statusCode).toBe(403);
      expect(refused.body.error.details).toEqual({ reason: 'override-delete' });
      expect(await placementsOf(documentId)).toEqual(['acme (copy)', 'shared']);
    });
  });

  describe('When the original stops being inherited', () => {
    test('moving it into a workspace turns the other copies into ordinary entries', async () => {
      const documentId = await createShared('Investor update', 'investors');
      await override('acme', documentId);

      const moved = await rq({
        url: '/spaces/move',
        method: 'POST',
        body: { uid: POST_UID, documentIds: [documentId], targetSpaceSlug: 'globex' },
        headers: inSpace('default'),
      });
      expect(moved.statusCode).toBe(200);

      // Acme keeps its content, as an entry of its own now.
      expect(await placementsOf(documentId)).toEqual(['acme', 'globex']);
      expect((await readFrom('acme', documentId)).statusCode).toBe(200);
    });

    test('moving it into a workspace that has its own copy is refused', async () => {
      const documentId = await createShared('Partner list', 'partners');
      await override('acme', documentId);

      const refused = await rq({
        url: '/spaces/move',
        method: 'POST',
        body: { uid: POST_UID, documentIds: [documentId], targetSpaceSlug: 'acme' },
        headers: inSpace('default'),
      });

      expect(refused.statusCode).toBe(400);
      expect(refused.body.error.message).toContain('own copy');
    });

    test('a move never drags another workspace’s copy along', async () => {
      const documentId = await createShared('Roadmap 2027', 'roadmap-2027');
      await override('acme', documentId);

      await rq({
        url: '/spaces/move',
        method: 'POST',
        body: { uid: POST_UID, documentIds: [documentId], targetSpaceSlug: 'globex' },
        headers: inSpace('default'),
      });

      const rows = await rowsOf(documentId);
      expect(rows.filter((row) => row.slug === 'acme').length).toBeGreaterThan(0);
    });
  });

  describe('Who follows what, from the default workspace', () => {
    test('reports the workspaces on the original and the ones with a copy', async () => {
      const documentId = await createShared('Mission', 'mission');
      await override('acme', documentId);

      const summary = await rq({
        url: `/spaces/inheritance?contentType=${POST_UID}&documentIds=${documentId}`,
        method: 'GET',
        headers: inSpace('default'),
      });

      expect(summary.statusCode).toBe(200);
      const entry = summary.body.data[documentId];
      expect(entry.inherited).toBe(true);
      expect(entry.overriddenIn.map((space) => space.slug)).toEqual(['acme']);
      expect(entry.inheritedIn.map((space) => space.slug).sort()).toEqual(['default', 'globex']);
    });

    test('marks a copy that has been edited since it was taken', async () => {
      const documentId = await createShared('Values', 'values');
      await override('acme', documentId);

      const before = await rq({
        url: `/spaces/inheritance?contentType=${POST_UID}&documentIds=${documentId}`,
        method: 'GET',
        headers: inSpace('default'),
      });
      expect(before.body.data[documentId].overriddenIn[0].edited).toBe(false);

      await new Promise((resolve) => {
        setTimeout(resolve, 1100);
      });
      await rq({
        url: `${cmUrl(POST_UID)}/${documentId}`,
        method: 'PUT',
        body: { title: 'Acme values' },
        headers: inSpace('acme'),
      });

      const after = await rq({
        url: `/spaces/inheritance?contentType=${POST_UID}&documentIds=${documentId}`,
        method: 'GET',
        headers: inSpace('default'),
      });
      expect(after.body.data[documentId].overriddenIn[0].edited).toBe(true);
    });
  });

  /**
   * A content type whose entries are all shared is the case an admin reaches by
   * ticking "Share every entry with all workspaces" — and then wanting one of
   * them to differ in one workspace. Nothing here is stamped with a workspace,
   * so "inherited" is every row, and a copy has to shadow the original just the
   * same.
   */
  describe('A content type where every entry is shared', () => {
    const createNotice = async (title) => {
      const created = await rq({
        url: cmUrl(NOTICE_UID),
        method: 'POST',
        body: { title },
        headers: inSpace('default'),
      });
      expect(created.statusCode).toBe(201);
      return created.body.data.documentId;
    };

    const overrideNotice = (slug, documentId) =>
      rq({
        url: '/spaces/inheritance/override',
        method: 'POST',
        body: { uid: NOTICE_UID, documentId },
        headers: inSpace(slug),
      });

    beforeEach(async () => {
      await strapi.db.query(NOTICE_UID).deleteMany();
    });

    test('a workspace can take its own version of an entry', async () => {
      const documentId = await createNotice('Opening hours');

      const refused = await rq({
        url: `${cmUrl(NOTICE_UID)}/${documentId}`,
        method: 'PUT',
        body: { title: 'Acme hours' },
        headers: inSpace('acme'),
      });
      expect(refused.statusCode).toBe(403);
      expect(refused.body.error.details).toEqual({ reason: 'shared-content-type' });

      expect((await overrideNotice('acme', documentId)).statusCode).toBe(200);

      const written = await rq({
        url: `${cmUrl(NOTICE_UID)}/${documentId}`,
        method: 'PUT',
        body: { title: 'Acme hours' },
        headers: inSpace('acme'),
      });
      expect(written.statusCode).toBe(200);
      expect(written.body.data.title).toBe('Acme hours');
    });

    test('the copy shadows the original in that workspace, and nowhere else', async () => {
      const documentId = await createNotice('Opening hours');
      await overrideNotice('acme', documentId);
      await rq({
        url: `${cmUrl(NOTICE_UID)}/${documentId}`,
        method: 'PUT',
        body: { title: 'Acme hours' },
        headers: inSpace('acme'),
      });

      const fromAcme = await rq({
        url: `${cmUrl(NOTICE_UID)}?pageSize=100`,
        method: 'GET',
        headers: inSpace('acme'),
      });
      const acmeRows = fromAcme.body.results.filter((row) => row.documentId === documentId);
      expect(acmeRows).toHaveLength(1);
      expect(acmeRows[0].title).toBe('Acme hours');

      for (const slug of ['default', 'globex']) {
        const list = await rq({
          url: `${cmUrl(NOTICE_UID)}?pageSize=100`,
          method: 'GET',
          headers: inSpace(slug),
        });
        const rows = list.body.results.filter((row) => row.documentId === documentId);
        expect(rows).toHaveLength(1);
        expect(rows[0].title).toBe('Opening hours');
      }
    });

    test('resetting puts the workspace back on the original', async () => {
      const documentId = await createNotice('Opening hours');
      await overrideNotice('acme', documentId);
      await rq({
        url: `${cmUrl(NOTICE_UID)}/${documentId}`,
        method: 'PUT',
        body: { title: 'Acme hours' },
        headers: inSpace('acme'),
      });

      const done = await rq({
        url: '/spaces/inheritance/reset',
        method: 'POST',
        body: { uid: NOTICE_UID, documentId },
        headers: inSpace('acme'),
      });
      expect(done.statusCode).toBe(200);

      const after = await rq({
        url: `${cmUrl(NOTICE_UID)}/${documentId}`,
        method: 'GET',
        headers: inSpace('acme'),
      });
      expect(after.body.data.title).toBe('Opening hours');
    });
  });
});
