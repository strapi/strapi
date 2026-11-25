import path from 'node:path';

import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import {
  documents,
  queryDb,
  runInServer,
  scaffoldComponent,
  scaffoldContentType,
  scaffoldDependency,
  scaffoldServerScript,
  stopAllServers,
} from '@strapi/tests-shared';
import type { UID } from '@strapi/types';

import {
  createClient,
  createContentAPIClient,
  setupApp,
  SUPER_ADMIN,
  type Client,
  type TestApp,
} from '../../helpers';

const AUTHOR_UID: UID.ContentType = 'api::qs-author.qs-author';
const ARTICLE_UID: UID.ContentType = 'api::qs-article.qs-article';
const POST_UID: UID.ContentType = 'api::qs-post.qs-post';
const SEO_UID: UID.Component = 'default.qsseo';

type Row = Record<string, any>;

const titles = (entries: Array<{ title: string }>) => entries.map((entry) => entry.title).sort();

describe('Query scopes', () => {
  let ctx: TestApp;
  let rq: Client;
  let graphqlRq: Client;
  const ids: Record<string, string> = {};
  let authorB: string;

  const run = <T = unknown>(action: string, args?: Record<string, unknown>) =>
    runInServer<T>(ctx.server, 'query-scopes', action, args);

  // Reads past the scope, to prove a hidden row is still there and unchanged
  const rawArticle = async (title: string) =>
    (await run<Row | null>('rawArticle', { title })) ?? undefined;
  const rawAuthor = async (name: string) =>
    (await run<Row | null>('rawAuthor', { name })) ?? undefined;

  beforeAll(async () => {
    ctx = await setupApp({
      name: 'db-query-scopes',
      scaffold(app) {
        scaffoldDependency(app, '@strapi/plugin-graphql');
        scaffoldComponent(app, {
          uid: SEO_UID,
          displayName: 'qsseo',
          attributes: { metaTitle: { type: 'string' } },
        });
        scaffoldContentType(app, {
          displayName: 'qs-author',
          singularName: 'qs-author',
          pluralName: 'qs-authors',
          attributes: {
            name: { type: 'string' },
            deletedAt: { type: 'datetime' },
            // The inverse side the old builder added for the article's `targetAttribute`
            articles: {
              type: 'relation',
              relation: 'oneToMany',
              target: ARTICLE_UID,
              mappedBy: 'author',
            },
          },
        });
        scaffoldContentType(app, {
          displayName: 'qs-article',
          singularName: 'qs-article',
          pluralName: 'qs-articles',
          attributes: {
            title: { type: 'string' },
            views: { type: 'integer' },
            deletedAt: { type: 'datetime' },
            author: {
              type: 'relation',
              relation: 'manyToOne',
              target: AUTHOR_UID,
              inversedBy: 'articles',
            },
          },
        });
        scaffoldContentType(app, {
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
        });
        scaffoldServerScript(app, path.join(__dirname, 'server/query-scopes.js'));
      },
      seed: { adminUsers: [SUPER_ADMIN], apiTokens: [{ name: 'full', type: 'full-access' }] },
    });

    const token = ctx.seeded.apiTokens[0].accessKey;
    rq = createContentAPIClient(ctx.server, { token });
    graphqlRq = createClient(ctx.server, { token });

    const deletedAt = new Date().toISOString();
    const create = (uid: UID.ContentType, data: Row) =>
      documents<Row>(ctx.server, uid, 'create', { data });

    const b = await create(AUTHOR_UID, { name: 'B' });
    const c = await create(AUTHOR_UID, { name: 'C', deletedAt });
    const d = await create(AUTHOR_UID, { name: 'D' });

    for (const [title, author, hidden] of [
      ['visible-b', b, false],
      ['visible-c', c, false],
      ['visible-d', d, false],
      ['hidden', b, true],
    ] as const) {
      const article = await create(ARTICLE_UID, {
        title,
        author: author.documentId,
        deletedAt: hidden ? deletedAt : null,
      });
      ids[title] = article.documentId;
    }
    authorB = b.documentId;

    // Positive control: without the scope, visible-c links to the author the scope hides
    const linked = await documents<Row | null>(ctx.server, ARTICLE_UID, 'findOne', {
      documentId: ids['visible-c'],
      populate: ['author'],
    });
    expect(linked?.author?.name).toBe('C');

    // Seed first: the scope also hides the rows that a create reads back
    await run('registerSoftDelete');
  });

  afterAll(stopAllServers);

  describe('reads', () => {
    test('list', async () => {
      const res = await rq.get('/qs-articles');

      expect(res.status).toBe(200);
      expect(titles(res.body.data)).toEqual(['visible-b', 'visible-c', 'visible-d']);
      expect(res.body.meta.pagination.total).toBe(3);
    });

    test('find one', async () => {
      const res = await rq.get(`/qs-articles/${ids.hidden}`);

      expect(res.status).toBe(404);
    });

    test('count', async () => {
      expect(await queryDb(ctx.server, ARTICLE_UID, 'count')).toBe(3);
    });

    test('populate a hidden target', async () => {
      const res = await rq.get(`/qs-articles/${ids['visible-c']}`, {
        query: { populate: 'author' },
      });

      const visible = await rq.get(`/qs-articles/${ids['visible-b']}`, {
        query: { populate: 'author' },
      });

      expect(res.status).toBe(200);
      expect(res.body.data.author).toBeNull();
      expect(visible.status).toBe(200);
      expect(visible.body.data.author.name).toBe('B');
    });

    test('populate a list with a hidden row', async () => {
      const res = await rq.get(`/qs-authors/${authorB}`, { query: { populate: 'articles' } });

      expect(res.status).toBe(200);
      expect(titles(res.body.data.articles)).toEqual(['visible-b']);
    });

    test('relation filter', async () => {
      const byHidden = await rq.get('/qs-articles', {
        query: { filters: { author: { name: 'C' } } },
      });
      const byVisible = await rq.get('/qs-articles', {
        query: { filters: { author: { name: 'B' } } },
      });

      expect(byHidden.status).toBe(200);
      expect(byVisible.status).toBe(200);
      expect(byHidden.body.data).toEqual([]);
      expect(titles(byVisible.body.data)).toEqual(['visible-b']);
    });

    test('relation sort', async () => {
      const res = await rq.get('/qs-articles', { query: { sort: 'author.name:asc' } });
      expect(res.status).toBe(200);

      const sorted: string[] = res.body.data.map((entry: { title: string }) => entry.title);

      expect(sorted).toHaveLength(3);
      // The hidden author sorts as NULL, first or last by dialect, never between B and D
      expect(sorted.indexOf('visible-d') - sorted.indexOf('visible-b')).toBe(1);
    });

    test('GraphQL query', async () => {
      const res = await graphqlRq.post('/graphql', {
        body: { query: '{ qsArticles { title author { name } } }' },
      });

      const authorOf = (title: string) =>
        res.body.data.qsArticles.find((a: { title: string }) => a.title === title).author;

      expect(res.status).toBe(200);
      expect(res.body.errors).toBeUndefined();
      expect(titles(res.body.data.qsArticles)).toEqual(['visible-b', 'visible-c', 'visible-d']);
      expect(authorOf('visible-c')).toBeNull();
      expect(authorOf('visible-b')).toEqual({ name: 'B' });
    });
  });

  // These run in order and change the seeded rows
  describe('writes', () => {
    const updateMany = (uid: UID.ContentType, params: Row) =>
      queryDb<{ count: number }>(ctx.server, uid, 'updateMany', params);
    const deleteMany = (uid: UID.ContentType, params: Row) =>
      queryDb<{ count: number }>(ctx.server, uid, 'deleteMany', params);

    test('updateMany leaves hidden rows unchanged', async () => {
      const { count } = await updateMany(ARTICLE_UID, { data: { views: 1 } });

      expect(count).toBe(3);
      expect((await rawArticle('hidden'))!.views).toBeNull();
    });

    test('updateMany with a join updates only the visible match', async () => {
      const { count } = await updateMany(ARTICLE_UID, {
        where: { author: { name: 'B' } },
        data: { views: 2 },
      });

      expect(count).toBe(1);
      expect((await rawArticle('visible-b'))!.views).toBe(2);
      expect((await rawArticle('hidden'))!.views).toBeNull();
    });

    test('updateMany through a hidden row updates nothing', async () => {
      const { count } = await updateMany(ARTICLE_UID, {
        where: { author: { name: 'C' } },
        data: { views: 3 },
      });

      expect(count).toBe(0);
      expect((await rawArticle('visible-c'))!.views).toBe(1);
    });

    // The join reads the author with type select, so a scope on update does not hide D there
    test('a relation filter in a write matches a row that only update hides', async () => {
      const { authors, articles } = await run<{
        authors: { count: number };
        articles: { count: number };
      }>('relationFilterInWriteWithUpdateScope');

      expect(authors.count).toBe(0);
      expect(articles.count).toBe(1);
      expect((await rawArticle('visible-d'))!.views).toBe(4);
    });

    // B links to visible-b and hidden: scoping only the target join would see a NULL article
    test('deleteMany through a to-many link to a hidden row deletes nothing', async () => {
      const { count } = await deleteMany(AUTHOR_UID, {
        where: { articles: { id: { $null: true } } },
      });

      expect(count).toBe(0);
      expect(await rawAuthor('B')).toBeDefined();
    });

    test('deleteMany of a hidden row deletes nothing', async () => {
      const { count } = await deleteMany(ARTICLE_UID, { where: { title: 'hidden' } });

      expect(count).toBe(0);
      expect(await rawArticle('hidden')).toBeDefined();
    });

    test('deleteMany through a hidden row deletes nothing', async () => {
      const { count } = await deleteMany(ARTICLE_UID, { where: { author: { name: 'C' } } });

      expect(count).toBe(0);
      expect(await rawArticle('visible-c')).toBeDefined();
    });

    test('deleteMany with a join deletes only the visible match', async () => {
      const { count } = await deleteMany(ARTICLE_UID, { where: { author: { name: 'B' } } });

      expect(count).toBe(1);
      expect(await rawArticle('visible-b')).toBeUndefined();
      expect(await rawArticle('hidden')).toBeDefined();
    });
  });

  // The entity manager writes links and components even when the scoped row write matches no
  // row. The owner guard throws first, so the transaction rolls all of it back
  describe('owner guard for writes that the scope hides', () => {
    const postIds: Record<string, string> = {};

    const posts = (method: Parameters<typeof documents>[2], params: Row) =>
      documents<Row | null>(ctx.server, POST_UID, method, params);

    const rawPostTables = () => run<Row[][]>('rawPostTables');

    beforeAll(async () => {
      for (const team of ['own', 'shared']) {
        const post = await posts('create', {
          data: { title: team, team, seo: { metaTitle: team }, author: authorB },
        });
        await posts('publish', { documentId: post!.documentId });
        postIds[team] = post!.documentId;
      }

      // Reads see own and shared posts, writes change only own posts
      await run('installOwnerGuard');
    });

    afterAll(async () => {
      await run('removeOwnerGuard');
    });

    test.each([
      [
        'update',
        () =>
          posts('update', {
            documentId: postIds.shared,
            data: { title: 'changed', seo: { metaTitle: 'changed' }, author: null },
          }),
      ],
      ['delete', () => posts('delete', { documentId: postIds.shared })],
      ['unpublish', () => posts('unpublish', { documentId: postIds.shared })],
    ])('%s of a shared post throws and changes nothing', async (_, write) => {
      // Positive control: the shared post has the author link and the component that must survive
      const shared = await posts('findOne', {
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
      const updated = await posts('update', {
        documentId: postIds.own,
        data: { title: 'changed' },
      });

      expect(updated?.title).toBe('changed');
    });
  });
});
