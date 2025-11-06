/**
 * Relations interactions with non DP content types.
 */
import type { Core, UID } from '@strapi/types';

import { testInTransaction } from '../../../../utils';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

let strapi: Core.Strapi;
const builder = createTestBuilder();
let productDocuments;
let tagDocuments;
let shopDocuments;
let rq;

const PRODUCT_UID = 'api::product.product' as UID.ContentType;
const TAG_UID = 'api::tag.tag' as UID.ContentType;
const SHOP_UID = 'api::shop.shop' as UID.ContentType;

const productModel = {
  attributes: {
    name: {
      type: 'string',
    },
    tag: {
      type: 'relation',
      relation: 'oneToOne',
      target: TAG_UID,
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

const shopModel = {
  attributes: {
    name: { type: 'string' },
    products_ow: {
      type: 'relation',
      relation: 'oneToOne',
      target: PRODUCT_UID,
    },
    products_oo: {
      type: 'relation',
      relation: 'oneToOne',
      target: PRODUCT_UID,
      targetAttribute: 'shop',
    },
    products_mo: {
      type: 'relation',
      relation: 'manyToOne',
      target: PRODUCT_UID,
      targetAttribute: 'shops_mo',
    },
    products_om: {
      type: 'relation',
      relation: 'oneToMany',
      target: PRODUCT_UID,
      targetAttribute: 'shop_om',
    },
    products_mm: {
      type: 'relation',
      relation: 'manyToMany',
      target: PRODUCT_UID,
      targetAttribute: 'shops',
    },
    products_mw: {
      type: 'relation',
      relation: 'oneToMany',
      target: PRODUCT_UID,
    },
  },
  draftAndPublish: false,
  displayName: 'Shop',
  singularName: 'shop',
  pluralName: 'shops',
};

// TODO: Test relations in components
describe('Relations interactions with disabled DP content types', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes([tagModel, productModel, shopModel])
      .addFixtures('plugin::i18n.locale', [{ name: 'Es', code: 'es' }])
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    // PRODUCTS
    await strapi.db.query(PRODUCT_UID).createMany({
      data: [
        { documentId: 'Skate', name: 'Skate-En', locale: 'en', publishedAt: null },
        { documentId: 'Skate', name: 'Skate-En', locale: 'en', publishedAt: new Date() },
        { documentId: 'Skate', name: 'Skate-Es', locale: 'es', publishedAt: null },
        { documentId: 'Candle', name: 'Candle-En', locale: 'en', publishedAt: null },
        { documentId: 'Candle', name: 'Candle-Es', locale: 'es', publishedAt: null },
        { documentId: 'Mug', name: 'Mug-En', locale: 'en', publishedAt: null },
        { documentId: 'Mug', name: 'Mug-Es', locale: 'es', publishedAt: null },
      ],
    });

    // TAGS
    await strapi.db.query(TAG_UID).createMany({
      data: [
        { documentId: 'Tag1', name: 'Tag1', publishedAt: null },
        { documentId: 'Tag2', name: 'Tag2', publishedAt: null },
        { documentId: 'Tag3', name: 'Tag3', publishedAt: null },
      ],
    });

    await strapi.db.query(SHOP_UID).createMany({
      data: [
        { documentId: 'Shop1', name: 'Shop1', publishedAt: new Date() },
        { documentId: 'Shop2', name: 'Shop2', publishedAt: new Date() },
      ],
    });

    productDocuments = strapi.documents(PRODUCT_UID);
    tagDocuments = strapi.documents(TAG_UID);
    shopDocuments = strapi.documents(SHOP_UID);
  });

  afterAll(async () => {
    // Delete all locales that have been created
    await strapi.db.query('plugin::i18n.locale').deleteMany({ where: { code: { $ne: 'en' } } });

    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Non DP (Shop) -> DP (Product)', () => {
    const xToOneRelations = ['products_ow', 'products_oo', 'products_mo'];
    const xToManyRelations = ['products_om', 'products_mm', 'products_mw'];
    const allRelations = [...xToOneRelations, ...xToManyRelations];

    describe('X to X relation', () => {
      testInTransaction('Connect to both draft and publish versions if not specified', async () => {
        // Create and populate the published versions of the relations
        const shopPublished = await shopDocuments.create({
          data: {
            products_mo: { documentId: 'Skate', locale: 'en' },
            products_oo: { documentId: 'Skate', locale: 'en' },
            products_ow: { documentId: 'Skate', locale: 'en' },
            products_om: [{ documentId: 'Skate', locale: 'en' }],
            products_mm: [{ documentId: 'Skate', locale: 'en' }],
            products_mw: [{ documentId: 'Skate', locale: 'en' }],
          },
          locale: 'en',
          status: 'published',
          populate: xToOneRelations,
        });

        xToOneRelations.forEach((relation) => {
          expect(shopPublished[relation]).toMatchObject({
            name: 'Skate-En',
            locale: 'en',
            publishedAt: expect.any(String),
          });
        });

        // Create and populate the draft versions of the relations
        const shopDraft = await shopDocuments.create({
          data: {
            products_mo: { documentId: 'Skate', locale: 'en' },
            products_oo: { documentId: 'Skate', locale: 'en' },
            products_ow: { documentId: 'Skate', locale: 'en' },
          },
          locale: 'en',
          status: 'draft',
          populate: xToOneRelations,
        });

        xToOneRelations.forEach((relation) => {
          expect(shopDraft[relation]).toMatchObject({
            name: 'Skate-En',
            locale: 'en',
            publishedAt: null,
          });
        });
      });

      testInTransaction('Publishing DP side should copy draft relation', async () => {
        // Create shop targeting a draft product
        const shop = await shopDocuments.create({
          data: {
            name: 'Shop1',
            products_mo: { documentId: 'Skate', locale: 'en', status: 'draft' },
            products_oo: { documentId: 'Skate', locale: 'en', status: 'draft' },
            products_ow: { documentId: 'Skate', locale: 'en', status: 'draft' },
            products_om: [{ documentId: 'Skate', locale: 'en', status: 'draft' }],
            products_mm: [{ documentId: 'Skate', locale: 'en', status: 'draft' }],
            products_mw: [{ documentId: 'Skate', locale: 'en', status: 'draft' }],
          },
          // TODO: Setting status published should return only published relations, but it's not working now
          status: 'published',
          populate: allRelations,
        });

        // Publish connected product
        await productDocuments.publish({ documentId: 'Skate', locale: 'en' });

        // Get shop again to check if it's product relations are updated to the published version,
        // the draft relation should still be in place
        const draftShop = await shopDocuments.findOne({
          documentId: shop.documentId,
          populate: allRelations,
          status: 'draft',
        });

        const publishedShop = await shopDocuments.findOne({
          documentId: shop.documentId,
          populate: allRelations,
          status: 'published',
        });

        const draftRelation = { name: 'Skate-En', publishedAt: null };
        const publishedRelation = { name: 'Skate-En', publishedAt: expect.any(String) };

        expect(draftShop.products_mo).toMatchObject(draftRelation);
        expect(draftShop.products_oo).toMatchObject(draftRelation);
        expect(draftShop.products_ow).toMatchObject(draftRelation);
        expect(draftShop.products_om).toMatchObject([draftRelation]);
        expect(draftShop.products_mm).toMatchObject([draftRelation]);

        expect(publishedShop.products_mo).toMatchObject(publishedRelation);
        expect(publishedShop.products_oo).toMatchObject(publishedRelation);
        expect(publishedShop.products_om).toMatchObject([publishedRelation]);
        expect(publishedShop.products_mm).toMatchObject([publishedRelation]);
        // TODO: We don't have a good way to handle one way relations here
        // expect(updatedShop.products_ow).toMatchObject(publishedRelation);
        // expect(publishedShop.products_mw).toMatchObject([publishedRelation]);
      });

      // Fetch relations, should fetch the status
      testInTransaction('Populate relations in a specific status', async () => {
        const shop = await shopDocuments.create({
          data: {
            products_mo: { documentId: 'Skate', locale: 'en', status: 'draft' },
            products_oo: { documentId: 'Skate', locale: 'en', status: 'published' },
            products_ow: { documentId: 'Skate', locale: 'en', status: 'draft' },
          },
          populate: xToOneRelations,
        });

        const draftShop = await shopDocuments.findOne({
          documentId: shop.documentId,
          // should only populate the draft versions of relations
          status: 'draft',
          populate: xToOneRelations,
        });

        const publishedShop = await shopDocuments.findOne({
          documentId: shop.documentId,
          // should only populate the published versions of relations
          status: 'published',
          populate: xToOneRelations,
        });

        expect(draftShop.products_mo).toMatchObject({ name: 'Skate-En', publishedAt: null });
        expect(draftShop.products_oo).toBe(null);
        expect(draftShop.products_ow).toMatchObject({ name: 'Skate-En', publishedAt: null });

        expect(publishedShop.products_mo).toBe(null);
        expect(publishedShop.products_oo).toMatchObject({ publishedAt: expect.any(String) });
        expect(publishedShop.products_ow).toBe(null);
      });
    });

    describe('X to One relation', () => {
      testInTransaction('Can consecutively connect to draft and published versions', async () => {
        // XToOne relations are not connected with an array,
        // the only way to connect both draft and published versions
        // is to make two separate requests

        // Create shop targeting a draft product
        const shop = await shopDocuments.create({
          data: {
            products_ow: { documentId: 'Skate', locale: 'en', status: 'draft' },
            products_oo: { documentId: 'Skate', locale: 'en', status: 'draft' },
            products_mo: { documentId: 'Skate', locale: 'en', status: 'draft' },
          },
        });

        // Update to connect to the published version too
        await shopDocuments.update({
          documentId: shop.documentId,
          data: {
            products_ow: {
              connect: [{ documentId: 'Skate', locale: 'en', status: 'published' }],
            },
            products_oo: {
              connect: [{ documentId: 'Skate', locale: 'en', status: 'published' }],
            },
            products_mo: {
              connect: [{ documentId: 'Skate', locale: 'en', status: 'published' }],
            },
          },
        });

        // Fetch the shop to check if the relations are connected to the draft and published versions
        const draftShop = await shopDocuments.findOne({
          documentId: shop.documentId,
          populate: xToOneRelations,
          status: 'draft',
        });

        const publishedShop = await shopDocuments.findOne({
          documentId: shop.documentId,
          populate: xToOneRelations,
          status: 'published',
        });

        const draftRelation = { name: 'Skate-En', publishedAt: null };
        const publishedRelation = { name: 'Skate-En', publishedAt: expect.any(String) };

        expect(draftShop.products_ow).toMatchObject(draftRelation);
        expect(draftShop.products_oo).toMatchObject(draftRelation);
        expect(draftShop.products_mo).toMatchObject(draftRelation);

        expect(publishedShop.products_ow).toMatchObject(publishedRelation);
        expect(publishedShop.products_oo).toMatchObject(publishedRelation);
        expect(publishedShop.products_mo).toMatchObject(publishedRelation);
      });
    });

    describe('X to Many relation', () => {
      testInTransaction('Can connect to draft and published versions at once', async () => {
        const shop = await shopDocuments.create({
          data: {
            name: 'Shop1',
            products_mm: [
              { documentId: 'Skate', locale: 'en', status: 'draft' },
              { documentId: 'Skate', locale: 'en', status: 'published' },
            ],
            products_om: [
              { documentId: 'Skate', locale: 'en', status: 'draft' },
              { documentId: 'Skate', locale: 'en', status: 'published' },
            ],
            products_mw: [
              { documentId: 'Skate', locale: 'en', status: 'draft' },
              { documentId: 'Skate', locale: 'en', status: 'published' },
            ],
          },
          // TODO: Setting status published should return only published relations, but it's not working now
          status: 'published',
          populate: xToOneRelations,
        });

        const draftRelation = { name: 'Skate-En', publishedAt: null };
        const publishedRelation = { name: 'Skate-En', publishedAt: expect.any(String) };

        // TODO: Atm query.filters populate is not applying on create and update, so this might return both draft and published versions
        // expect(shop.products_mm).toMatchObject([publishedRelation]);
        // expect(shop.products_om).toMatchObject([publishedRelation]);
        // expect(shop.products_mw).toMatchObject([publishedRelation]);

        const draftShop = await shopDocuments.findOne({
          documentId: shop.documentId,
          populate: xToManyRelations,
          status: 'draft',
        });

        const publishedShop = await shopDocuments.findOne({
          documentId: shop.documentId,
          populate: xToManyRelations,
          status: 'published',
        });

        expect(draftShop.products_mm).toMatchObject([draftRelation]);
        expect(draftShop.products_om).toMatchObject([draftRelation]);
        expect(draftShop.products_mw).toMatchObject([draftRelation]);

        expect(publishedShop.products_mm).toMatchObject([publishedRelation]);
        expect(publishedShop.products_om).toMatchObject([publishedRelation]);
        expect(publishedShop.products_mw).toMatchObject([publishedRelation]);
      });
    });
  });

  describe('DP (Product) -> Non DP (Shop)', () => {
    describe('X to X relation', () => {
      // Can connect to a shop
      testInTransaction('Can connect to a shop', async () => {
        const product = await productDocuments.create({
          data: {
            name: 'Skate',
            // Status is ignored
            shop: { documentId: 'Shop1', status: 'draft' },
          },
          populate: ['shop'],
        });

        expect(product.shop).toMatchObject({ name: 'Shop1' });
      });
    });
  });

  describe('Non DP (Shop) -> Non DP (Shop)', () => {});
});
