/**
 * Duplicate-form relation operations nested in components and dynamic zones must override the
 * source entry's populated relation data when cloning.
 */
import type { Core, UID } from '@strapi/types';

import { testInTransaction } from '../../../../utils';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');

let strapi: Core.Strapi;
const builder = createTestBuilder();

const PRODUCT_UID = 'api::product.product' as UID.ContentType;
const TAG_UID = 'api::tag.tag' as UID.ContentType;
const RELATION_CONTAINER_UID = 'default.relation-container' as UID.Component;

type RelationContainer = {
  label?: string;
  tag?: {
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
  },
  displayName: 'relation-container',
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
      components: [RELATION_CONTAINER_UID],
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
    populate: { tag: true },
  },
  relatedItems: {
    populate: { tag: true },
  },
  sections: {
    on: {
      [RELATION_CONTAINER_UID]: {
        populate: { tag: true },
      },
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

describe('Document Service clone nested relation operation payloads', () => {
  beforeAll(async () => {
    await builder
      .addContentType(tagModel)
      .addComponent(relationContainerModel)
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
});
