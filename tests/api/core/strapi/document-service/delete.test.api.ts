import type { Core } from '@strapi/types';
import { errors } from '@strapi/utils';

import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import { testInTransaction } from '../../../utils';
import { createMinimalArticleCategoryResources } from './resources/minimal-article-category';
import { ARTICLE_UID, findArticleDb, findArticlesDb } from './utils';

const resources = createMinimalArticleCategoryResources({ withComponents: true });

describe('Document Service', () => {
  let testUtils;
  let strapi: Core.Strapi;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  describe('Delete', () => {
    testInTransaction('Can delete an entire document', async () => {
      const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });
      await strapi.documents(ARTICLE_UID).delete({ documentId: articleDb.documentId, locale: '*' });

      const articles = await findArticlesDb({ documentId: articleDb.documentId });

      expect(articles).toHaveLength(0);
    });

    testInTransaction('Can delete a document with a component', async (trx: any) => {
      const componentData = {
        comp: {
          text: 'comp-1',
        },
        dz: [
          {
            __component: 'article.dz-comp',
            name: 'dz-comp-1',
          },
        ],
      } as const;

      const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });
      const updatedArticle = await strapi.documents(ARTICLE_UID).update({
        documentId: articleDb.documentId,
        locale: 'en',
        data: {
          comp: componentData.comp,
          dz: [...componentData.dz],
        },
        populate: ['comp', 'dz'],
      });

      await strapi.documents(ARTICLE_UID).delete({
        documentId: articleDb.documentId,
        locale: 'en',
      });

      const compTable = strapi.db.metadata.get('article.comp').tableName;
      const dzTable = strapi.db.metadata.get('article.dz-comp').tableName;

      const comp = await strapi.db
        .getConnection(compTable)
        .where({ id: updatedArticle.comp.id })
        .transacting(trx)
        .first();
      const dz = await strapi.db
        .getConnection(dzTable)
        .where({ id: updatedArticle.dz.at(0)!.id })
        .transacting(trx)
        .first();

      expect(comp).toBeUndefined();
      expect(dz).toBeUndefined();
    });

    testInTransaction('Can delete a single document locale', async () => {
      const articleDb = await findArticleDb({ title: 'Article1-Draft-NL' });
      await strapi.documents(ARTICLE_UID).delete({
        documentId: articleDb.documentId,
        locale: 'nl',
      });

      const articles = await findArticlesDb({ documentId: articleDb.documentId });

      expect(articles.length).toBeGreaterThan(0);
      articles.forEach((article) => {
        expect(article.locale).not.toBe('nl');
      });
    });

    testInTransaction(
      'Can delete a single document locale and populate the deleted entry',
      async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-NL' });

        const deletedDocument = await strapi.documents(ARTICLE_UID).delete({
          documentId: articleDb.documentId,
          locale: 'nl',
          populate: { categories: true },
        });

        expect(deletedDocument.entries).toHaveLength(1);
        expect(deletedDocument.entries[0]).toMatchObject({
          documentId: articleDb.documentId,
          locale: 'nl',
          categories: [{ documentId: 'Cat1', name: 'Cat1-NL' }],
        });

        const articles = await findArticlesDb({ documentId: articleDb.documentId });

        expect(articles.length).toBeGreaterThan(0);
        articles.forEach((article) => {
          expect(article.locale).not.toBe('nl');
        });
      }
    );

    testInTransaction('Status is ignored when deleting a document', async () => {
      const articleDb = await findArticleDb({ title: 'Article2-Draft-EN' });
      await strapi.documents(ARTICLE_UID).delete({
        documentId: articleDb.documentId,
        status: 'published',
      });

      const articles = await findArticlesDb({ documentId: articleDb.documentId });

      expect(articles.length).toBe(0);
    });

    testInTransaction('Cannot delete only the draft of a document', async () => {
      const articleDb = await findArticleDb({ title: 'Article2-Draft-EN' });
      // Publish so draft and published versions exist, and a partial delete would be visible
      await strapi.documents(ARTICLE_UID).publish({ documentId: articleDb.documentId });
      const articlesBefore = await findArticlesDb({ documentId: articleDb.documentId });
      expect(articlesBefore).toHaveLength(2);

      const deletion = strapi.documents(ARTICLE_UID).delete({
        documentId: articleDb.documentId,
        status: 'draft',
      });

      await expect(deletion).rejects.toThrow(errors.ValidationError);
      await expect(deletion).rejects.toThrow('Cannot delete only the draft of a document');

      const articlesAfter = await findArticlesDb({ documentId: articleDb.documentId });

      expect(articlesAfter).toHaveLength(articlesBefore.length);
    });
  });
});
