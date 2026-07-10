/**
 * Clone must treat user-submitted relation operation payloads as replacements for the
 * original entry's populated relation data.
 */
import type { Core, UID } from '@strapi/types';

import { testInTransaction } from '../../../../utils';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');

let strapi: Core.Strapi;
const builder = createTestBuilder();

const PRODUCT_UID = 'api::product.product' as UID.ContentType;
const TAG_UID = 'api::tag.tag' as UID.ContentType;

type ProductWithTags = {
  tag?: {
    documentId?: string;
  } | null;
  legacyTag?: {
    documentId?: string;
  } | null;
};

const productModel = {
  attributes: {
    name: {
      type: 'string',
    },
    tag: {
      type: 'relation',
      relation: 'oneToOne',
      target: TAG_UID,
      targetAttribute: 'product',
    },
    legacyTag: {
      type: 'relation',
      relation: 'oneToOne',
      target: TAG_UID,
      useJoinTable: false,
    },
  },
  pluginOptions: {
    i18n: {
      localized: true,
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

const createTag = (name: string) => strapi.documents(TAG_UID).create({ data: { name } });

const relationDocumentId = (
  product: ProductWithTags | undefined,
  attribute: keyof ProductWithTags
) => product?.[attribute]?.documentId ?? null;

const createTaggedProduct = async (productName: string, tagName: string) => {
  const tag = await createTag(tagName);

  const product = await strapi.documents(PRODUCT_UID).create({
    locale: 'en',
    data: {
      name: productName,
      tag: { documentId: tag.documentId },
    },
    populate: { tag: true },
  });

  expect((product as ProductWithTags).tag).toMatchObject({ documentId: tag.documentId });

  return { product, tag };
};

const createLegacyTaggedProduct = async (productName: string, tagName: string) => {
  const tag = await createTag(tagName);

  const product = await strapi.documents(PRODUCT_UID).create({
    locale: 'en',
    data: {
      name: productName,
      legacyTag: tag.id,
    },
    populate: { legacyTag: true },
  });

  expect((product as ProductWithTags).legacyTag).toMatchObject({ documentId: tag.documentId });

  return { product, tag };
};

const findProductWithTags = (documentId: string) =>
  strapi.documents(PRODUCT_UID).findOne({
    documentId,
    locale: 'en',
    populate: { tag: true, legacyTag: true },
  });

describe('Document Service clone relation operation payloads', () => {
  beforeAll(async () => {
    await builder.addContentTypes([tagModel, productModel]).build();

    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  testInTransaction(
    'clone applies duplicate-form disconnect for a top-level oneToOne relation',
    async () => {
      const { product, tag } = await createTaggedProduct(
        'CMS-557 Source Product',
        'CMS-557 Original Tag'
      );

      const result = await strapi.documents(PRODUCT_UID).clone({
        documentId: product.documentId,
        locale: 'en',
        data: {
          name: 'CMS-557 Clone without tag',
          tag: {
            connect: [],
            disconnect: [{ documentId: tag.documentId }],
          },
        },
        populate: { tag: true },
      });

      const originalProduct = await findProductWithTags(product.documentId);

      expect({
        cloneTagDocumentId: relationDocumentId(result.entries[0] as ProductWithTags, 'tag'),
        originalTagDocumentId: relationDocumentId(originalProduct as ProductWithTags, 'tag'),
      }).toEqual({
        cloneTagDocumentId: null,
        originalTagDocumentId: tag.documentId,
      });
    }
  );

  testInTransaction(
    'clone applies duplicate-form selected target for a top-level oneToOne relation',
    async () => {
      const { product, tag: originalTag } = await createTaggedProduct(
        'CMS-562 Source Product',
        'CMS-562 Original Tag'
      );
      const selectedTag = await createTag('CMS-562 Selected Tag');

      const result = await strapi.documents(PRODUCT_UID).clone({
        documentId: product.documentId,
        locale: 'en',
        data: {
          name: 'CMS-562 Clone with selected tag',
          tag: {
            connect: [{ documentId: selectedTag.documentId }],
            disconnect: [{ documentId: originalTag.documentId }],
          },
        },
        populate: { tag: true },
      });

      const originalProduct = await findProductWithTags(product.documentId);

      expect({
        cloneTagDocumentId: relationDocumentId(result.entries[0] as ProductWithTags, 'tag'),
        originalTagDocumentId: relationDocumentId(originalProduct as ProductWithTags, 'tag'),
      }).toEqual({
        cloneTagDocumentId: selectedTag.documentId,
        originalTagDocumentId: originalTag.documentId,
      });
    }
  );

  testInTransaction(
    'clone preserves a top-level oneToOne relation for empty duplicate-form operations',
    async () => {
      const { product, tag } = await createTaggedProduct(
        'Empty Operations Source Product',
        'Empty Operations Original Tag'
      );

      const result = await strapi.documents(PRODUCT_UID).clone({
        documentId: product.documentId,
        locale: 'en',
        data: {
          name: 'Empty Operations Clone',
          tag: {
            connect: [],
            disconnect: [],
          },
        },
        populate: { tag: true },
      });

      const originalProduct = await findProductWithTags(product.documentId);

      expect({
        cloneTagDocumentId: relationDocumentId(result.entries[0] as ProductWithTags, 'tag'),
        originalTagDocumentId: relationDocumentId(originalProduct as ProductWithTags, 'tag'),
      }).toEqual({
        cloneTagDocumentId: tag.documentId,
        originalTagDocumentId: tag.documentId,
      });
    }
  );

  testInTransaction(
    'clone preserves an omitted top-level oneToOne relation when changing scalar data',
    async () => {
      const { product, tag } = await createTaggedProduct(
        'Omitted Relation Source Product',
        'Omitted Relation Original Tag'
      );

      const result = await strapi.documents(PRODUCT_UID).clone({
        documentId: product.documentId,
        locale: 'en',
        data: {
          name: 'Omitted Relation Clone',
        },
        populate: { tag: true },
      });

      const originalProduct = await findProductWithTags(product.documentId);

      expect({
        cloneTagDocumentId: relationDocumentId(result.entries[0] as ProductWithTags, 'tag'),
        originalTagDocumentId: relationDocumentId(originalProduct as ProductWithTags, 'tag'),
      }).toEqual({
        cloneTagDocumentId: tag.documentId,
        originalTagDocumentId: tag.documentId,
      });
    }
  );

  testInTransaction(
    'clone returns the draft with an unchanged oneToOne relation when status is published',
    async () => {
      const { product, tag } = await createTaggedProduct(
        'Published Status Source Product',
        'Published Status Original Tag'
      );

      const result = await strapi.documents(PRODUCT_UID).clone({
        documentId: product.documentId,
        locale: 'en',
        status: 'published',
        data: {
          name: 'Published Status Clone',
        },
        populate: { tag: true },
      });

      const clonedProduct = result.entries[0] as ProductWithTags | null;
      const persistedDraft = result.documentId
        ? await strapi.documents(PRODUCT_UID).findOne({
            documentId: result.documentId,
            locale: 'en',
            status: 'draft',
            populate: { tag: true },
          })
        : undefined;
      const originalProduct = await findProductWithTags(product.documentId);

      expect({
        cloneDocumentId: result.documentId ?? null,
        cloneTagDocumentId: relationDocumentId(clonedProduct ?? undefined, 'tag'),
        persistedDraftTagDocumentId: relationDocumentId(persistedDraft as ProductWithTags, 'tag'),
        originalTagDocumentId: relationDocumentId(originalProduct as ProductWithTags, 'tag'),
      }).toEqual({
        cloneDocumentId: expect.any(String),
        cloneTagDocumentId: tag.documentId,
        persistedDraftTagDocumentId: tag.documentId,
        originalTagDocumentId: tag.documentId,
      });
    }
  );

  testInTransaction(
    'clone applies set for a top-level oneToOne relation without changing the original',
    async () => {
      const { product, tag: originalTag } = await createTaggedProduct(
        'Set Operation Source Product',
        'Set Operation Original Tag'
      );
      const selectedTag = await createTag('Set Operation Selected Tag');

      const result = await strapi.documents(PRODUCT_UID).clone({
        documentId: product.documentId,
        locale: 'en',
        data: {
          name: 'Set Operation Clone',
          tag: {
            set: [{ documentId: selectedTag.documentId }],
          },
        },
        populate: { tag: true },
      });

      const originalProduct = await findProductWithTags(product.documentId);

      expect({
        cloneTagDocumentId: relationDocumentId(result.entries[0] as ProductWithTags, 'tag'),
        originalTagDocumentId: relationDocumentId(originalProduct as ProductWithTags, 'tag'),
      }).toEqual({
        cloneTagDocumentId: selectedTag.documentId,
        originalTagDocumentId: originalTag.documentId,
      });
    }
  );

  testInTransaction(
    'clone preserves useJoinTable:false relation data when submitted operations are not transformable',
    async () => {
      const { product, tag } = await createLegacyTaggedProduct(
        'Legacy Source Product',
        'Legacy Original Tag'
      );

      const result = await strapi.documents(PRODUCT_UID).clone({
        documentId: product.documentId,
        locale: 'en',
        data: {
          name: 'Legacy Clone',
          legacyTag: {
            connect: [],
            disconnect: [{ documentId: tag.documentId }],
          },
        },
        populate: { legacyTag: true },
      });

      const originalProduct = await findProductWithTags(product.documentId);

      expect({
        cloneLegacyTagDocumentId: relationDocumentId(
          result.entries[0] as ProductWithTags,
          'legacyTag'
        ),
        originalLegacyTagDocumentId: relationDocumentId(
          originalProduct as ProductWithTags,
          'legacyTag'
        ),
      }).toEqual({
        cloneLegacyTagDocumentId: tag.documentId,
        originalLegacyTagDocumentId: tag.documentId,
      });
    }
  );
});
