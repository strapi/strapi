/**
 * Bidirectional relations need their order preserved across unpublish/republish cycles.
 *
 * When an entry is unpublished and then republished, the relation order from the
 * perspective of related entries should be maintained (not appended to the end).
 */
import type { Core } from '@strapi/types';
import { testInTransaction } from '../../../../utils';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');

let strapi: Core.Strapi;
const builder = createTestBuilder();

const ARTICLE_UID = 'api::article.article';
const AUTHOR_UID = 'api::author.author';

const articleModel = {
  attributes: {
    title: {
      type: 'string',
    },
  },
  draftAndPublish: true,
  displayName: 'Article',
  singularName: 'article',
  pluralName: 'articles',
  description: '',
  collectionName: '',
};

const authorModel = {
  attributes: {
    name: {
      type: 'string',
    },
    articles: {
      type: 'relation',
      relation: 'manyToMany',
      target: ARTICLE_UID,
      targetAttribute: 'authors',
    },
  },
  draftAndPublish: true,
  displayName: 'Author',
  singularName: 'author',
  pluralName: 'authors',
  description: '',
  collectionName: '',
};

describe('Document Service bidirectional relations', () => {
  beforeAll(async () => {
    await builder.addContentTypes([articleModel, authorModel]).build();

    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  testInTransaction(
    'Relation order is preserved after unpublish and republish of a related entry',
    async () => {
      // Create authors out of alphabetical order so correct ordering is not an accident of id sort
      const authorC = await strapi.documents(AUTHOR_UID).create({
        data: { name: 'Author C' },
      });
      const authorA = await strapi.documents(AUTHOR_UID).create({
        data: { name: 'Author A' },
      });
      const authorB = await strapi.documents(AUTHOR_UID).create({
        data: { name: 'Author B' },
      });

      // Step 2: Create Article with relations to all three authors in order (not creation order)
      const article = await strapi.documents(ARTICLE_UID).create({
        data: {
          title: 'Test Article',
          authors: [
            { documentId: authorA.documentId },
            { documentId: authorB.documentId },
            { documentId: authorC.documentId },
          ],
        },
      });

      // Step 3: Publish everything (authors in non-alphabetical publish order, then article)
      await strapi.documents(AUTHOR_UID).publish({ documentId: authorC.documentId });
      await strapi.documents(AUTHOR_UID).publish({ documentId: authorA.documentId });
      await strapi.documents(AUTHOR_UID).publish({ documentId: authorB.documentId });
      await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

      // Step 4: Verify Article published shows A, B, C in order
      let publishedArticle = await strapi.documents(ARTICLE_UID).findFirst({
        filters: { title: 'Test Article' },
        populate: { authors: true },
        status: 'published',
      });

      expect(publishedArticle?.authors).toHaveLength(3);
      expect(publishedArticle?.authors?.map((a: any) => a.name)).toEqual([
        'Author A',
        'Author B',
        'Author C',
      ]);

      // Step 5: Unpublish Author B
      await strapi.documents(AUTHOR_UID).unpublish({ documentId: authorB.documentId });

      // Step 6: Republish Author B
      await strapi.documents(AUTHOR_UID).publish({ documentId: authorB.documentId });

      // Step 7: Verify Article published relations still show A, B, C in correct order
      publishedArticle = await strapi.documents(ARTICLE_UID).findFirst({
        filters: { title: 'Test Article' },
        populate: { authors: true },
        status: 'published',
      });

      expect(publishedArticle?.authors).toHaveLength(3);
      expect(publishedArticle?.authors?.map((a: any) => a.name)).toEqual([
        'Author A',
        'Author B',
        'Author C',
      ]);
    }
  );

  /**
   * Publishing articles and authors in an interleaved order must preserve join-table order for
   * `author.articles` when draft data is already correct (related authors may still be draft
   * when some articles publish first).
   */
  testInTransaction(
    'interleaved article/author publishes: author-side article order should match draft',
    async () => {
      const articleTitlesOnAuthor = (authorEntry: any) =>
        (authorEntry?.articles as any[])?.map((a: any) => a.title) ?? [];

      const periphZ = await strapi.documents(ARTICLE_UID).create({
        data: { title: 'ix-periph-Z' },
      });
      const periphM = await strapi.documents(ARTICLE_UID).create({
        data: { title: 'ix-periph-M' },
      });
      const periphA = await strapi.documents(ARTICLE_UID).create({
        data: { title: 'ix-periph-A' },
      });

      const authZ = await strapi.documents(AUTHOR_UID).create({
        data: { name: 'ix-auth-Z' },
      });
      const authM = await strapi.documents(AUTHOR_UID).create({
        data: { name: 'ix-auth-M' },
      });
      const authA = await strapi.documents(AUTHOR_UID).create({
        data: { name: 'ix-auth-A' },
      });

      const hub = await strapi.documents(ARTICLE_UID).create({
        data: { title: 'ix-hub-main' },
      });

      await strapi.documents(ARTICLE_UID).update({
        documentId: hub.documentId,
        data: {
          authors: {
            set: [
              { documentId: authM.documentId },
              { documentId: authZ.documentId },
              { documentId: authA.documentId },
            ],
          },
        } as any,
      });

      await strapi.documents(AUTHOR_UID).update({
        documentId: authZ.documentId,
        data: {
          articles: {
            set: [
              { documentId: periphA.documentId },
              { documentId: hub.documentId },
              { documentId: periphM.documentId },
            ],
          },
        } as any,
      });
      await strapi.documents(AUTHOR_UID).update({
        documentId: authM.documentId,
        data: {
          articles: {
            set: [
              { documentId: hub.documentId },
              { documentId: periphZ.documentId },
              { documentId: periphA.documentId },
            ],
          },
        } as any,
      });
      await strapi.documents(AUTHOR_UID).update({
        documentId: authA.documentId,
        data: {
          articles: {
            set: [
              { documentId: periphZ.documentId },
              { documentId: periphM.documentId },
              { documentId: hub.documentId },
            ],
          },
        } as any,
      });

      const draftAuthZ = await strapi.documents(AUTHOR_UID).findFirst({
        filters: { name: 'ix-auth-Z' },
        populate: { articles: true },
        status: 'draft',
      });
      const expectedAuthZ = ['ix-periph-A', 'ix-hub-main', 'ix-periph-M'];
      expect(articleTitlesOnAuthor(draftAuthZ)).toEqual(expectedAuthZ);

      // Intentionally interleave: some articles publish before all authors are published.
      await strapi.documents(ARTICLE_UID).publish({ documentId: periphM.documentId });
      await strapi.documents(AUTHOR_UID).publish({ documentId: authA.documentId });
      await strapi.documents(ARTICLE_UID).publish({ documentId: periphA.documentId });
      await strapi.documents(AUTHOR_UID).publish({ documentId: authZ.documentId });
      await strapi.documents(ARTICLE_UID).publish({ documentId: periphZ.documentId });
      await strapi.documents(AUTHOR_UID).publish({ documentId: authM.documentId });
      await strapi.documents(ARTICLE_UID).publish({ documentId: hub.documentId });

      const publishedAuthZ = await strapi.documents(AUTHOR_UID).findFirst({
        filters: { name: 'ix-auth-Z' },
        populate: { articles: true },
        status: 'published',
      });

      expect(articleTitlesOnAuthor(publishedAuthZ)).toEqual(expectedAuthZ);
    }
  );
});
