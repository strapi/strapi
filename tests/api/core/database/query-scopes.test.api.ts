import type { Core } from '@strapi/types';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest, createContentAPIRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';

const AUTHOR_UID = 'api::qs-author.qs-author';
const ARTICLE_UID = 'api::qs-article.qs-article';

const authorModel = {
  kind: 'collectionType',
  displayName: 'qs-author',
  singularName: 'qs-author',
  pluralName: 'qs-authors',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
    deletedAt: { type: 'datetime' },
  },
};

const articleModel = {
  kind: 'collectionType',
  displayName: 'qs-article',
  singularName: 'qs-article',
  pluralName: 'qs-articles',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string' },
    views: { type: 'integer' },
    deletedAt: { type: 'datetime' },
    author: {
      type: 'relation',
      relation: 'manyToOne',
      target: AUTHOR_UID,
      // The builder adds the inverse `articles` attribute to the author
      targetAttribute: 'articles',
    },
  },
};

const POST_UID = 'api::qs-post.qs-post';
const SEO_UID = 'default.qsseo';

const seoComponent = {
  displayName: 'qsseo',
  attributes: { metaTitle: { type: 'string' } },
};

const postModel = {
  kind: 'collectionType',
  displayName: 'qs-post',
  singularName: 'qs-post',
  pluralName: 'qs-posts',
  draftAndPublish: true,
  attributes: {
    title: { type: 'string' },
    team: { type: 'string' },
    seo: { type: 'component', component: SEO_UID, repeatable: false },
    author: { type: 'relation', relation: 'manyToOne', target: AUTHOR_UID },
  },
};

// `deleted_at` is not an attribute key, so the scope filters the raw column with no join
const softDelete = {
  where: ({ uid }: { uid: string }) =>
    uid === AUTHOR_UID || uid === ARTICLE_UID ? { deleted_at: null } : null,
};

const titles = (entries: Array<{ title: string }>) => entries.map((entry) => entry.title).sort();

