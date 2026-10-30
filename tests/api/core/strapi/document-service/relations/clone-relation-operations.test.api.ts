/**
 * Clone must treat user-submitted relation operation payloads as replacements for the
 * original entry's populated relation data.
 */
import type { Core, UID } from '@strapi/types';
import type { Knex } from 'knex';

import { testInTransaction } from '../../../../utils';

const { createTestBuilder } = require('api-tests/builder');
const modelsUtils = require('api-tests/models');
const { createStrapiInstance } = require('api-tests/strapi');

let strapi: Core.Strapi;
const builder = createTestBuilder();

const PRODUCT_UID = 'api::product.product' as UID.ContentType;
const TAG_UID = 'api::tag.tag' as UID.ContentType;
const CATEGORY_UID = 'api::clone-category.clone-category' as UID.ContentType;
const MORPH_BOX_UID = 'api::clone-morph-box.clone-morph-box' as UID.ContentType;
const PLAIN_UID = 'api::clone-plain.clone-plain' as UID.ContentType;
const LOCALIZED_TAG_UID = 'api::localized-tag.localized-tag' as UID.ContentType;
const FK_OWNER_UID = 'api::clone-fk-owner.clone-fk-owner' as UID.ContentType;
const FK_INVERSE_UID = 'api::clone-fk-inverse.clone-fk-inverse' as UID.ContentType;

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

const plainModel = {
  attributes: {
    name: { type: 'string' },
    tag: {
      type: 'relation',
      relation: 'oneToOne',
      target: TAG_UID,
      useJoinTable: false,
    },
    mto: { type: 'relation', relation: 'morphToOne' },
    localizedTag: {
      type: 'relation',
      relation: 'oneToOne',
      target: LOCALIZED_TAG_UID,
      useJoinTable: false,
    },
  },
  draftAndPublish: false,
  displayName: 'Clone plain',
  singularName: 'clone-plain',
  pluralName: 'clone-plains',
  description: '',
  collectionName: '',
};

const localizedTagModel = {
  attributes: {
    name: { type: 'string' },
  },
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  draftAndPublish: false,
  displayName: 'Localized tag',
  singularName: 'localized-tag',
  pluralName: 'localized-tags',
  description: '',
  collectionName: '',
};

const fkOwnerModel = {
  attributes: {
    name: { type: 'string' },
    inverse: {
      type: 'relation',
      relation: 'oneToOne',
      target: FK_INVERSE_UID,
      inversedBy: 'owner',
      useJoinTable: false,
    },
  },
  draftAndPublish: false,
  displayName: 'Clone FK owner',
  singularName: 'clone-fk-owner',
  pluralName: 'clone-fk-owners',
  description: '',
  collectionName: '',
};

const fkInverseModel = {
  attributes: {
    name: { type: 'string' },
    owner: {
      type: 'relation',
      relation: 'oneToOne',
      target: FK_OWNER_UID,
      mappedBy: 'inverse',
      useJoinTable: false,
    },
  },
  draftAndPublish: false,
  displayName: 'Clone FK inverse',
  singularName: 'clone-fk-inverse',
  pluralName: 'clone-fk-inverses',
  description: '',
  collectionName: '',
};

const fkInverseBaseModel = {
  ...fkInverseModel,
  attributes: {
    name: { type: 'string' },
  },
};

