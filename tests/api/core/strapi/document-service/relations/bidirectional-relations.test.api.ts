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
      // Step 1: Create Authors A, B, C (draft)
      const authorA = await strapi.documents(AUTHOR_UID).create({
        data: { name: 'Author A' },
      });
      const authorB = await strapi.documents(AUTHOR_UID).create({
        data: { name: 'Author B' },
      });
      const authorC = await strapi.documents(AUTHOR_UID).create({
        data: { name: 'Author C' },
      });

      // Step 2: Create Article with relations to all three authors in order
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

      // Step 3: Publish everything
      await strapi.documents(AUTHOR_UID).publish({ documentId: authorA.documentId });
      await strapi.documents(AUTHOR_UID).publish({ documentId: authorB.documentId });
      await strapi.documents(AUTHOR_UID).publish({ documentId: authorC.documentId });
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
});
