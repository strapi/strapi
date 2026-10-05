/**
 * Duplicate-form relation operations nested in components and dynamic zones must override the
 * source entry's populated relation data when cloning.
 */
import type { Core, UID } from '@strapi/types';
import type { Knex } from 'knex';

import { testInTransaction } from '../../../../utils';
import { applyDeferredCloneRelationCopies } from '../../../../../../packages/core/core/src/services/document-service/utils/clone-relations';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');

let strapi: Core.Strapi;
const builder = createTestBuilder();

const PRODUCT_UID = 'api::product.product' as UID.ContentType;
const TAG_UID = 'api::tag.tag' as UID.ContentType;
const RELATION_CONTAINER_UID = 'default.relation-container' as UID.Component;
const PLAIN_BLOCK_UID = 'default.plain-block' as UID.Component;

type RelationContainer = {
  id?: number;
  label?: string;
  tag?: {
    documentId?: string;
  } | null;
  legacyTag?: {
    documentId?: string;
  } | null;
  mto?: {
    documentId?: string;
  } | null;
};

type ProductWithNestedRelations = {
  details?: RelationContainer | null;
  relatedItems?: RelationContainer[];
  sections?: Array<RelationContainer & { __component?: string }>;
};

const relationContainerModel = {
  collectionName: 'components_relation_containers',
  attributes: {
    label: { type: 'string' },
    tag: {
      type: 'relation',
      relation: 'oneToOne',
      target: TAG_UID,
    },
    legacyTag: {
      type: 'relation',
      relation: 'oneToOne',
      target: TAG_UID,
      useJoinTable: false,
    },
    mto: { type: 'relation', relation: 'morphToOne' },
  },
  displayName: 'relation-container',
};

const plainBlockModel = {
  collectionName: 'components_plain_blocks',
  attributes: {
    label: { type: 'string' },
  },
  displayName: 'plain-block',
};

const productModel = {
  attributes: {
    name: { type: 'string' },
    details: {
      type: 'component',
      component: RELATION_CONTAINER_UID,
    },
    relatedItems: {
      type: 'component',
      repeatable: true,
      component: RELATION_CONTAINER_UID,
    },
    sections: {
      type: 'dynamiczone',
      components: [RELATION_CONTAINER_UID, PLAIN_BLOCK_UID],
    },
  },
  draftAndPublish: true,
  displayName: 'Product',
  singularName: 'product',
  pluralName: 'products',
  description: '',
  collectionName: '',
};

const tagModel = {
  attributes: {
    name: { type: 'string' },
  },
  draftAndPublish: true,
  displayName: 'Tag',
  singularName: 'tag',
  pluralName: 'tags',
  description: '',
  collectionName: '',
};

const populate = {
  details: {
    populate: { tag: true, legacyTag: true, mto: true },
  },
  relatedItems: {
    populate: { tag: true, legacyTag: true, mto: true },
  },
  sections: {
    on: {
      [RELATION_CONTAINER_UID]: {
        populate: { tag: true, legacyTag: true, mto: true },
      },
      [PLAIN_BLOCK_UID]: true,
    },
  },
} as const;

const createTag = (name: string) => strapi.documents(TAG_UID).create({ data: { name } });

const findProduct = (documentId: string) =>
  strapi.documents(PRODUCT_UID).findOne({
    documentId,
    status: 'draft',
    populate,
  });

const nestedTagDocumentId = (container: RelationContainer | null | undefined) =>
  container?.tag?.documentId ?? null;

const nestedLegacyTagDocumentId = (container: RelationContainer | null | undefined) =>
  container?.legacyTag?.documentId ?? null;

const nestedMorphDocumentId = (container: RelationContainer | null | undefined) =>
  container?.mto?.documentId ?? null;

