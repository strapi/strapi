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
const CATEGORY_UID = 'api::clone-category.clone-category' as UID.ContentType;
const MORPH_BOX_UID = 'api::clone-morph-box.clone-morph-box' as UID.ContentType;

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

const categoryModel = {
  attributes: {
    name: { type: 'string' },
    parentCategory: {
      type: 'relation',
      relation: 'manyToOne',
      target: CATEGORY_UID,
      inversedBy: 'subcategories',
    },
    subcategories: {
      type: 'relation',
      relation: 'oneToMany',
      target: CATEGORY_UID,
      mappedBy: 'parentCategory',
    },
  },
  draftAndPublish: true,
  displayName: 'Clone category',
  singularName: 'clone-category',
  pluralName: 'clone-categories',
  description: '',
  collectionName: '',
};

const morphBoxModel = {
  attributes: {
    name: { type: 'string' },
    mto: { type: 'relation', relation: 'morphToOne' },
  },
  draftAndPublish: true,
  displayName: 'Clone morph box',
  singularName: 'clone-morph-box',
  pluralName: 'clone-morph-boxes',
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
    await builder.addContentTypes([tagModel, productModel, categoryModel, morphBoxModel]).build();

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
    'clone applies duplicate-form disconnect for a useJoinTable:false oneToOne relation',
    async () => {
      const { product, tag } = await createLegacyTaggedProduct(
        'Legacy Source Product',
        'Legacy Original Tag'
      );

      const result = await strapi.documents(PRODUCT_UID).clone({
        documentId: product.documentId,
        locale: 'en',
        data: {
          name: 'Legacy Clone without tag',
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
        cloneLegacyTagDocumentId: null,
        originalLegacyTagDocumentId: tag.documentId,
      });
    }
  );

  testInTransaction(
    'clone does not move subcategories from the original when the inverse oneToMany is unchanged',
    async () => {
      const parent = await strapi.documents(CATEGORY_UID).create({
        data: { name: 'Parent Category' },
      });
      const child = await strapi.documents(CATEGORY_UID).create({
        data: {
          name: 'Child Category',
          parentCategory: { documentId: parent.documentId },
        },
      });

      const result = await strapi.documents(CATEGORY_UID).clone({
        documentId: parent.documentId,
        data: { name: 'Cloned Parent Category' },
        populate: { subcategories: true },
      });

      const original = await strapi.documents(CATEGORY_UID).findOne({
        documentId: parent.documentId,
        populate: { subcategories: true },
      });
      const clone = result.entries[0] as {
        subcategories?: Array<{ documentId?: string }>;
      };

      expect({
        cloneSubcategoryCount: clone?.subcategories?.length ?? 0,
        originalSubcategoryDocumentIds: (
          (original as { subcategories?: Array<{ documentId?: string }> })?.subcategories ?? []
        ).map((entry) => entry.documentId),
        childStillOnOriginal: (
          (original as { subcategories?: Array<{ documentId?: string }> })?.subcategories ?? []
        ).some((entry) => entry.documentId === child.documentId),
      }).toEqual({
        cloneSubcategoryCount: 0,
        originalSubcategoryDocumentIds: [child.documentId],
        childStillOnOriginal: true,
      });
    }
  );

  testInTransaction('clone applies duplicate-form morphToOne disconnect', async () => {
    const targetB = await strapi.documents(MORPH_BOX_UID).create({ data: { name: 'Morph B' } });
    const targetBRow = await strapi.db.query(MORPH_BOX_UID).findOne({
      where: { documentId: targetB.documentId, publishedAt: null },
    });

    const source = await strapi.documents(MORPH_BOX_UID).create({
      data: {
        name: 'Morph Source',
        mto: { id: targetBRow!.id, __type: MORPH_BOX_UID },
      },
      populate: { mto: true },
    });

    const result = await strapi.documents(MORPH_BOX_UID).clone({
      documentId: source.documentId,
      data: {
        name: 'Morph Clone',
        mto: {
          disconnect: [{ id: targetBRow!.id, __type: MORPH_BOX_UID }],
        },
      },
      populate: { mto: true },
    });

    const original = await strapi.documents(MORPH_BOX_UID).findOne({
      documentId: source.documentId,
      populate: { mto: true },
    });

    const clone = result.entries[0] as { mto?: { documentId?: string } | null };

    expect({
      cloneMorphTarget: clone?.mto?.documentId ?? null,
      originalMorphTarget: (original as { mto?: { documentId?: string } | null })?.mto?.documentId,
    }).toEqual({
      cloneMorphTarget: null,
      originalMorphTarget: targetB.documentId,
    });
  });
});
