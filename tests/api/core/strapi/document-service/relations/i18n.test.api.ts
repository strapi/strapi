/**
 * Relations interactions with i18n.
 *
 * TODO: Move to i18n tests
 * TODO: Test for every relation type
 */
import { Core } from '@strapi/types';
import { testInTransaction } from '../../../../utils';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

let strapi: Core.Strapi;
const builder = createTestBuilder();
let rq;

const PRODUCT_UID = 'api::product.product';
const TAG_UID = 'api::tag.tag';
const SHOP_UID = 'api::shop.shop';

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
    name: {
      type: 'string',
    },
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
    name: {
      type: 'string',
    },
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
  draftAndPublish: true,
  displayName: 'Shop',
  singularName: 'shop',
  pluralName: 'shops',
};

describe('Document Service relations', () => {
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
  });

  afterAll(async () => {
    // Delete all locales that have been created
    await strapi.db.query('plugin::i18n.locale').deleteMany({ code: { $ne: 'en' } });

    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Non i18n Content Type (Shop) -> i18n Content Type (Product)', () => {
    describe('X to One', () => {
      testInTransaction.skip('Can connect multiple product locales to the same shop', async () => {
        const document = await strapi.documents(SHOP_UID).create({
          // If we can connect multiple locales, should we allow an array of relations to connect on xToOne relations?
          data: {
            // Can connect same document with different locales, but not other documents
            products_oo: [
              // TODO: Prevent connecting other documents if this is an array?
              { documentId: 'Skate', locale: 'en' },
              { documentId: 'Skate', locale: 'es' },
            ],
            // Can connect same document with different locales, but not other documents
            products_mo: [
              { documentId: 'Skate', locale: 'en' },
              { documentId: 'Skate', locale: 'es' },
            ],
          },
          populate: {
            products_oo: true,
            products_mo: true,
          },
        });

        expect(document).toMatchObject({
          name: 'test',
          // The response of oo is normally an array, how do we prevent this?
          products_oo: [{ name: 'Skate-En' }, { name: 'Skate-Es' }],
          products_mo: [{ name: 'Skate-En' }, { name: 'Skate-Es' }],
        });
      });

      testInTransaction.skip('Connecting multiple documents should throw an error', async () => {
        expect(
          strapi.documents(SHOP_UID).create({
            data: {
              products_oo: [
                { documentId: 'Skate', locale: 'en' },
                { documentId: 'Candle', locale: 'en' },
              ],
            },
          })
        ).rejects.toThrowError('Only one document can be connected to a one to one relation');
      });
    });

    describe('X to Many', () => {
      testInTransaction('Can connect to single locale', async () => {
        const document = await strapi.documents(SHOP_UID).create({
          data: {
            name: 'test',
            products_mm: [
              { documentId: 'Skate', locale: 'en' },
              { documentId: 'Candle', locale: 'en' },
            ],
          },
          populate: {
            products_mm: true,
          },
        });

        expect(document).toMatchObject({
          name: 'test',
          products_mm: [{ name: 'Skate-En' }, { name: 'Candle-En' }],
        });
      });

      testInTransaction('Can connect to multiple locales', async () => {
        const document = await strapi.documents(SHOP_UID).create({
          data: {
            name: 'test',
            products_mm: [
              { documentId: 'Skate', locale: 'en' },
              { documentId: 'Skate', locale: 'es' },
            ],
          },
          populate: {
            products_mm: true,
          },
        });

        expect(document).toMatchObject({
          name: 'test',
          products_mm: [{ name: 'Skate-En' }, { name: 'Skate-Es' }],
        });
      });
    });
  });

  describe('i18n Content Type (Product) -> Non i18n Content Type (Tag)', () => {
    testInTransaction('Can create a document with relations', async () => {
      const document = await strapi.documents(PRODUCT_UID).create({
        data: {
          name: 'Skate',
          tag: { documentId: 'Tag1', locale: null },
        },
        populate: {
          tag: true,
        },
        locale: 'en',
      });

      expect(document).toMatchObject({
        name: 'Skate',
        tag: { name: 'Tag1' },
      });
    });
  });
});
