/**
 * CMS-278: stealing of relations.
 *
 * When connecting a oneToX bidirectional relation to a target that is already linked to another
 * entry, the link is moved to the new entry and the previous owner loses it.
 */
import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createContentAPIRequest } from 'api-tests/request';

let strapi;
let rq;

const authorModel = {
  singularName: 'author',
  pluralName: 'authors',
  displayName: 'Author',
  draftAndPublish: true,
  attributes: {
    name: { type: 'string' },
    // oneToOne <-> Article.author
    article: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'api::article.article',
      targetAttribute: 'author',
    },
    // oneToMany <-> Article.writer (manyToOne)
    articles: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::article.article',
      targetAttribute: 'writer',
    },
  },
};

const articleModel = {
  singularName: 'article',
  pluralName: 'articles',
  displayName: 'Article',
  draftAndPublish: true,
  attributes: {
    title: { type: 'string' },
  },
};

const populate = ['author', 'writer'];
const populateAuthor = ['article', 'articles'];

const create = async (pluralName: string, data: Record<string, unknown>) => {
  const { body, status } = await rq({
    method: 'POST',
    url: `/${pluralName}`,
    body: { data },
  });
  expect(status).toBe(201);
  return body.data;
};

const update = async (pluralName: string, documentId: string, data: Record<string, unknown>) => {
  const { body, status } = await rq({
    method: 'PUT',
    url: `/${pluralName}/${documentId}`,
    body: { data },
  });
  expect(status).toBe(200);
  return body.data;
};

// The content API has no publish action, so publish through the Document Service
const UIDS = {
  authors: 'api::author.author',
  articles: 'api::article.article',
} as const;

const publish = async (pluralName: keyof typeof UIDS, documentId: string) => {
  await strapi.documents(UIDS[pluralName]).publish({ documentId });
};

const get = async (
  pluralName: string,
  documentId: string,
  status: 'draft' | 'published' = 'draft'
) => {
  const { body, status: httpStatus } = await rq({
    method: 'GET',
    url: `/${pluralName}/${documentId}`,
    qs: {
      status,
      populate: pluralName === 'authors' ? populateAuthor : populate,
    },
  });
  expect(httpStatus).toBe(200);
  return body.data;
};

const docIds = (items: Array<{ documentId: string }> | undefined) =>
  (items ?? []).map((i) => i.documentId).sort();

