import { Schema, Common } from '@strapi/types';

const createSchemaFromAttributes = (
  uid: Common.UID.ContentType,
  attributes: Schema.Attributes,
  singularName?: string,
  pluralName?: string
): Schema.ContentType => {
  return {
    uid,
    info: {
      displayName: 'Test',
      singularName: singularName || 'test',
      pluralName: pluralName || 'tests',
    },
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
  [CATEGORY_UID]: createSchemaFromAttributes(
    CATEGORY_UID,
    {
      id: {
        type: 'string',
      },
      name: {
        type: 'string',
      },
      relatedCategories: {
        type: 'relation',
        relation: 'oneToMany',
        target: CATEGORY_UID,
      },
      products: {
        type: 'relation',
        relation: 'manyToMany',
        target: PRODUCT_UID,
        mappedBy: 'categories',
      },
    },
    'category',
    'categories'
  ),
  [PRODUCT_UID]: createSchemaFromAttributes(
    PRODUCT_UID,
    {
      id: {
        type: 'string',
      },
      name: {
        type: 'string',
      },
      categories: {
        type: 'relation',
        relation: 'manyToMany',
        target: CATEGORY_UID,
        inversedBy: 'products',
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
    },
    'product',
    'products'
  ),
};
