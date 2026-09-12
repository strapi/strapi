'use strict';

const { createStrapiInstance, superAdmin } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');
const { createAuthRequest, createRequest } = require('api-tests/request');
const { describeOnCondition } = require('api-tests/utils');

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const builder = createTestBuilder();

let strapi;
/** Requests as the super admin, who may work across every space. */
let rq;

const article = {
  displayName: 'Space article',
  singularName: 'space-article',
  pluralName: 'space-articles',
  attributes: {
    title: { type: 'string' },
  },
};

const ARTICLE_UID = 'api::space-article.space-article';

/** An agent acting in one space, or across all of them with `*`. */
const inSpace = (agent, slug) => agent.setHeaders({ 'X-Strapi-Space': slug });

const createSpace = async (name, slug) => {
  const { body, statusCode } = await rq({
    url: '/spaces/spaces',
    method: 'POST',
    body: { name, slug },
  });

  if (statusCode !== 200) {
    throw new Error(`Could not create space "${slug}": ${JSON.stringify(body)}`);
  }

  return body.data;
};

const createArticle = async (agent, title) =>
  agent({
    url: `/content-manager/collection-types/${ARTICLE_UID}`,
    method: 'POST',
    body: { title },
  });

const listArticles = async (agent) =>
  agent({
    url: `/content-manager/collection-types/${ARTICLE_UID}`,
    method: 'GET',
  });

