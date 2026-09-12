'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');

const builder = createTestBuilder();

let strapi;

const article = {
  displayName: 'Scoped article',
  singularName: 'scoped-article',
  pluralName: 'scoped-articles',
  attributes: {
    title: { type: 'string' },
    author: { type: 'relation', relation: 'manyToOne', target: 'api::scoped-author.scoped-author' },
  },
};

const author = {
  displayName: 'Scoped author',
  singularName: 'scoped-author',
  pluralName: 'scoped-authors',
  attributes: {
    name: { type: 'string' },
  },
};

const ARTICLE_UID = 'api::scoped-article.scoped-article';
const AUTHOR_UID = 'api::scoped-author.scoped-author';

/**
 * The enforcement, against a real Strapi and a real database, without needing
 * an Enterprise licence.
 *
 * The plugin registers its schema whether or not the feature is on — that is
 * what keeps a lapsed licence from dropping the column — so a Community
 * instance still has `space_id` on its content types and the space table to
 * point it at. Installing the scope by hand exercises the real document
 * service, the real query builder and the real database; only the parts a
 * licence gates (request resolution, membership, the admin) are left out, and
 * those are covered by isolation.test.api.js.
 */
describe('Spaces | enforcement', () => {
  let scope;
  let france;
  let germany;
  let current = null;

  beforeAll(async () => {
    await builder.addContentType(author).addContentType(article).build();

    strapi = await createStrapiInstance();

    [france, germany] = await Promise.all([
      strapi.db.query('plugin::spaces.space').create({
        data: { name: 'France', slug: 'fr-test', status: 'active', isDefault: true },
      }),
      strapi.db.query('plugin::spaces.space').create({
        data: { name: 'Germany', slug: 'de-test', status: 'active', isDefault: false },
      }),
    ]);

    // Stand in for the request scope: the plugin reads it from Koa's
    // request-local state, which there is none of here.
    scope = strapi.db.queryScopes.register('spaces-test', ({ meta }) => {
      const attribute = meta.attributes?.space;

      if (attribute?.target !== 'plugin::spaces.space' || current === null) {
        return null;
      }

      const column = attribute.joinColumn?.name ?? 'space_id';

      return { $or: [{ [column]: current }, { [column]: { $null: true } }] };
    });
  });

  afterAll(async () => {
    scope?.();
    await strapi.destroy();
    await builder.cleanup();
  });

  beforeEach(() => {
    current = null;
  });

  const create = async (uid, data, spaceId) =>
    strapi.db.query(uid).create({ data: { ...data, space: spaceId } });

  describe('the column exists even without the feature', () => {
    test('content types carry a space', () => {
      expect(strapi.contentType(ARTICLE_UID).attributes.space).toMatchObject({
        type: 'relation',
        target: 'plugin::spaces.space',
      });
    });

    test('the platform’s own records do not', () => {
      expect(strapi.contentType('admin::user').attributes.space).toBeUndefined();
      expect(strapi.contentType('admin::role').attributes.space).toBeUndefined();
    });

    test('media does', () => {
      expect(strapi.contentType('plugin::upload.file').attributes.space).toBeDefined();
    });
  });

  describe('through the document service', () => {
    let frenchDoc;

    beforeAll(async () => {
      current = null;

      frenchDoc = await create(ARTICLE_UID, { title: 'Bonjour', documentId: 'fr-doc' }, france.id);
      await create(ARTICLE_UID, { title: 'Guten Tag', documentId: 'de-doc' }, germany.id);
      await create(ARTICLE_UID, { title: 'Shared', documentId: 'shared-doc' }, null);
    });

    test('a list shows one space’s entries, and the shared ones', async () => {
      current = france.id;

      const results = await strapi.documents(ARTICLE_UID).findMany({ status: 'draft' });
      const titles = results.map((entry) => entry.title);

      expect(titles).toEqual(expect.arrayContaining(['Bonjour', 'Shared']));
      expect(titles).not.toContain('Guten Tag');
    });

    test('a document from another space is not found by id', async () => {
      current = france.id;

      const found = await strapi
        .documents(ARTICLE_UID)
        .findOne({ documentId: 'de-doc', status: 'draft' });

      expect(found).toBeNull();
    });

    test('and is found from its own space', async () => {
      current = germany.id;

      const found = await strapi
        .documents(ARTICLE_UID)
        .findOne({ documentId: 'de-doc', status: 'draft' });

      expect(found?.title).toBe('Guten Tag');
    });

    test('a count does not include the other space', async () => {
      current = germany.id;

      const results = await strapi.documents(ARTICLE_UID).findMany({ status: 'draft' });

      expect(results.map((entry) => entry.title).sort()).toEqual(['Guten Tag', 'Shared']);
    });

    test('an update cannot reach another space’s document', async () => {
      current = france.id;

      await strapi
        .documents(ARTICLE_UID)
        .update({ documentId: 'de-doc', data: { title: 'Stolen' }, status: 'draft' })
        .catch(() => null);

      current = null;
      const [german] = await strapi.db
        .query(ARTICLE_UID)
        .findMany({ where: { documentId: 'de-doc' } });

      expect(german.title).toBe('Guten Tag');
    });

    test('a delete cannot reach another space’s document', async () => {
      current = france.id;

      await strapi
        .documents(ARTICLE_UID)
        .delete({ documentId: 'de-doc', status: 'draft' })
        .catch(() => null);

      current = null;
      const remaining = await strapi.db
        .query(ARTICLE_UID)
        .findMany({ where: { documentId: 'de-doc' } });

      expect(remaining).toHaveLength(1);
    });

    test('filters cannot widen past the space', async () => {
      current = france.id;

      const results = await strapi.documents(ARTICLE_UID).findMany({
        filters: { $or: [{ title: 'Bonjour' }, { title: 'Guten Tag' }] },
        status: 'draft',
      });

      expect(results.map((entry) => entry.title)).toEqual(['Bonjour']);
      expect(frenchDoc.documentId).toBe('fr-doc');
    });
  });

  describe('populated relations', () => {
    beforeAll(async () => {
      // Unscoped while setting up: `create` reads the row back through the
      // query builder, so creating another space's row from inside a space
      // would hand back null.
      current = null;

      const germanAuthor = await create(
        AUTHOR_UID,
        { name: 'Anton', documentId: 'de-author' },
        germany.id
      );

      await strapi.db.query(ARTICLE_UID).create({
        data: {
          title: 'Crossed',
          documentId: 'crossed-doc',
          space: france.id,
          author: germanAuthor.id,
        },
      });
    });

    test('a relation into another space comes back empty rather than leaking', async () => {
      current = france.id;

      const found = await strapi.documents(ARTICLE_UID).findOne({
        documentId: 'crossed-doc',
        populate: ['author'],
        status: 'draft',
      });

      expect(found?.title).toBe('Crossed');
      expect(found?.author ?? null).toBeNull();
    });
  });

  describe('the install migration', () => {
    test('assigns rows that have no space, without losing the update', async () => {
      // A filter on the `space` relation joins `strapi_spaces`, and a
      // conditional update with a join is rewritten as a subquery that drops
      // the update's payload — so the backfill has to name the column.
      await create(ARTICLE_UID, { title: 'Orphan', documentId: 'orphan-doc' }, null);

      current = null;
      await strapi.db.query(ARTICLE_UID).updateMany({
        where: { space_id: null },
        data: { space: france.id },
      });

      const [row] = await strapi.db
        .query(ARTICLE_UID)
        .findMany({ where: { documentId: 'orphan-doc' }, populate: { space: true } });

      expect(row.space?.id).toBe(france.id);
    });
  });

  describe('media', () => {
    test('files are scoped like content', async () => {
      const file = await strapi.db.query('plugin::upload.file').create({
        data: {
          name: 'german.png',
          hash: 'german_hash',
          ext: '.png',
          mime: 'image/png',
          size: 1,
          url: '/uploads/german.png',
          provider: 'local',
          space: germany.id,
        },
      });

      expect(file.id).toBeDefined();

      current = france.id;
      const visible = await strapi.db
        .query('plugin::upload.file')
        .findMany({ where: { hash: 'german_hash' } });

      expect(visible).toHaveLength(0);

      current = germany.id;
      const own = await strapi.db
        .query('plugin::upload.file')
        .findMany({ where: { hash: 'german_hash' } });

      expect(own).toHaveLength(1);
    });
  });
});