describe('Query scopes', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;
  let rq: ReturnType<typeof createContentAPIRequest>;
  let adminRq: Awaited<ReturnType<typeof createAuthRequest>>;
  let unregister: () => void;
  const ids: Record<string, string> = {};
  let authorB: string;

  // Reads past the scope, to prove a hidden row is still there and unchanged
  const rawArticle = (title: string) =>
    strapi.db.connection(strapi.db.metadata.get(ARTICLE_UID).tableName).where({ title }).first();
  const rawAuthor = (name: string) =>
    strapi.db.connection(strapi.db.metadata.get(AUTHOR_UID).tableName).where({ name }).first();

  beforeAll(async () => {
    await builder
      .addComponent(seoComponent)
      .addContentType(authorModel)
      .addContentType(articleModel)
      .addContentType(postModel)
      .build();

    strapi = await createStrapiInstance();
    rq = createContentAPIRequest({ strapi });
    adminRq = await createAuthRequest({ strapi });

    const deletedAt = new Date();
    const authors = strapi.documents(AUTHOR_UID);
    const articles = strapi.documents(ARTICLE_UID);

    const b = await authors.create({ data: { name: 'B' } });
    const c = await authors.create({ data: { name: 'C', deletedAt } });
    const d = await authors.create({ data: { name: 'D' } });

    for (const [title, author, hidden] of [
      ['visible-b', b, false],
      ['visible-c', c, false],
      ['visible-d', d, false],
      ['hidden', b, true],
    ] as const) {
      const article = await articles.create({
        data: { title, author: author.documentId, deletedAt: hidden ? deletedAt : null },
      });
      ids[title] = article.documentId;
    }
    authorB = b.documentId;

    // Positive control: without the scope, visible-c links to the author the scope hides
    const linked = await articles.findOne({ documentId: ids['visible-c'], populate: ['author'] });
    expect(linked?.author?.name).toBe('C');

    // Seed first: the scope also hides the rows that a create reads back
    unregister = strapi.db.unstable_scopes.register(softDelete);
  });

  afterAll(async () => {
    unregister?.();
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('reads', () => {
    test('list', async () => {
      const res = await rq({ method: 'GET', url: '/qs-articles' });

      expect(res.statusCode).toBe(200);
      expect(titles(res.body.data)).toEqual(['visible-b', 'visible-c', 'visible-d']);
      expect(res.body.meta.pagination.total).toBe(3);
    });

    test('find one', async () => {
      const res = await rq({ method: 'GET', url: `/qs-articles/${ids.hidden}` });

      expect(res.statusCode).toBe(404);
    });

    test('count', async () => {
      expect(await strapi.db.query(ARTICLE_UID).count()).toBe(3);
    });

    test('populate a hidden target', async () => {
      const res = await rq({
        method: 'GET',
        url: `/qs-articles/${ids['visible-c']}`,
        qs: { populate: 'author' },
      });

      const visible = await rq({
        method: 'GET',
        url: `/qs-articles/${ids['visible-b']}`,
        qs: { populate: 'author' },
      });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.author).toBeNull();
      expect(visible.statusCode).toBe(200);
      expect(visible.body.data.author.name).toBe('B');
    });

    test('populate a list with a hidden row', async () => {
      const res = await rq({
        method: 'GET',
        url: `/qs-authors/${authorB}`,
        qs: { populate: 'articles' },
      });

      expect(res.statusCode).toBe(200);
      expect(titles(res.body.data.articles)).toEqual(['visible-b']);
    });

    test('relation filter', async () => {
      const byHidden = await rq({
        method: 'GET',
        url: '/qs-articles',
        qs: { filters: { author: { name: 'C' } } },
      });
      const byVisible = await rq({
        method: 'GET',
        url: '/qs-articles',
        qs: { filters: { author: { name: 'B' } } },
      });

      expect(byHidden.statusCode).toBe(200);
      expect(byVisible.statusCode).toBe(200);
      expect(byHidden.body.data).toEqual([]);
      expect(titles(byVisible.body.data)).toEqual(['visible-b']);
    });

    test('relation sort', async () => {
      const res = await rq({ method: 'GET', url: '/qs-articles', qs: { sort: 'author.name:asc' } });
      expect(res.statusCode).toBe(200);

      const sorted: string[] = res.body.data.map((entry: { title: string }) => entry.title);

      expect(sorted).toHaveLength(3);
      // The hidden author sorts as NULL, first or last by dialect, never between B and D
      expect(sorted.indexOf('visible-d') - sorted.indexOf('visible-b')).toBe(1);
    });

    test('GraphQL query', async () => {
      const res = await adminRq({
        url: '/graphql',
        method: 'POST',
        body: { query: '{ qsArticles { title author { name } } }' },
      });

      const authorOf = (title: string) =>
        res.body.data.qsArticles.find((a: { title: string }) => a.title === title).author;

      expect(res.statusCode).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(titles(res.body.data.qsArticles)).toEqual(['visible-b', 'visible-c', 'visible-d']);
      expect(authorOf('visible-c')).toBeNull();
      expect(authorOf('visible-b')).toEqual({ name: 'B' });
    });
  });

  // These run in order and change the seeded rows
  describe('writes', () => {
    test('updateMany leaves hidden rows unchanged', async () => {
      const { count } = await strapi.db.query(ARTICLE_UID).updateMany({ data: { views: 1 } });

      expect(count).toBe(3);
      expect((await rawArticle('hidden')).views).toBeNull();
    });

    test('updateMany with a join updates only the visible match', async () => {
      const { count } = await strapi.db
        .query(ARTICLE_UID)
        .updateMany({ where: { author: { name: 'B' } }, data: { views: 2 } });

      expect(count).toBe(1);
      expect((await rawArticle('visible-b')).views).toBe(2);
      expect((await rawArticle('hidden')).views).toBeNull();
    });

    test('updateMany through a hidden row updates nothing', async () => {
      const { count } = await strapi.db
        .query(ARTICLE_UID)
        .updateMany({ where: { author: { name: 'C' } }, data: { views: 3 } });

      expect(count).toBe(0);
      expect((await rawArticle('visible-c')).views).toBe(1);
    });

    // The join reads the author with type select, so a scope on update does not hide D there
    test('a relation filter in a write matches a row that only update hides', async () => {
      const unregisterD = strapi.db.unstable_scopes.register({
        where: ({ uid, type }) =>
          uid === AUTHOR_UID && type === 'update' ? { name: { $ne: 'D' } } : null,
      });

      try {
        // Positive control: the scope hides D from an update of the author table
        const authors = await strapi.db
          .query(AUTHOR_UID)
          .updateMany({ where: { name: 'D' }, data: { name: 'D' } });
        const articles = await strapi.db
          .query(ARTICLE_UID)
          .updateMany({ where: { author: { name: 'D' } }, data: { views: 4 } });

        expect(authors.count).toBe(0);
        expect(articles.count).toBe(1);
        expect((await rawArticle('visible-d')).views).toBe(4);
      } finally {
        unregisterD();
      }
    });

    // B links to visible-b and hidden: scoping only the target join would see a NULL article
    test('deleteMany through a to-many link to a hidden row deletes nothing', async () => {
      const { count } = await strapi.db
        .query(AUTHOR_UID)
        .deleteMany({ where: { articles: { id: { $null: true } } } });

      expect(count).toBe(0);
      expect(await rawAuthor('B')).toBeDefined();
    });

    test('deleteMany of a hidden row deletes nothing', async () => {
      const { count } = await strapi.db
        .query(ARTICLE_UID)
        .deleteMany({ where: { title: 'hidden' } });

      expect(count).toBe(0);
      expect(await rawArticle('hidden')).toBeDefined();
    });

    test('deleteMany through a hidden row deletes nothing', async () => {
      const { count } = await strapi.db
        .query(ARTICLE_UID)
        .deleteMany({ where: { author: { name: 'C' } } });

      expect(count).toBe(0);
      expect(await rawArticle('visible-c')).toBeDefined();
    });

    test('deleteMany with a join deletes only the visible match', async () => {
      const { count } = await strapi.db
        .query(ARTICLE_UID)
        .deleteMany({ where: { author: { name: 'B' } } });

      expect(count).toBe(1);
      expect(await rawArticle('visible-b')).toBeUndefined();
      expect(await rawArticle('hidden')).toBeDefined();
    });
  });

  // The entity manager writes links and components even when the scoped row write matches no
  // row. The owner guard throws first, so the transaction rolls all of it back
  describe('owner guard for writes that the scope hides', () => {
    const posts = () => strapi.documents(POST_UID);
    const postIds: Record<string, string> = {};
    let unregisterTeam: () => void;
    let unsubscribe: () => void;

    const assertWritable = async (where: unknown) => {
      const writable = await strapi.db
        .query(POST_UID)
        .count({ where: { $and: [where, { team: 'own' }] } });

      if (writable === 0) {
        throw new Error('The post is not writable');
      }
    };

    const joinTable = (uid: string, name: string) => {
      const attribute = strapi.db.metadata.get(uid).attributes[name];
      return 'joinTable' in attribute && attribute.joinTable ? attribute.joinTable.name : name;
    };

    // Reads past the scope: the post rows, the author links, the component links and rows
    const rawPostTables = () =>
      Promise.all(
        [
          strapi.db.metadata.get(POST_UID).tableName,
          joinTable(POST_UID, 'author'),
          joinTable(POST_UID, 'seo'),
          strapi.db.metadata.get(SEO_UID).tableName,
        ].map((table) => strapi.db.connection(table).orderBy('id'))
      );

    beforeAll(async () => {
      for (const team of ['own', 'shared']) {
        const post = await posts().create({
          data: { title: team, team, seo: { metaTitle: team }, author: authorB },
        });
        await posts().publish({ documentId: post.documentId });
        postIds[team] = post.documentId;
      }

      // Reads see own and shared posts, writes change only own posts
      unregisterTeam = strapi.db.unstable_scopes.register({
        where: ({ uid, type }) => {
          if (uid !== POST_UID) {
            return null;
          }

          return type === 'select' || type === 'count'
            ? { team: { $in: ['own', 'shared'] } }
            : { team: 'own' };
        },
      });
      unsubscribe = strapi.db.lifecycles.subscribe({
        models: [POST_UID],
        async beforeUpdate(event) {
          await assertWritable(event.params.where);
        },
        async beforeDelete(event) {
          await assertWritable(event.params.where);
        },
      });
    });

    afterAll(() => {
      unsubscribe?.();
      unregisterTeam?.();
    });

    test.each([
      [
        'update',
        () =>
          posts().update({
            documentId: postIds.shared,
            data: { title: 'changed', seo: { metaTitle: 'changed' }, author: null },
          }),
      ],
      ['delete', () => posts().delete({ documentId: postIds.shared })],
      ['unpublish', () => posts().unpublish({ documentId: postIds.shared })],
    ])('%s of a shared post throws and changes nothing', async (_, write) => {
      // Positive control: the shared post has the author link and the component that must survive
      const shared = await posts().findOne({
        documentId: postIds.shared,
        populate: ['seo', 'author'],
      });
      expect([shared?.author?.name, shared?.seo?.metaTitle]).toEqual(['B', 'shared']);
      const before = await rawPostTables();

      await expect(write()).rejects.toThrow('not writable');
      expect(await rawPostTables()).toEqual(before);
    });

    // Positive control: the guard lets writes to own posts through
    test('update of an own post changes it', async () => {
      const updated = await posts().update({ documentId: postIds.own, data: { title: 'changed' } });

      expect(updated?.title).toBe('changed');
    });
  });
});