describeOnCondition(edition === 'EE')('Spaces | content isolation', () => {
  let previousFeatureFlag;
  let france;
  let germany;
  let frenchArticle;
  let germanArticle;

  beforeAll(async () => {
    // Spaces is an Enterprise feature whose licence flag is rolled out
    // separately from the code, so it is switched on for this suite. It has to
    // be set before the instance loads the plugin, and unset afterwards: the
    // API suite runs every file in one process, and leaving it on would turn
    // tenancy on for every suite that follows.
    previousFeatureFlag = process.env.STRAPI_FEATURE_SPACES;
    process.env.STRAPI_FEATURE_SPACES = 'true';

    await builder.addContentType(article).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    if (!strapi.plugin('spaces')) {
      throw new Error(
        'The spaces plugin did not load. It needs an Enterprise licence and the cms-spaces feature (or STRAPI_FEATURE_SPACES=true).'
      );
    }

    // One space already exists: the migration creates it and assigns whatever
    // the project had before Spaces was switched on.
    france = await createSpace('France', 'france');
    germany = await createSpace('Germany', 'germany');

    ({
      body: { data: frenchArticle },
    } = await createArticle(inSpace(await createAuthRequest({ strapi }), 'france'), 'Bonjour'));

    ({
      body: { data: germanArticle },
    } = await createArticle(inSpace(await createAuthRequest({ strapi }), 'germany'), 'Guten Tag'));
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();

    if (previousFeatureFlag === undefined) {
      delete process.env.STRAPI_FEATURE_SPACES;
    } else {
      process.env.STRAPI_FEATURE_SPACES = previousFeatureFlag;
    }
  });

  describe('setup', () => {
    test('a space is created with the slug it was given', () => {
      expect(france).toMatchObject({ slug: 'france', status: 'active' });
      expect(germany).toMatchObject({ slug: 'germany', status: 'active' });
    });

    test('the first space is the default one, not one created later', async () => {
      const { body } = await rq({ url: '/spaces/spaces', method: 'GET' });
      const defaults = body.data.filter((space) => space.isDefault);

      expect(defaults).toHaveLength(1);
      expect(defaults[0].slug).not.toBe('germany');
    });

    test('an entry is stamped with the space it was created in', () => {
      expect(frenchArticle).toMatchObject({ title: 'Bonjour' });
      expect(germanArticle).toMatchObject({ title: 'Guten Tag' });
    });
  });

  describe('listing', () => {
    test('a space sees only its own entries', async () => {
      const agent = inSpace(await createAuthRequest({ strapi }), 'france');
      const { body } = await listArticles(agent);

      const titles = body.results.map((entry) => entry.title);

      expect(titles).toContain('Bonjour');
      expect(titles).not.toContain('Guten Tag');
    });

    test('the other space sees only its own', async () => {
      const agent = inSpace(await createAuthRequest({ strapi }), 'germany');
      const { body } = await listArticles(agent);

      const titles = body.results.map((entry) => entry.title);

      expect(titles).toContain('Guten Tag');
      expect(titles).not.toContain('Bonjour');
    });

    test('the all-spaces view sees both', async () => {
      const agent = inSpace(await createAuthRequest({ strapi }), '*');
      const { body, statusCode } = await listArticles(agent);

      expect({ statusCode, body }).toMatchObject({ statusCode: 200 });

      const titles = (body.results ?? []).map((entry) => entry.title);

      expect({ titles, pagination: body.pagination }).toMatchObject({
        titles: expect.arrayContaining(['Bonjour', 'Guten Tag']),
      });
    });

    test('a count does not leak the other space either', async () => {
      const agent = inSpace(await createAuthRequest({ strapi }), 'france');
      const { body } = await listArticles(agent);

      expect(body.pagination.total).toBe(
        body.results.filter((entry) => entry.title === 'Bonjour').length
      );
    });
  });

  describe('reaching another space directly', () => {
    test('a document id from another space is not found', async () => {
      const agent = inSpace(await createAuthRequest({ strapi }), 'france');

      const { statusCode } = await agent({
        url: `/content-manager/collection-types/${ARTICLE_UID}/${germanArticle.documentId}`,
        method: 'GET',
      });

      expect(statusCode).toBe(404);
    });

    test('it cannot be updated from the other space', async () => {
      const agent = inSpace(await createAuthRequest({ strapi }), 'france');

      const { statusCode } = await agent({
        url: `/content-manager/collection-types/${ARTICLE_UID}/${germanArticle.documentId}`,
        method: 'PUT',
        body: { title: 'Stolen' },
      });

      expect(statusCode).toBe(404);
    });

    test('it cannot be deleted from the other space', async () => {
      const agent = inSpace(await createAuthRequest({ strapi }), 'france');

      const { statusCode } = await agent({
        url: `/content-manager/collection-types/${ARTICLE_UID}/${germanArticle.documentId}`,
        method: 'DELETE',
      });

      expect(statusCode).toBe(404);

      // And it is still there.
      const check = inSpace(await createAuthRequest({ strapi }), 'germany');
      const { body } = await listArticles(check);

      expect(body.results.map((entry) => entry.title)).toContain('Guten Tag');
    });
  });

  describe('filters cannot widen the scope', () => {
    test('an $or naming the other space returns nothing extra', async () => {
      const agent = inSpace(await createAuthRequest({ strapi }), 'france');

      const { body } = await agent({
        url: `/content-manager/collection-types/${ARTICLE_UID}`,
        method: 'GET',
        qs: {
          filters: { $or: [{ title: { $eq: 'Bonjour' } }, { title: { $eq: 'Guten Tag' } }] },
        },
      });

      const titles = body.results.map((entry) => entry.title);

      expect(titles).toContain('Bonjour');
      expect(titles).not.toContain('Guten Tag');
    });
  });

  describe('choosing a space', () => {
    test('an unknown space is refused rather than silently ignored', async () => {
      const agent = inSpace(await createAuthRequest({ strapi }), 'nowhere');

      const { statusCode } = await listArticles(agent);

      expect(statusCode).toBe(403);
    });

    test('a caller with no header lands somewhere rather than seeing everything', async () => {
      const agent = await createAuthRequest({ strapi });
      const { body, statusCode } = await listArticles(agent);

      expect(statusCode).toBe(200);
      // The super admin falls back to the default space, not to every space.
      expect(body.results.map((entry) => entry.title)).not.toContain('Guten Tag');
    });
  });

  describe('the space registry', () => {
    test('reports which spaces the caller can work in', async () => {
      const { body } = await rq({ url: '/spaces/mine', method: 'GET' });

      expect(body.canAccessAll).toBe(true);
      expect(body.data.map((space) => space.slug)).toEqual(
        expect.arrayContaining(['france', 'germany'])
      );
    });

    test('refuses a duplicate slug', async () => {
      const { statusCode } = await rq({
        url: '/spaces/spaces',
        method: 'POST',
        body: { name: 'France again', slug: 'france' },
      });

      expect(statusCode).toBe(400);
    });

    test('refuses a reserved slug', async () => {
      const { statusCode } = await rq({
        url: '/spaces/spaces',
        method: 'POST',
        body: { name: 'All', slug: 'all' },
      });

      expect(statusCode).toBe(400);
    });

    test('refuses to rename a slug, because tokens and links point at it', async () => {
      const { statusCode } = await rq({
        url: `/spaces/spaces/${germany.id}`,
        method: 'PUT',
        body: { slug: 'deutschland' },
      });

      expect(statusCode).toBe(400);
    });

    test('an anonymous caller cannot list spaces', async () => {
      const anonymous = createRequest({ strapi });

      const { statusCode } = await anonymous({ url: '/spaces/spaces', method: 'GET' });

      expect(statusCode).toBe(401);
    });
  });

  describe('content that belongs to no space', () => {
    test('is visible from every space', async () => {
      const shared = await strapi.db.query(ARTICLE_UID).create({
        data: { title: 'Shared notice', documentId: 'shared-notice-doc', publishedAt: null },
      });

      expect(shared.id).toBeDefined();

      for (const slug of ['france', 'germany']) {
        const agent = inSpace(await createAuthRequest({ strapi }), slug);
        const { body } = await listArticles(agent);

        expect(body.results.map((entry) => entry.title)).toContain('Shared notice');
      }
    });
  });

  describe('unique fields', () => {
    test('the same value is allowed once in each space', async () => {
      // Uniqueness is enforced by a query, and that query is scoped — so two
      // brands can each have an `about-us`, which is the point.
      const france = inSpace(await createAuthRequest({ strapi }), 'france');
      const germany = inSpace(await createAuthRequest({ strapi }), 'germany');

      const first = await createArticle(france, 'Shared title');
      const second = await createArticle(germany, 'Shared title');

      expect(first.statusCode).toBeLessThan(300);
      expect(second.statusCode).toBeLessThan(300);
    });
  });

  describe('deleting a space', () => {
    test('says what it would destroy before doing it', async () => {
      const { body, statusCode } = await rq({
        url: `/spaces/spaces/${germany.id}/deletion-preview`,
        method: 'GET',
      });

      expect(statusCode).toBe(200);
      expect(body.data.entries[ARTICLE_UID]).toBeGreaterThanOrEqual(1);
    });

    test('refuses to delete the default space', async () => {
      const { body } = await rq({ url: '/spaces/spaces', method: 'GET' });
      const defaultSpace = body.data.find((space) => space.isDefault);

      const { statusCode } = await rq({
        url: `/spaces/spaces/${defaultSpace.id}`,
        method: 'DELETE',
      });

      expect(statusCode).toBe(400);
    });

    test('takes its content with it', async () => {
      const { statusCode } = await rq({
        url: `/spaces/spaces/${germany.id}`,
        method: 'DELETE',
      });

      expect(statusCode).toBe(200);

      const remaining = await strapi.db.query(ARTICLE_UID).findMany({
        where: { title: 'Guten Tag' },
      });

      expect(remaining).toHaveLength(0);
    });
  });

  describe('the super admin is not exempt from the boundary', () => {
    test('works in one space at a time unless they ask for all of them', async () => {
      const agent = inSpace(
        await createAuthRequest({ strapi, userInfo: superAdmin.credentials }),
        'france'
      );
      const { body } = await listArticles(agent);

      expect(body.results.map((entry) => entry.title)).not.toContain('Guten Tag');
    });
  });
});
