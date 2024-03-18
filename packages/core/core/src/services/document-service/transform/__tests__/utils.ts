import { Schema, Common } from '@strapi/types';

const createSchemaFromAttributes = (
  uid: Common.UID.ContentType,
  attributes: Schema.Attributes,
  singularName?: string,
  pluralName?: string,
  options?: Schema.ContentType['options']
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
    options: {
      draftAndPublish: true,
      ...options,
    },
    globalId: uid,
    modelType: 'contentType',
    attributes,
  };
};

export const CATEGORY_UID = 'api::category.category' as Common.UID.ContentType;
export const PRODUCT_UID = 'api::product.product' as Common.UID.ContentType;
export const SHOP_UID = 'api::shop.shop' as Common.UID.ContentType;

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
      shops: {
        type: 'relation',
        relation: 'manyToMany',
        target: SHOP_UID,
        inversedBy: 'products',
      },
      shop: {
        type: 'relation',
        relation: 'oneToOne',
        target: SHOP_UID,
        inversedBy: 'product',
      },
    },
    'product',
    'products'
  ),
  [SHOP_UID]: createSchemaFromAttributes(
    SHOP_UID,
    {
      id: {
        type: 'string',
      },
      name: {
        type: 'string',
      },
      products: {
        type: 'relation',
        relation: 'manyToMany',
        target: PRODUCT_UID,
        mappedBy: 'shop',
      },
      product: {
        type: 'relation',
        relation: 'oneToOne',
        target: PRODUCT_UID,
        mappedBy: 'shops',
      },
    },
    'shop',
    'shops',
    { draftAndPublish: false }
  ),
};