describe('Document Service clone nested relation operation payloads', () => {
  beforeAll(async () => {
    await builder
      .addContentType(tagModel)
      .addComponent(relationContainerModel)
      .addComponent(plainBlockModel)
      .addContentType(productModel)
      .build();

    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  testInTransaction(
    'clone applies duplicate-form selected target for a relation inside a component',
    async () => {
      const originalTag = await createTag('Component Original Tag');
      const selectedTag = await createTag('Component Selected Tag');
      const product = await strapi.documents(PRODUCT_UID).create({
        data: {
          name: 'Component Source Product',
          details: {
            label: 'Source details',
            tag: { documentId: originalTag.documentId },
          },
        },
        populate,
      });

      const result = await strapi.documents(PRODUCT_UID).clone({
        documentId: product.documentId,
        data: {
          name: 'Component Clone Product',
          details: {
            label: 'Cloned details',
            tag: {
              connect: [{ documentId: selectedTag.documentId }],
              disconnect: [{ documentId: originalTag.documentId }],
            },
          },
        },
        populate,
      });

      const originalProduct = (await findProduct(
        product.documentId
      )) as ProductWithNestedRelations | null;
      const clonedProduct = result.entries[0] as ProductWithNestedRelations;

      expect({
        cloneTagDocumentId: nestedTagDocumentId(clonedProduct.details),
        originalTagDocumentId: nestedTagDocumentId(originalProduct?.details),
      }).toEqual({
        cloneTagDocumentId: selectedTag.documentId,
        originalTagDocumentId: originalTag.documentId,
      });
    }
  );

  testInTransaction(
    'clone applies duplicate-form selected target for a relation inside a repeatable component',
    async () => {
      const originalTag = await createTag('Repeatable Component Original Tag');
      const selectedTag = await createTag('Repeatable Component Selected Tag');
      const product = await strapi.documents(PRODUCT_UID).create({
        data: {
          name: 'Repeatable Component Source Product',
          relatedItems: [
            {
              label: 'Source related item',
              tag: { documentId: originalTag.documentId },
            },
          ],
        },
        populate,
      });

      const result = await strapi.documents(PRODUCT_UID).clone({
        documentId: product.documentId,
        data: {
          name: 'Repeatable Component Clone Product',
          relatedItems: [
            {
              label: 'Cloned related item',
              tag: {
                connect: [{ documentId: selectedTag.documentId }],
                disconnect: [{ documentId: originalTag.documentId }],
              },
            },
          ],
        },
        populate,
      });

      const originalProduct = (await findProduct(
        product.documentId
      )) as ProductWithNestedRelations | null;
      const clonedProduct = result.entries[0] as ProductWithNestedRelations;

      expect({
        cloneTagDocumentId: nestedTagDocumentId(clonedProduct.relatedItems?.[0]),
        originalTagDocumentId: nestedTagDocumentId(originalProduct?.relatedItems?.[0]),
      }).toEqual({
        cloneTagDocumentId: selectedTag.documentId,
        originalTagDocumentId: originalTag.documentId,
      });
    }
  );

  testInTransaction(
    'clone applies duplicate-form selected target for a relation inside a dynamic-zone block',
    async () => {
      const originalTag = await createTag('Dynamic Zone Original Tag');
      const selectedTag = await createTag('Dynamic Zone Selected Tag');
      const product = await strapi.documents(PRODUCT_UID).create({
        data: {
          name: 'Dynamic Zone Source Product',
          sections: [
            {
              __component: RELATION_CONTAINER_UID,
              label: 'Source section',
              tag: { documentId: originalTag.documentId },
            },
          ],
        },
        populate,
      });

      const result = await strapi.documents(PRODUCT_UID).clone({
        documentId: product.documentId,
        data: {
          name: 'Dynamic Zone Clone Product',
          sections: [
            {
              __component: RELATION_CONTAINER_UID,
              label: 'Cloned section',
              tag: {
                connect: [{ documentId: selectedTag.documentId }],
                disconnect: [{ documentId: originalTag.documentId }],
              },
            },
          ],
        },
        populate,
      });

      const originalProduct = (await findProduct(
        product.documentId
      )) as ProductWithNestedRelations | null;
      const clonedProduct = result.entries[0] as ProductWithNestedRelations;

      expect({
        cloneTagDocumentId: nestedTagDocumentId(clonedProduct.sections?.[0]),
        originalTagDocumentId: nestedTagDocumentId(originalProduct?.sections?.[0]),
      }).toEqual({
        cloneTagDocumentId: selectedTag.documentId,
        originalTagDocumentId: originalTag.documentId,
      });
    }
  );

  testInTransaction(
    'clone applies duplicate-form selected targets for relations inside a component and dynamic-zone block in one request',
    async () => {
      const originalComponentTag = await createTag('Combined Component Original Tag');
      const selectedComponentTag = await createTag('Combined Component Selected Tag');
      const originalDynamicZoneTag = await createTag('Combined Dynamic Zone Original Tag');
      const selectedDynamicZoneTag = await createTag('Combined Dynamic Zone Selected Tag');
      const product = await strapi.documents(PRODUCT_UID).create({
        data: {
          name: 'Combined Source Product',
          details: {
            label: 'Source details',
            tag: { documentId: originalComponentTag.documentId },
          },
          sections: [
            {
              __component: RELATION_CONTAINER_UID,
              label: 'Source section',
              tag: { documentId: originalDynamicZoneTag.documentId },
            },
          ],
        },
        populate,
      });

      const result = await strapi.documents(PRODUCT_UID).clone({
        documentId: product.documentId,
        data: {
          name: 'Combined Clone Product',
          details: {
            label: 'Cloned details',
            tag: {
              connect: [{ documentId: selectedComponentTag.documentId }],
              disconnect: [{ documentId: originalComponentTag.documentId }],
            },
          },
          sections: [
            {
              __component: RELATION_CONTAINER_UID,
              label: 'Cloned section',
              tag: {
                connect: [{ documentId: selectedDynamicZoneTag.documentId }],
                disconnect: [{ documentId: originalDynamicZoneTag.documentId }],
              },
            },
          ],
        },
        populate,
      });

      const originalProduct = (await findProduct(
        product.documentId
      )) as ProductWithNestedRelations | null;
      const clonedProduct = result.entries[0] as ProductWithNestedRelations;

      expect({
        cloneComponentTagDocumentId: nestedTagDocumentId(clonedProduct.details),
        cloneDynamicZoneTagDocumentId: nestedTagDocumentId(clonedProduct.sections?.[0]),
        originalComponentTagDocumentId: nestedTagDocumentId(originalProduct?.details),
        originalDynamicZoneTagDocumentId: nestedTagDocumentId(originalProduct?.sections?.[0]),
      }).toEqual({
        cloneComponentTagDocumentId: selectedComponentTag.documentId,
        cloneDynamicZoneTagDocumentId: selectedDynamicZoneTag.documentId,
        originalComponentTagDocumentId: originalComponentTag.documentId,
        originalDynamicZoneTagDocumentId: originalDynamicZoneTag.documentId,
      });
    }
  );

  testInTransaction(
    'clone preserves a relation inside a component for empty duplicate-form operations',
    async () => {
      const originalTag = await createTag('Empty Component Operations Original Tag');
      const product = await strapi.documents(PRODUCT_UID).create({
        data: {
          name: 'Empty Component Operations Source Product',
          details: {
            label: 'Source details',
            tag: { documentId: originalTag.documentId },
          },
        },
        populate,
      });

      const result = await strapi.documents(PRODUCT_UID).clone({
        documentId: product.documentId,
        data: {
          name: 'Empty Component Operations Clone Product',
          details: {
            label: 'Cloned details',
            tag: {
              connect: [],
              disconnect: [],
            },
          },
        },
        populate,
      });

      const originalProduct = (await findProduct(
        product.documentId
      )) as ProductWithNestedRelations | null;
      const clonedProduct = result.entries[0] as ProductWithNestedRelations;

      expect({
        cloneTagDocumentId: nestedTagDocumentId(clonedProduct.details),
        originalTagDocumentId: nestedTagDocumentId(originalProduct?.details),
      }).toEqual({
        cloneTagDocumentId: originalTag.documentId,
        originalTagDocumentId: originalTag.documentId,
      });
    }
  );

  testInTransaction(
    'clone preserves a relation inside a dynamic-zone block for empty duplicate-form operations',
    async () => {
      const originalTag = await createTag('Empty Dynamic Zone Operations Original Tag');
      const product = await strapi.documents(PRODUCT_UID).create({
        data: {
          name: 'Empty Dynamic Zone Operations Source Product',
          sections: [
            {
              __component: RELATION_CONTAINER_UID,
              label: 'Source section',
              tag: { documentId: originalTag.documentId },
            },
          ],
        },
        populate,
      });

      const result = await strapi.documents(PRODUCT_UID).clone({
        documentId: product.documentId,
        data: {
          name: 'Empty Dynamic Zone Operations Clone Product',
          sections: [
            {
              __component: RELATION_CONTAINER_UID,
              label: 'Cloned section',
              tag: {
                connect: [],
                disconnect: [],
              },
            },
          ],
        },
        populate,
      });

      const originalProduct = (await findProduct(
        product.documentId
      )) as ProductWithNestedRelations | null;
      const clonedProduct = result.entries[0] as ProductWithNestedRelations;

      expect({
        cloneTagDocumentId: nestedTagDocumentId(clonedProduct.sections?.[0]),
        originalTagDocumentId: nestedTagDocumentId(originalProduct?.sections?.[0]),
      }).toEqual({
        cloneTagDocumentId: originalTag.documentId,
        originalTagDocumentId: originalTag.documentId,
      });
    }
  );

  testInTransaction(
    'clone applies duplicate-form selected target for a useJoinTable:false relation inside a component',
    async (trx: Knex.Transaction) => {
      const originalTag = await createTag('Inline Component Original Tag');
      const selectedTag = await createTag('Inline Component Selected Tag');
      await strapi.documents(TAG_UID).publish({ documentId: selectedTag.documentId });
      const selectedDraftRow = await strapi.db.query(TAG_UID).findOne({
        where: { documentId: selectedTag.documentId, publishedAt: null },
      });
      const selectedPublishedRow = await strapi.db.query(TAG_UID).findOne({
        where: { documentId: selectedTag.documentId, publishedAt: { $ne: null } },
      });
      const product = await strapi.documents(PRODUCT_UID).create({
        data: {
          name: 'Inline Component Source Product',
          details: {
            label: 'Source details',
            legacyTag: originalTag.id,
          },
        },
        populate,
      });

      const result = await strapi.documents(PRODUCT_UID).clone({
        documentId: product.documentId,
        data: {
          name: 'Inline Component Clone Product',
          details: {
            label: 'Cloned details',
            legacyTag: {
              connect: [{ documentId: selectedTag.documentId }],
              disconnect: [{ documentId: originalTag.documentId }],
            },
          },
        },
        populate,
      });

      const originalProduct = (await findProduct(
        product.documentId
      )) as ProductWithNestedRelations | null;
      const clonedProduct = result.entries[0] as ProductWithNestedRelations;
      const componentMeta = strapi.db.metadata.get(RELATION_CONTAINER_UID);
      const tagColumn = (
        componentMeta.attributes.legacyTag as { joinColumn?: { name?: string } } | undefined
      )?.joinColumn?.name;
      const clonedComponentRow = await strapi.db
        .connection(componentMeta.tableName)
        .where({ id: clonedProduct.details?.id })
        .select([tagColumn!])
        .transacting(trx)
        .first();

      expect({
        cloneLegacyTagDocumentId: nestedLegacyTagDocumentId(clonedProduct.details),
        originalLegacyTagDocumentId: nestedLegacyTagDocumentId(originalProduct?.details),
        storedTagId: clonedComponentRow?.[tagColumn!] ?? null,
      }).toEqual({
        cloneLegacyTagDocumentId: selectedTag.documentId,
        originalLegacyTagDocumentId: originalTag.documentId,
        storedTagId: selectedDraftRow?.id,
      });
      expect(selectedDraftRow?.id).not.toBe(selectedPublishedRow?.id);
    }
  );

  testInTransaction(
    'clone applies duplicate-form selected target for a morphToOne relation inside a component',
    async (trx: Knex.Transaction) => {
      const originalTag = await createTag('Morph Component Original Tag');
      const selectedTag = await createTag('Morph Component Selected Tag');
      await strapi.documents(TAG_UID).publish({ documentId: selectedTag.documentId });
      const originalTagRow = await strapi.db.query(TAG_UID).findOne({
        where: { documentId: originalTag.documentId, publishedAt: null },
      });
      const selectedTagRow = await strapi.db.query(TAG_UID).findOne({
        where: { documentId: selectedTag.documentId, publishedAt: null },
      });
      const selectedPublishedTagRow = await strapi.db.query(TAG_UID).findOne({
        where: { documentId: selectedTag.documentId, publishedAt: { $ne: null } },
      });

      const product = await strapi.documents(PRODUCT_UID).create({
        data: {
          name: 'Morph Component Source Product',
          details: {
            label: 'Source details',
            mto: { id: originalTagRow!.id, __type: TAG_UID },
          },
        },
        populate,
      });

      const result = await strapi.documents(PRODUCT_UID).clone({
        documentId: product.documentId,
        data: {
          name: 'Morph Component Clone Product',
          details: {
            label: 'Cloned details',
            mto: {
              connect: [{ documentId: selectedTag.documentId, __type: TAG_UID }],
              disconnect: [{ id: originalTagRow!.id, __type: TAG_UID }],
            },
          },
        },
        populate,
      });

      const originalProduct = (await findProduct(
        product.documentId
      )) as ProductWithNestedRelations | null;
      const clonedProduct = result.entries[0] as ProductWithNestedRelations;
      const componentMeta = strapi.db.metadata.get(RELATION_CONTAINER_UID);
      const morphColumn = (
        componentMeta.attributes.mto as
          | { morphColumn?: { idColumn?: { name?: string }; typeColumn?: { name?: string } } }
          | undefined
      )?.morphColumn;
      const clonedComponentRow = await strapi.db
        .connection(componentMeta.tableName)
        .where({ id: clonedProduct.details?.id })
        .select([morphColumn!.idColumn!.name!, morphColumn!.typeColumn!.name!])
        .transacting(trx)
        .first();

      expect({
        cloneMorphDocumentId: nestedMorphDocumentId(clonedProduct.details),
        originalMorphDocumentId: nestedMorphDocumentId(originalProduct?.details),
        storedMorphId: clonedComponentRow?.[morphColumn!.idColumn!.name!] ?? null,
        storedMorphType: clonedComponentRow?.[morphColumn!.typeColumn!.name!] ?? null,
      }).toEqual({
        cloneMorphDocumentId: selectedTag.documentId,
        originalMorphDocumentId: originalTag.documentId,
        storedMorphId: selectedTagRow?.id,
        storedMorphType: TAG_UID,
      });
      expect(selectedTagRow?.id).not.toBe(selectedPublishedTagRow?.id);
    }
  );

  testInTransaction(
    'clone preserves an inline relation inside a component when disconnect does not match',
    async () => {
      const originalTag = await createTag('Unmatched Component Original Tag');
      const unrelatedTag = await createTag('Unmatched Component Unrelated Tag');
      const product = await strapi.documents(PRODUCT_UID).create({
        data: {
          name: 'Unmatched Component Source Product',
          details: {
            label: 'Source details',
            legacyTag: originalTag.id,
          },
        },
        populate,
      });

      const result = await strapi.documents(PRODUCT_UID).clone({
        documentId: product.documentId,
        data: {
          name: 'Unmatched Component Clone Product',
          details: {
            label: 'Cloned details',
            legacyTag: {
              disconnect: [{ documentId: unrelatedTag.documentId }],
            },
          },
        },
        populate,
      });

      const clonedProduct = result.entries[0] as ProductWithNestedRelations;

      expect(nestedLegacyTagDocumentId(clonedProduct.details)).toBe(originalTag.documentId);
    }
  );

  testInTransaction(
    'clone preserves an inline relation inside a dynamic-zone block when disconnect does not match',
    async () => {
      const originalTag = await createTag('Unmatched Dynamic Zone Original Tag');
      const unrelatedTag = await createTag('Unmatched Dynamic Zone Unrelated Tag');
      const product = await strapi.documents(PRODUCT_UID).create({
        data: {
          name: 'Unmatched Dynamic Zone Source Product',
          sections: [
            {
              __component: RELATION_CONTAINER_UID,
              label: 'Source section',
              legacyTag: originalTag.id,
            },
          ],
        },
        populate,
      });

      const result = await strapi.documents(PRODUCT_UID).clone({
        documentId: product.documentId,
        data: {
          name: 'Unmatched Dynamic Zone Clone Product',
          sections: [
            {
              __component: RELATION_CONTAINER_UID,
              label: 'Cloned section',
              legacyTag: {
                disconnect: [{ documentId: unrelatedTag.documentId }],
              },
            },
          ],
        },
        populate,
      });

      const clonedProduct = result.entries[0] as ProductWithNestedRelations;

      expect(nestedLegacyTagDocumentId(clonedProduct.sections?.[0])).toBe(originalTag.documentId);
    }
  );

  testInTransaction(
    'clone preserves a morphToOne relation inside a component when disconnect does not match',
    async () => {
      const originalTag = await createTag('Unmatched Morph Original Tag');
      const unrelatedTag = await createTag('Unmatched Morph Unrelated Tag');
      const originalTagRow = await strapi.db.query(TAG_UID).findOne({
        where: { documentId: originalTag.documentId, publishedAt: null },
      });
      const product = await strapi.documents(PRODUCT_UID).create({
        data: {
          name: 'Unmatched Morph Source Product',
          details: {
            label: 'Source details',
            mto: { id: originalTagRow!.id, __type: TAG_UID },
          },
        },
        populate,
      });

      const result = await strapi.documents(PRODUCT_UID).clone({
        documentId: product.documentId,
        data: {
          name: 'Unmatched Morph Clone Product',
          details: {
            label: 'Cloned details',
            mto: {
              disconnect: [{ documentId: unrelatedTag.documentId, __type: TAG_UID }],
            },
          },
        },
        populate,
      });

      const clonedProduct = result.entries[0] as ProductWithNestedRelations;

      expect(nestedMorphDocumentId(clonedProduct.details)).toBe(originalTag.documentId);
    }
  );

  testInTransaction(
    'clone removes a component that holds a populated morphToOne without copying it',
    async () => {
      const originalTag = await createTag('Removed Component Populated Morph');
      const originalTagRow = await strapi.db.query(TAG_UID).findOne({
        where: { documentId: originalTag.documentId, publishedAt: null },
      });
      const product = await strapi.documents(PRODUCT_UID).create({
        data: {
          name: 'Removed Component Populated Morph Source',
          details: {
            label: 'Source details',
            mto: { id: originalTagRow!.id, __type: TAG_UID },
          },
        },
        populate,
      });

      const result = await strapi.documents(PRODUCT_UID).clone({
        documentId: product.documentId,
        data: { details: null },
        populate,
      });

      const originalProduct = (await findProduct(
        product.documentId
      )) as ProductWithNestedRelations | null;
      const clonedProduct = result.entries[0] as ProductWithNestedRelations;

      expect({
        cloneDetails: clonedProduct.details ?? null,
        originalMorphDocumentId: nestedMorphDocumentId(originalProduct?.details),
      }).toEqual({
        cloneDetails: null,
        originalMorphDocumentId: originalTag.documentId,
      });
    }
  );

  testInTransaction('clone removes a component whose morphToOne is null', async () => {
    const product = await strapi.documents(PRODUCT_UID).create({
      data: {
        name: 'Removed Component Null Morph Source',
        details: {
          label: 'Source details',
          mto: null,
        },
      },
      populate,
    });

    const result = await strapi.documents(PRODUCT_UID).clone({
      documentId: product.documentId,
      data: { details: null },
      populate,
    });

    const originalProduct = (await findProduct(
      product.documentId
    )) as ProductWithNestedRelations | null;
    const clonedProduct = result.entries[0] as ProductWithNestedRelations;

    expect({
      cloneDetails: clonedProduct.details ?? null,
      originalDetailsLabel: originalProduct?.details?.label ?? null,
      originalMorphDocumentId: nestedMorphDocumentId(originalProduct?.details),
    }).toEqual({
      cloneDetails: null,
      originalDetailsLabel: 'Source details',
      originalMorphDocumentId: null,
    });
  });

  testInTransaction(
    'clone does not copy a morph onto another row when a dynamic zone block changes component',
    async (trx: Knex.Transaction) => {
      const victimTag = await createTag('Zone Swap Victim Tag');
      const sourceTag = await createTag('Zone Swap Source Tag');
      const victimTagRow = await strapi.db.query(TAG_UID).findOne({
        where: { documentId: victimTag.documentId, publishedAt: null },
      });
      const sourceTagRow = await strapi.db.query(TAG_UID).findOne({
        where: { documentId: sourceTag.documentId, publishedAt: null },
      });

      const victim = await strapi.documents(PRODUCT_UID).create({
        data: {
          name: 'Zone Swap Victim',
          sections: [
            {
              __component: RELATION_CONTAINER_UID,
              label: 'Victim block',
              mto: { id: victimTagRow!.id, __type: TAG_UID },
            },
          ],
        },
        populate,
      });
      const source = await strapi.documents(PRODUCT_UID).create({
        data: {
          name: 'Zone Swap Source',
          sections: [
            {
              __component: RELATION_CONTAINER_UID,
              label: 'Source block',
              mto: { id: sourceTagRow!.id, __type: TAG_UID },
            },
          ],
        },
        populate,
      });

      const componentMeta = strapi.db.metadata.get(RELATION_CONTAINER_UID);
      const morphColumn = (
        componentMeta.attributes.mto as {
          morphColumn?: { idColumn?: { name?: string }; typeColumn?: { name?: string } };
        }
      ).morphColumn;
      const idColumn = morphColumn!.idColumn!.name!;
      const typeColumn = morphColumn!.typeColumn!.name!;
      const readMorph = async (id: number) => {
        const row = await strapi.db
          .connection(componentMeta.tableName)
          .where({ id })
          .select([idColumn, typeColumn])
          .transacting(trx)
          .first();

        return {
          morphId: row?.[idColumn] ?? null,
          morphType: row?.[typeColumn] ?? null,
        };
      };

      const victimBlock = (victim as ProductWithNestedRelations).sections?.[0];
      const sourceBlock = (source as ProductWithNestedRelations).sections?.[0];
      const victimBefore = await readMorph(victimBlock!.id!);
      const sourceBefore = await readMorph(sourceBlock!.id!);

      // Component ids are per table. Pad the replacement component so the clone
      // block id equals the victim row id; that is the row a bad copy would update.
      const plainMeta = strapi.db.metadata.get(PLAIN_BLOCK_UID);
      const plainMax = await strapi.db
        .connection(plainMeta.tableName)
        .max({ maxId: 'id' })
        .transacting(trx)
        .first();
      let nextPlainId = Number(plainMax?.maxId ?? 0) + 1;
      let pad = 0;
      while (nextPlainId < victimBlock!.id!) {
        pad += 1;
        await strapi.documents(PRODUCT_UID).create({
          data: {
            name: `Zone swap pad ${pad}`,
            sections: [{ __component: PLAIN_BLOCK_UID, label: 'pad' }],
          },
        });
        nextPlainId += 1;
      }

      const result = await strapi.documents(PRODUCT_UID).clone({
        documentId: source.documentId,
        data: {
          name: 'Zone Swap Clone',
          sections: [{ __component: PLAIN_BLOCK_UID, label: 'Replaced block' }],
        },
        populate,
      });

      const clonedProduct = result.entries[0] as ProductWithNestedRelations;
      const cloneBlock = clonedProduct.sections?.[0];
      const victimAfter = await readMorph(victimBlock!.id!);
      const sourceAfter = await readMorph(sourceBlock!.id!);

      expect({
        victimId: victimBlock?.id ?? null,
        cloneBlockId: cloneBlock?.id ?? null,
        cloneComponent: cloneBlock?.__component ?? null,
        victimMorphBefore: victimBefore.morphId,
        victimMorphAfter: victimAfter.morphId,
        victimTypeAfter: victimAfter.morphType,
        sourceMorphBefore: sourceBefore.morphId,
        sourceMorphAfter: sourceAfter.morphId,
        sourceTypeAfter: sourceAfter.morphType,
      }).toEqual({
        // The new block is the first row of its own table, so its id matches the
        // first relation-container row. A wrong write lands on that victim.
        victimId: victimBlock?.id,
        cloneBlockId: victimBlock?.id,
        cloneComponent: PLAIN_BLOCK_UID,
        victimMorphBefore: victimTagRow?.id,
        victimMorphAfter: victimTagRow?.id,
        victimTypeAfter: TAG_UID,
        sourceMorphBefore: sourceTagRow?.id,
        sourceMorphAfter: sourceTagRow?.id,
        sourceTypeAfter: TAG_UID,
      });
    }
  );

  testInTransaction('clone relation copy throws when a nested owner has no id', async () => {
    await expect(
      applyDeferredCloneRelationCopies(
        strapi,
        PRODUCT_UID,
        1,
        2,
        { details: { id: 10 } },
        { details: { label: 'missing id' } },
        [
          {
            schemaUid: RELATION_CONTAINER_UID,
            attributeName: 'mto',
            kind: 'morphToOne',
            ownerPath: 'details',
          },
        ]
      )
    ).rejects.toThrow('Unable to resolve clone relation owner for "mto" at path "details"');
  });
});
