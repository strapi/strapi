import type { Core } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import { testInTransaction } from '../../../utils';
import baseResources from './resources/index';
import { ARTICLE_UID, findArticleDb, findArticlesDb } from './utils';

/** Content-type used only in this file: manyToMany before morphToMany in attribute order */
const LINK_ORDER_TEST_UID = 'api::linkordertest.linkordertest' as const;

const linkOrderTestContentType = {
  kind: 'collectionType' as const,
  collectionName: 'link_order_tests',
  singularName: 'linkordertest',
  pluralName: 'linkordertests',
  displayName: 'Link order test content-type',
  description: '',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string' },
    categories: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::category.category',
    },
    z_morph_m: {
      type: 'relation',
      relation: 'morphMany',
      target: 'api::linkordertest.linkordertest',
      morphBy: 'z_morph_tm',
    },
    z_morph_tm: {
      type: 'relation',
      relation: 'morphToMany',
    },
  },
};

const resources = {
  locales: baseResources.locales,
  schemas: {
    components: baseResources.schemas.components,
    'content-types': {
      ...baseResources.schemas['content-types'],
      [LINK_ORDER_TEST_UID]: linkOrderTestContentType,
    },
  },
  fixtures: {
    ...baseResources.fixtures,
    'content-types': {
      ...baseResources.fixtures['content-types'],
      [LINK_ORDER_TEST_UID]: [],
    },
  },
};

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
      // update article
      const updatedArticle = await strapi.documents(ARTICLE_UID).update({
        documentId: articleDb.documentId,
        locale: 'en',
        data: {
          comp: componentData.comp,
          dz: [...componentData.dz],
        },
        populate: ['comp', 'dz'],
      });

      // delete article
      await strapi.documents(ARTICLE_UID).delete({
        documentId: articleDb.documentId,
        locale: 'en',
      });

      // Components should not be in the database anymore
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
      // Should not have dutch locale
      articles.forEach((article) => {
        expect(article.locale).not.toBe('nl');
      });
    });

    testInTransaction('Status is ignored when deleting a document', async () => {
      const articleDb = await findArticleDb({ title: 'Article2-Draft-EN' });
      await strapi.documents(ARTICLE_UID).delete({
        documentId: articleDb.documentId,
        status: 'published',
      });

      const articles = await findArticlesDb({ documentId: articleDb.documentId });

      expect(articles.length).toBe(0);
    });

    testInTransaction(
      'Removes morphToMany join rows when a manyToMany field is ordered before morphToMany (#25857)',
      async (trx: any) => {
        // `testInTransaction` rolls back its trx, but `strapi.documents()` uses separate
        // transactions (see tests/api/utils/index.ts). Created rows are not reverted — delete
        // anything we still have in `finally` so we do not leak entries across runs.
        let morphTargetEntry: { documentId: string } | undefined;
        let entryWithMorphs: { documentId: string } | undefined;

        try {
          morphTargetEntry = await strapi.documents(LINK_ORDER_TEST_UID).create({
            data: { title: 'Polymorphic link target' },
          });

          entryWithMorphs = await strapi.documents(LINK_ORDER_TEST_UID).create({
            data: {
              title: 'Entry with category and morph link',
              categories: ['Cat1'],
              z_morph_tm: {
                connect: [
                  {
                    documentId: morphTargetEntry.documentId,
                    __type: LINK_ORDER_TEST_UID,
                  },
                ],
              },
            },
          });

          const entryRow = await strapi.db.query(LINK_ORDER_TEST_UID).findOne({
            where: { documentId: entryWithMorphs.documentId },
          });
          expect(entryRow).toBeDefined();

          const morphToManyAttr = strapi.db.metadata.get(LINK_ORDER_TEST_UID).attributes
            .z_morph_tm as {
            joinTable: { name: string; joinColumn: { name: string } };
          };
          const joinTable = morphToManyAttr.joinTable.name;
          const joinColumn = morphToManyAttr.joinTable.joinColumn.name;

          const rowsBefore = await strapi.db
            .getConnection(joinTable)
            .where({ [joinColumn]: entryRow!.id })
            .transacting(trx);

          expect(rowsBefore.length).toBeGreaterThan(0);

          await strapi.documents(LINK_ORDER_TEST_UID).delete({
            documentId: entryWithMorphs.documentId,
            locale: '*',
          });

          const rowsAfter = await strapi.db
            .getConnection(joinTable)
            .where({ [joinColumn]: entryRow!.id })
            .transacting(trx);

          expect(rowsAfter).toHaveLength(0);
        } finally {
          const bestEffortDelete = async (documentId: string | undefined) => {
            if (!documentId) {
              return;
            }
            try {
              await strapi.documents(LINK_ORDER_TEST_UID).delete({
                documentId,
                locale: '*',
              });
            } catch {
              // already removed or invalid state after a failed assertion
            }
          };

          await bestEffortDelete(entryWithMorphs?.documentId);
          await bestEffortDelete(morphTargetEntry?.documentId);
        }
      }
    );
  });
});
