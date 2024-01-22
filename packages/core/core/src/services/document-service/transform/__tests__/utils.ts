import { Schema, Common } from '@strapi/types';

const createSchemaFromAttributes = (
  uid: Common.UID.ContentType,
  attributes: Schema.Attributes
): Schema.ContentType => {
  return {
    uid,
    info: { displayName: 'Test', singularName: 'test', pluralName: 'tests' },
    kind: 'collectionType',
    modelName: uid,
    globalId: uid,
    modelType: 'contentType',
    attributes,
  };
};

export const CATEGORY_UID = 'api::category.category' as Common.UID.ContentType;
export const PRODUCT_UID = 'api::product.product' as Common.UID.ContentType;

export const models: Record<string, Schema.ContentType> = {
  [CATEGORY_UID]: createSchemaFromAttributes(CATEGORY_UID, {
    name: {
      type: 'string',
    },
  }),
  [PRODUCT_UID]: createSchemaFromAttributes(PRODUCT_UID, {
    name: {
      type: 'string',
    },
    categories: {
      type: 'relation',
      relation: 'manyToMany',
      target: CATEGORY_UID,
    },
    category: {
      type: 'relation',
      relation: 'oneToOne',
      target: CATEGORY_UID,
    },
    relatedProducts: {
      type: 'relation',
      relation: 'oneToMany',
      target: PRODUCT_UID,
    },
  }),
};
