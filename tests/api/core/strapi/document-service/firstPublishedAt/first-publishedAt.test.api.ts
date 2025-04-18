import type { Core, UID } from '@strapi/types';
import { testInTransaction } from '../../../../utils';
import { findArticleDb } from '../utils';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

let strapi: Core.Strapi;
let shopDocuments;
let shopsDB;
let productDocuments;
let productsDB;
let tagDocuments;
let tagsDB;
const builder = createTestBuilder();

const SHOP_UID = 'api::shop.shop' as UID.ContentType;
const PRODUCT_UID = 'api::product.product' as UID.ContentType;
const TAG_UID = 'api::tag.tag' as UID.ContentType;

const shopModel = {
  attributes: {
    name: {
      type: 'string',
    },
  },
  draftAndPublish: true,
  firstPublishedAtField: false,
  displayName: 'Shop',
  singularName: 'shop',
  pluralName: 'shops',
};

const productModel = {
  attributes: {
    name: {
      type: 'string',
    },
  },
  draftAndPublish: false,
  firstPublishedAtField: true,
  displayName: 'Product',
  singularName: 'product',
  pluralName: 'products',
};

const tagModel = {
  attributes: {
    name: {
      type: 'string',
    },
  },
  draftAndPublish: true,
  firstPublishedAtField: true,
  displayName: 'Tag',
  singularName: 'tag',
  pluralName: 'tags',
};

describe('First published at', () => {
  beforeAll(async () => {
    await builder.addContentTypes([shopModel, productModel, tagModel]).build();

    strapi = await createStrapiInstance();
    shopDocuments = strapi.documents(SHOP_UID);
    shopsDB = strapi.db.query(SHOP_UID);
    productDocuments = strapi.documents(PRODUCT_UID);
    productsDB = strapi.db.query(PRODUCT_UID);
    tagDocuments = strapi.documents(TAG_UID);
    tagsDB = strapi.db.query(TAG_UID);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  testInTransaction(
    'If first published at is false, this field should not exist in the database',
    async () => {
      const shop = await shopDocuments.create({ data: { name: 'Shop1' } });

      await shopDocuments.publish({ documentId: shop.documentId });

      const databaseShops = await shopsDB.findOne({
        where: { documentId: shop.documentId, publishedAt: { $notNull: true } },
      });

      expect(databaseShops.firstPublishedAt).not.toBeDefined();
    }
  );

  testInTransaction(
    'If first published at is true but draft and publish is false, firstPublishedAt field should not be added in the database',
    async () => {
      const product = await productDocuments.create({ data: { name: 'Product1' } });

      const databaseProducts = await productsDB.findOne({
        where: { documentId: product.documentId, publishedAt: { $notNull: true } },
      });

      expect(databaseProducts.firstPublishedAt).not.toBeDefined();
    }
  );

  testInTransaction(
    'If first published at is enabled, firstPublishedAt value should not exist for draft data',
    async () => {
      const tag = await tagDocuments.create({ data: { name: 'Tag1' } });

      await tagDocuments.publish({ documentId: tag.documentId });

      const databaseTags = await tagsDB.findOne({
        where: { documentId: tag.documentId, publishedAt: { $notNull: false } },
      });

      expect(databaseTags.firstPublishedAtField).not.toBeDefined();
    }
  );
});
