import type { Core } from '@strapi/types';

import { createTestSetup, destroyTestSetup } from '../../../utils/builder-helper';
import { testInTransaction } from '../../../utils';
import {
  CATEGORY_UID,
  createMinimalArticleCategoryResources,
} from './resources/minimal-article-category';

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
      target: CATEGORY_UID,
    },
    z_morph_m: {
      type: 'relation',
      relation: 'morphMany',
      target: LINK_ORDER_TEST_UID,
      morphBy: 'z_morph_tm',
    },
    z_morph_tm: {
      type: 'relation',
      relation: 'morphToMany',
    },
  },
};

const baseResources = createMinimalArticleCategoryResources();

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

describe('Document Service - Delete morph join order', () => {
  let testUtils;
  let strapi: Core.Strapi;

  beforeAll(async () => {
    testUtils = await createTestSetup(resources);
    strapi = testUtils.strapi;
  });

  afterAll(async () => {
    await destroyTestSetup(testUtils);
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