describe('Relations stealing (CMS-278)', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder.addContentTypes([articleModel, authorModel]).build();
    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('oneToOne (Article.author <-> Author.article)', () => {
    test('creating Article B with the same author steals the link from Article A', async () => {
      const authorX = await create('authors', { name: 'X' });
      const articleA = await create('articles', {
        title: 'A',
        author: { connect: [authorX.documentId] },
      });

      // sanity: A owns X before the steal
      expect((await get('articles', articleA.documentId)).author?.documentId).toBe(
        authorX.documentId
      );

      const articleB = await create('articles', {
        title: 'B',
        author: { connect: [authorX.documentId] },
      });

      const fetchedA = await get('articles', articleA.documentId);
      const fetchedB = await get('articles', articleB.documentId);
      const fetchedX = await get('authors', authorX.documentId);

      expect(fetchedA.author).toBeNull();
      expect(fetchedB.author?.documentId).toBe(authorX.documentId);
      expect(fetchedX.article?.documentId).toBe(articleB.documentId);
    });

    test('updating Article B to connect an author already owned by Article A steals it', async () => {
      const authorX = await create('authors', { name: 'X' });
      const articleA = await create('articles', {
        title: 'A',
        author: { connect: [authorX.documentId] },
      });
      const articleB = await create('articles', { title: 'B' });

      await update('articles', articleB.documentId, {
        author: { connect: [authorX.documentId] },
      });

      expect((await get('articles', articleA.documentId)).author).toBeNull();
      expect((await get('articles', articleB.documentId)).author?.documentId).toBe(
        authorX.documentId
      );
      expect((await get('authors', authorX.documentId)).article?.documentId).toBe(
        articleB.documentId
      );
    });

    test('updating Article B with the shorthand syntax steals the link too', async () => {
      const authorX = await create('authors', { name: 'X' });
      const articleA = await create('articles', {
        title: 'A',
        author: authorX.documentId,
      });
      const articleB = await create('articles', { title: 'B' });

      await update('articles', articleB.documentId, { author: authorX.documentId });

      expect((await get('articles', articleA.documentId)).author).toBeNull();
      expect((await get('articles', articleB.documentId)).author?.documentId).toBe(
        authorX.documentId
      );
      expect((await get('authors', authorX.documentId)).article?.documentId).toBe(
        articleB.documentId
      );
    });

    test('steals from the inverse side: updating Author X to point at Article B', async () => {
      const authorX = await create('authors', { name: 'X' });
      const articleA = await create('articles', {
        title: 'A',
        author: { connect: [authorX.documentId] },
      });
      const articleB = await create('articles', { title: 'B' });

      await update('authors', authorX.documentId, {
        article: { connect: [articleB.documentId] },
      });

      expect((await get('articles', articleA.documentId)).author).toBeNull();
      expect((await get('articles', articleB.documentId)).author?.documentId).toBe(
        authorX.documentId
      );
      expect((await get('authors', authorX.documentId)).article?.documentId).toBe(
        articleB.documentId
      );
    });

    test('steals from the inverse side: creating Author Y pointing at an already owned Article', async () => {
      const authorX = await create('authors', { name: 'X' });
      const articleA = await create('articles', {
        title: 'A',
        author: { connect: [authorX.documentId] },
      });

      const authorY = await create('authors', {
        name: 'Y',
        article: { connect: [articleA.documentId] },
      });

      expect((await get('authors', authorX.documentId)).article).toBeNull();
      expect((await get('authors', authorY.documentId)).article?.documentId).toBe(
        articleA.documentId
      );
      expect((await get('articles', articleA.documentId)).author?.documentId).toBe(
        authorY.documentId
      );
    });

    test('after publishing, published versions reflect the stolen state', async () => {
      const authorX = await create('authors', { name: 'X' });
      const articleA = await create('articles', {
        title: 'A',
        author: { connect: [authorX.documentId] },
      });

      // publish everything while A still owns X
      await publish('authors', authorX.documentId);
      await publish('articles', articleA.documentId);
      expect((await get('articles', articleA.documentId, 'published')).author?.documentId).toBe(
        authorX.documentId
      );

      const articleB = await create('articles', {
        title: 'B',
        author: { connect: [authorX.documentId] },
      });

      // drafts reflect the steal immediately
      expect((await get('articles', articleA.documentId, 'draft')).author).toBeNull();
      expect((await get('articles', articleB.documentId, 'draft')).author?.documentId).toBe(
        authorX.documentId
      );

      // publish the new owner and the previous owner
      await publish('articles', articleB.documentId);
      await publish('articles', articleA.documentId);
      await publish('authors', authorX.documentId);

      expect((await get('articles', articleA.documentId, 'published')).author).toBeNull();
      expect((await get('articles', articleB.documentId, 'published')).author?.documentId).toBe(
        authorX.documentId
      );
      expect((await get('authors', authorX.documentId, 'published')).article?.documentId).toBe(
        articleB.documentId
      );
    });
  });

  describe('oneToMany <-> manyToOne (Author.articles <-> Article.writer)', () => {
    const setup = async () => {
      const author1 = await create('authors', { name: 'Author 1' });
      const author2 = await create('authors', { name: 'Author 2' });
      const a1 = await create('articles', { title: 'a1' });
      const a2 = await create('articles', { title: 'a2' });
      const a3 = await create('articles', { title: 'a3' });

      await update('authors', author1.documentId, {
        articles: { connect: [a1.documentId, a2.documentId] },
      });
      await update('authors', author2.documentId, {
        articles: { connect: [a3.documentId] },
      });

      return { author1, author2, a1, a2, a3 };
    };

    test('oneToMany side: connecting an owned article to Author 2 removes it from Author 1', async () => {
      const { author1, author2, a1, a2, a3 } = await setup();

      expect(docIds((await get('authors', author1.documentId)).articles)).toEqual(
        [a1.documentId, a2.documentId].sort()
      );

      await update('authors', author2.documentId, {
        articles: { connect: [a1.documentId] },
      });

      const fetched1 = await get('authors', author1.documentId);
      const fetched2 = await get('authors', author2.documentId);

      // Author 1 keeps only its other article
      expect(docIds(fetched1.articles)).toEqual([a2.documentId]);
      // Author 2 has its original article and the stolen one
      expect(docIds(fetched2.articles)).toEqual([a1.documentId, a3.documentId].sort());

      // inverse side
      expect((await get('articles', a1.documentId)).writer?.documentId).toBe(author2.documentId);
      expect((await get('articles', a2.documentId)).writer?.documentId).toBe(author1.documentId);
      expect((await get('articles', a3.documentId)).writer?.documentId).toBe(author2.documentId);
    });

    test('manyToOne side: setting Article.writer to Author 2 removes it from Author 1', async () => {
      const { author1, author2, a1, a2, a3 } = await setup();

      await update('articles', a1.documentId, {
        writer: { connect: [author2.documentId] },
      });

      expect((await get('articles', a1.documentId)).writer?.documentId).toBe(author2.documentId);
      expect(docIds((await get('authors', author1.documentId)).articles)).toEqual([a2.documentId]);
      expect(docIds((await get('authors', author2.documentId)).articles)).toEqual(
        [a1.documentId, a3.documentId].sort()
      );
    });

    test('creating an article with writer = Author 2 does not affect other owners', async () => {
      const { author1, author2, a1, a2, a3 } = await setup();

      const a4 = await create('articles', {
        title: 'a4',
        writer: { connect: [author2.documentId] },
      });

      expect(docIds((await get('authors', author1.documentId)).articles)).toEqual(
        [a1.documentId, a2.documentId].sort()
      );
      expect(docIds((await get('authors', author2.documentId)).articles)).toEqual(
        [a3.documentId, a4.documentId].sort()
      );
    });

    test('after publishing, published versions reflect the stolen state', async () => {
      const { author1, author2, a1, a2, a3 } = await setup();

      for (const id of [a1, a2, a3]) {
        await publish('articles', id.documentId);
      }
      await publish('authors', author1.documentId);
      await publish('authors', author2.documentId);

      expect(docIds((await get('authors', author1.documentId, 'published')).articles)).toEqual(
        [a1.documentId, a2.documentId].sort()
      );

      await update('authors', author2.documentId, {
        articles: { connect: [a1.documentId] },
      });

      // drafts are updated immediately
      expect(docIds((await get('authors', author1.documentId, 'draft')).articles)).toEqual([
        a2.documentId,
      ]);

      await publish('authors', author1.documentId);
      await publish('authors', author2.documentId);
      await publish('articles', a1.documentId);

      expect(docIds((await get('authors', author1.documentId, 'published')).articles)).toEqual([
        a2.documentId,
      ]);
      expect(docIds((await get('authors', author2.documentId, 'published')).articles)).toEqual(
        [a1.documentId, a3.documentId].sort()
      );
      expect((await get('articles', a1.documentId, 'published')).writer?.documentId).toBe(
        author2.documentId
      );
    });
  });
});
