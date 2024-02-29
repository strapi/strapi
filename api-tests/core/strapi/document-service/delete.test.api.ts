import { LoadedStrapi } from '@strapi/types';
import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import { testInTransaction } from '../../../utils/index';
import resources from './resources/index';
import { ARTICLE_UID, findArticleDb, findArticlesDb } from './utils';

describe('Document Service', () => {
  let testUtils;
  let strapi: LoadedStrapi;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
  });

  describe('Delete', () => {
    it(
      'delete an entire document',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-EN' });
        await strapi.documents(ARTICLE_UID).delete(articleDb.documentId, { locale: '*' });

        const articles = await findArticlesDb({ documentId: articleDb.id });

        expect(articles).toHaveLength(0);
      })
    );

    it('delete a document with a component', async () => {
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
      // update article
      const updatedArticle = await strapi.documents(ARTICLE_UID).update(articleDb.id, {
        locale: 'en',
        data: {
          comp: componentData.comp,
          dz: [...componentData.dz],
        },
        populate: ['comp', 'dz'],
      });

      // delete article
      await strapi.documents(ARTICLE_UID).delete(articleDb.id, { locale: 'en' });

      // Components should not be in the database anymore
      const compTable = strapi.db.metadata.get('article.comp').tableName;
      const dzTable = strapi.db.metadata.get('article.dz-comp').tableName;

      const comp = await strapi.db
        .getConnection(compTable)
        .where({ id: updatedArticle.comp.id })
        .first();
      const dz = await strapi.db
        .getConnection(dzTable)
        .where({ id: updatedArticle.dz.at(0)!.id })
        .first();

      expect(comp).toBeUndefined();
      expect(dz).toBeUndefined();
    });

    it(
      'delete a document locale',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article1-Draft-NL' });
        await strapi.documents(ARTICLE_UID).delete(articleDb.documentId, {
          locale: 'nl',
        });

        const articles = await findArticlesDb({ documentId: articleDb.id });

        expect(articles.length).toBeGreaterThan(0);
        // Should not have dutch locale
        articles.forEach((article) => {
          expect(article.locale).not.toBe('nl');
        });
      })
    );

    it(
      'status is ignored when deleting a document',
      testInTransaction(async () => {
        const articleDb = await findArticleDb({ title: 'Article2-Draft-EN' });
        await strapi.documents(ARTICLE_UID).delete(articleDb.id, {
          status: 'published',
        });

        const articles = await findArticlesDb({ documentId: articleDb.id });

        expect(articles.length).toBe(0);
      })
    );
  });
});