const fkOwnerBaseModel = {
  ...fkOwnerModel,
  attributes: {
    ...fkOwnerModel.attributes,
    inverse: {
      ...fkOwnerModel.attributes.inverse,
      inversedBy: undefined,
    },
  },
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

const readPlainRelation = async (
  trx: Knex.Transaction,
  entryId: number,
  attributeName: 'tag' | 'mto'
) => {
  const meta = strapi.db.metadata.get(PLAIN_UID);
  const attribute = meta.attributes[attributeName] as {
    joinColumn?: { name?: string };
    morphColumn?: { idColumn?: { name?: string }; typeColumn?: { name?: string } };
  };
  const idColumn =
    attributeName === 'tag' ? attribute.joinColumn?.name : attribute.morphColumn?.idColumn?.name;
  const typeColumn = attribute.morphColumn?.typeColumn?.name;
  const columns = [idColumn!, ...(typeColumn ? [typeColumn] : [])];
  const row = await strapi.db
    .connection(meta.tableName)
    .where({ id: entryId })
    .select(columns)
    .transacting(trx)
    .first();

  return {
    id: row?.[idColumn!] ?? null,
    type: typeColumn ? (row?.[typeColumn] ?? null) : null,
  };
};

describe('Document Service clone relation operation payloads', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes([
        tagModel,
        productModel,
        categoryModel,
        morphBoxModel,
        localizedTagModel,
        plainModel,
        fkInverseBaseModel,
        fkOwnerBaseModel,
      ])
      .build();

    await modelsUtils.modifyContentType(fkInverseModel);
    await modelsUtils.modifyContentType(fkOwnerModel);

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
    'clone applies duplicate-form selected target for a useJoinTable:false oneToOne relation',
    async () => {
      const { product, tag: originalTag } = await createLegacyTaggedProduct(
        'Legacy Selected Source Product',
        'Legacy Selected Original Tag'
      );
      const selectedTag = await createTag('Legacy Selected Tag');

      const result = await strapi.documents(PRODUCT_UID).clone({
        documentId: product.documentId,
        locale: 'en',
        data: {
          name: 'Legacy Selected Clone',
          legacyTag: {
            connect: [{ documentId: selectedTag.documentId }],
            disconnect: [{ documentId: originalTag.documentId }],
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
        cloneLegacyTagDocumentId: selectedTag.documentId,
        originalLegacyTagDocumentId: originalTag.documentId,
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

  testInTransaction('clone applies duplicate-form selected target for morphToOne', async () => {
    const targetA = await strapi.documents(MORPH_BOX_UID).create({ data: { name: 'Morph A' } });
    const targetB = await strapi
      .documents(MORPH_BOX_UID)
      .create({ data: { name: 'Morph B Selected' } });
    const targetARow = await strapi.db.query(MORPH_BOX_UID).findOne({
      where: { documentId: targetA.documentId, publishedAt: null },
    });
    const targetBRow = await strapi.db.query(MORPH_BOX_UID).findOne({
      where: { documentId: targetB.documentId, publishedAt: null },
    });

    const source = await strapi.documents(MORPH_BOX_UID).create({
      data: {
        name: 'Morph Selected Source',
        mto: { id: targetARow!.id, __type: MORPH_BOX_UID },
      },
      populate: { mto: true },
    });

    const result = await strapi.documents(MORPH_BOX_UID).clone({
      documentId: source.documentId,
      data: {
        name: 'Morph Selected Clone',
        mto: {
          connect: [{ id: targetBRow!.id, __type: MORPH_BOX_UID }],
          disconnect: [{ id: targetARow!.id, __type: MORPH_BOX_UID }],
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
      cloneMorphTarget: targetB.documentId,
      originalMorphTarget: targetA.documentId,
    });
  });

  testInTransaction(
    'clone does not copy an inverse useJoinTable:false joinColumn as an FK',
    async (trx: Knex.Transaction) => {
      const inverse = await strapi.documents(FK_INVERSE_UID).create({
        data: { name: 'Inverse source' },
      });
      const owner = await strapi.documents(FK_OWNER_UID).create({
        data: {
          name: 'Owner source',
          inverse: inverse.id,
        },
        populate: { inverse: true },
      });

      const decoy = await strapi.documents(FK_OWNER_UID).create({
        data: { name: 'Decoy owner' },
      });

      const result = await strapi.documents(FK_INVERSE_UID).clone({
        documentId: inverse.documentId,
        data: { name: 'Inverse clone' },
        populate: { owner: true },
      });

      const original = await strapi.documents(FK_INVERSE_UID).findOne({
        documentId: inverse.documentId,
        populate: { owner: true },
      });
      const clone = result.entries[0] as { owner?: { documentId?: string } | null };

      const ownerMeta = strapi.db.metadata.get(FK_OWNER_UID);
      const inverseColumn = (
        ownerMeta.attributes.inverse as { joinColumn?: { name?: string } } | undefined
      )?.joinColumn?.name;
      const decoyRow = await strapi.db
        .connection(ownerMeta.tableName)
        .where({ id: decoy.id })
        .select([inverseColumn!])
        .transacting(trx)
        .first();

      expect({
        cloneOwnerDocumentId: clone?.owner?.documentId ?? null,
        originalOwnerDocumentId: (original as { owner?: { documentId?: string } | null })?.owner
          ?.documentId,
        decoyInverseId: decoyRow?.[inverseColumn!] ?? null,
      }).toEqual({
        cloneOwnerDocumentId: null,
        originalOwnerDocumentId: owner.documentId,
        decoyInverseId: null,
      });
    }
  );

  testInTransaction(
    'clone copies an owning useJoinTable:false FK to keep the original target',
    async () => {
      const inverse = await strapi.documents(FK_INVERSE_UID).create({
        data: { name: 'Owned inverse' },
      });
      const owner = await strapi.documents(FK_OWNER_UID).create({
        data: {
          name: 'Owning source',
          inverse: inverse.id,
        },
        populate: { inverse: true },
      });

      const result = await strapi.documents(FK_OWNER_UID).clone({
        documentId: owner.documentId,
        data: { name: 'Owning clone' },
        populate: { inverse: true },
      });

      const original = await strapi.documents(FK_OWNER_UID).findOne({
        documentId: owner.documentId,
        populate: { inverse: true },
      });
      const clone = result.entries[0] as { inverse?: { documentId?: string } | null };

      expect({
        cloneInverseDocumentId: clone?.inverse?.documentId ?? null,
        originalInverseDocumentId: (original as { inverse?: { documentId?: string } | null })
          ?.inverse?.documentId,
      }).toEqual({
        cloneInverseDocumentId: inverse.documentId,
        originalInverseDocumentId: inverse.documentId,
      });
    }
  );

  testInTransaction(
    'clone honors connect status:published for an inline D&P target',
    async (trx: Knex.Transaction) => {
      const tag = await createTag('Published connect target');
      await strapi.documents(TAG_UID).publish({ documentId: tag.documentId });

      const draftRow = await strapi.db.query(TAG_UID).findOne({
        where: { documentId: tag.documentId, publishedAt: null },
      });
      const publishedRow = await strapi.db.query(TAG_UID).findOne({
        where: { documentId: tag.documentId, publishedAt: { $ne: null } },
      });

      expect(draftRow?.id).not.toBe(publishedRow?.id);

      const source = await strapi.documents(PLAIN_UID).create({
        data: { name: 'Plain source', tag: draftRow!.id },
      });

      const result = await strapi.documents(PLAIN_UID).clone({
        documentId: source.documentId,
        data: {
          name: 'Plain clone',
          tag: {
            connect: [{ documentId: tag.documentId, status: 'published' }],
          },
        },
        populate: { tag: true },
      });

      const plainMeta = strapi.db.metadata.get(PLAIN_UID);
      const tagColumn = (plainMeta.attributes.tag as { joinColumn?: { name?: string } } | undefined)
        ?.joinColumn?.name;
      expect(tagColumn).toBeDefined();

      const cloneRow = await strapi.db
        .connection(plainMeta.tableName)
        .where({ id: result.entries[0].id })
        .select([tagColumn!])
        .transacting(trx)
        .first();

      expect({
        storedTagId: cloneRow?.[tagColumn!] ?? null,
        publishedTagId: publishedRow?.id ?? null,
        draftTagId: draftRow?.id ?? null,
      }).toEqual({
        storedTagId: publishedRow?.id,
        publishedTagId: publishedRow?.id,
        draftTagId: draftRow?.id,
      });
    }
  );

  testInTransaction(
    'clone uses the default locale for an inline relation from a non-localized source',
    async () => {
      const localizedTag = await strapi.documents(LOCALIZED_TAG_UID).create({
        locale: 'es',
        data: { name: 'Spanish only' },
      });
      const source = await strapi.documents(PLAIN_UID).create({
        data: { name: 'Plain localized source' },
      });

      await expect(
        strapi.documents(PLAIN_UID).clone({
          documentId: source.documentId,
          data: {
            name: 'Plain localized clone',
            localizedTag: {
              connect: [{ documentId: localizedTag.documentId }],
            },
          },
        })
      ).rejects.toThrow('Unable to resolve relation target for clone relation update');
    }
  );

  testInTransaction(
    'clone keeps the current useJoinTable:false target when disconnect does not match',
    async () => {
      const { product, tag: originalTag } = await createLegacyTaggedProduct(
        'Unmatched disconnect source',
        'Unmatched disconnect original'
      );
      const unrelatedTag = await createTag('Unmatched disconnect other');

      const result = await strapi.documents(PRODUCT_UID).clone({
        documentId: product.documentId,
        locale: 'en',
        data: {
          name: 'Unmatched disconnect clone',
          legacyTag: {
            disconnect: [{ documentId: unrelatedTag.documentId }],
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
        cloneLegacyTagDocumentId: originalTag.documentId,
        originalLegacyTagDocumentId: originalTag.documentId,
      });
    }
  );

  testInTransaction(
    'clone keeps the current morphToOne target when disconnect does not match',
    async () => {
      const targetA = await strapi.documents(MORPH_BOX_UID).create({
        data: { name: 'Morph keep A' },
      });
      const targetB = await strapi.documents(MORPH_BOX_UID).create({
        data: { name: 'Morph other B' },
      });
      const targetARow = await strapi.db.query(MORPH_BOX_UID).findOne({
        where: { documentId: targetA.documentId, publishedAt: null },
      });
      const targetBRow = await strapi.db.query(MORPH_BOX_UID).findOne({
        where: { documentId: targetB.documentId, publishedAt: null },
      });

      const source = await strapi.documents(MORPH_BOX_UID).create({
        data: {
          name: 'Morph unmatched source',
          mto: { id: targetARow!.id, __type: MORPH_BOX_UID },
        },
        populate: { mto: true },
      });

      const result = await strapi.documents(MORPH_BOX_UID).clone({
        documentId: source.documentId,
        data: {
          name: 'Morph unmatched clone',
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
        originalMorphTarget: (original as { mto?: { documentId?: string } | null })?.mto
          ?.documentId,
      }).toEqual({
        cloneMorphTarget: targetA.documentId,
        originalMorphTarget: targetA.documentId,
      });
    }
  );

  testInTransaction(
    'clone clears an inline FK when documentId disconnect matches the other publication row',
    async (trx: Knex.Transaction) => {
      const tag = await createTag('Draft row disconnect target');
      await strapi.documents(TAG_UID).publish({ documentId: tag.documentId });
      const draftRow = await strapi.db.query(TAG_UID).findOne({
        where: { documentId: tag.documentId, publishedAt: null },
      });
      const publishedRow = await strapi.db.query(TAG_UID).findOne({
        where: { documentId: tag.documentId, publishedAt: { $ne: null } },
      });
      expect(draftRow?.id).not.toBe(publishedRow?.id);

      const source = await strapi.documents(PLAIN_UID).create({
        data: { name: 'Plain draft FK source', tag: draftRow!.id },
      });

      const result = await strapi.documents(PLAIN_UID).clone({
        documentId: source.documentId,
        data: {
          name: 'Plain draft FK clone',
          tag: { disconnect: [{ documentId: tag.documentId }] },
        },
      });

      const cloneTag = await readPlainRelation(trx, result.entries[0].id, 'tag');
      const sourceTag = await readPlainRelation(trx, source.id, 'tag');

      expect({
        cloneTagId: cloneTag.id,
        sourceTagId: sourceTag.id,
        draftId: draftRow?.id ?? null,
        publishedId: publishedRow?.id ?? null,
      }).toEqual({
        cloneTagId: null,
        sourceTagId: draftRow?.id,
        draftId: draftRow?.id,
        publishedId: publishedRow?.id,
      });
    }
  );

  testInTransaction(
    'clone keeps an inline FK when disconnect names only the other publication status',
    async (trx: Knex.Transaction) => {
      const tag = await createTag('Status specific disconnect target');
      await strapi.documents(TAG_UID).publish({ documentId: tag.documentId });
      const draftRow = await strapi.db.query(TAG_UID).findOne({
        where: { documentId: tag.documentId, publishedAt: null },
      });

      const source = await strapi.documents(PLAIN_UID).create({
        data: { name: 'Plain status disconnect source', tag: draftRow!.id },
      });

      const result = await strapi.documents(PLAIN_UID).clone({
        documentId: source.documentId,
        data: {
          name: 'Plain status disconnect clone',
          tag: { disconnect: [{ documentId: tag.documentId, status: 'published' }] },
        },
      });

      const cloneTag = await readPlainRelation(trx, result.entries[0].id, 'tag');

      expect(cloneTag.id).toBe(draftRow?.id);
    }
  );

  testInTransaction(
    'clone clears a morphToOne when documentId disconnect matches the other publication row',
    async (trx: Knex.Transaction) => {
      const tag = await createTag('Morph draft row disconnect target');
      await strapi.documents(TAG_UID).publish({ documentId: tag.documentId });
      const draftRow = await strapi.db.query(TAG_UID).findOne({
        where: { documentId: tag.documentId, publishedAt: null },
      });

      const source = await strapi.documents(PLAIN_UID).create({
        data: {
          name: 'Plain morph draft source',
          mto: { id: draftRow!.id, __type: TAG_UID },
        },
      });

      const result = await strapi.documents(PLAIN_UID).clone({
        documentId: source.documentId,
        data: {
          name: 'Plain morph draft clone',
          mto: { disconnect: [{ documentId: tag.documentId, __type: TAG_UID }] },
        },
      });

      const cloneMorph = await readPlainRelation(trx, result.entries[0].id, 'mto');
      const sourceMorph = await readPlainRelation(trx, source.id, 'mto');

      expect({
        cloneMorphId: cloneMorph.id,
        cloneMorphType: cloneMorph.type,
        sourceMorphId: sourceMorph.id,
        sourceMorphType: sourceMorph.type,
      }).toEqual({
        cloneMorphId: null,
        cloneMorphType: null,
        sourceMorphId: draftRow?.id,
        sourceMorphType: TAG_UID,
      });
    }
  );

  testInTransaction(
    'clone accepts a single object connect for an inline relation',
    async (trx: Knex.Transaction) => {
      const originalTag = await createTag('Object connect original');
      const selectedTag = await createTag('Object connect selected');
      const source = await strapi.documents(PLAIN_UID).create({
        data: { name: 'Object connect source', tag: originalTag.id },
      });

      const result = await strapi.documents(PLAIN_UID).clone({
        documentId: source.documentId,
        data: {
          name: 'Object connect clone',
          tag: {
            connect: { documentId: selectedTag.documentId },
            disconnect: [{ documentId: originalTag.documentId }],
          },
        },
        populate: { tag: true },
      });

      const original = await strapi.documents(PLAIN_UID).findOne({
        documentId: source.documentId,
        populate: { tag: true },
      });
      const cloneTag = await readPlainRelation(trx, result.entries[0].id, 'tag');

      expect({
        cloneTagDocumentId: (result.entries[0] as { tag?: { documentId?: string } | null }).tag
          ?.documentId,
        cloneTagId: cloneTag.id,
        originalTagDocumentId: (original as { tag?: { documentId?: string } | null })?.tag
          ?.documentId,
      }).toEqual({
        cloneTagDocumentId: selectedTag.documentId,
        cloneTagId: selectedTag.id,
        originalTagDocumentId: originalTag.documentId,
      });
    }
  );

  testInTransaction(
    'clone accepts a single object set and a single object disconnect',
    async (trx: Knex.Transaction) => {
      const originalTag = await createTag('Object set original');
      const selectedTag = await createTag('Object set selected');
      const disconnectSource = await strapi.documents(PLAIN_UID).create({
        data: { name: 'Object disconnect source', tag: originalTag.id },
      });
      const setSource = await strapi.documents(PLAIN_UID).create({
        data: { name: 'Object set source', tag: originalTag.id },
      });

      const disconnected = await strapi.documents(PLAIN_UID).clone({
        documentId: disconnectSource.documentId,
        data: {
          name: 'Object disconnect clone',
          tag: { disconnect: { documentId: originalTag.documentId } },
        },
      });
      const replaced = await strapi.documents(PLAIN_UID).clone({
        documentId: setSource.documentId,
        data: {
          name: 'Object set clone',
          tag: { set: { documentId: selectedTag.documentId } },
        },
      });

      const disconnectedTag = await readPlainRelation(trx, disconnected.entries[0].id, 'tag');
      const replacedTag = await readPlainRelation(trx, replaced.entries[0].id, 'tag');
      const originalTagRow = await readPlainRelation(trx, setSource.id, 'tag');

      expect({
        disconnectedTagId: disconnectedTag.id,
        replacedTagId: replacedTag.id,
        sourceTagId: originalTagRow.id,
      }).toEqual({
        disconnectedTagId: null,
        replacedTagId: selectedTag.id,
        sourceTagId: originalTag.id,
      });
    }
  );

  testInTransaction(
    'clone accepts a single object connect for a morphToOne',
    async (trx: Knex.Transaction) => {
      const originalTag = await createTag('Object morph original');
      const selectedTag = await createTag('Object morph selected');
      const originalRow = await strapi.db.query(TAG_UID).findOne({
        where: { documentId: originalTag.documentId, publishedAt: null },
      });
      const source = await strapi.documents(PLAIN_UID).create({
        data: {
          name: 'Object morph source',
          mto: { id: originalRow!.id, __type: TAG_UID },
        },
      });

      const result = await strapi.documents(PLAIN_UID).clone({
        documentId: source.documentId,
        data: {
          name: 'Object morph clone',
          mto: {
            connect: { documentId: selectedTag.documentId, __type: TAG_UID },
          },
        },
      });

      const cloneMorph = await readPlainRelation(trx, result.entries[0].id, 'mto');
      const sourceMorph = await readPlainRelation(trx, source.id, 'mto');

      expect({
        cloneMorphId: cloneMorph.id,
        cloneMorphType: cloneMorph.type,
        sourceMorphId: sourceMorph.id,
      }).toEqual({
        cloneMorphId: selectedTag.id,
        cloneMorphType: TAG_UID,
        sourceMorphId: originalRow?.id,
      });
    }
  );
});
