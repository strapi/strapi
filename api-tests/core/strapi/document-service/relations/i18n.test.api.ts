/**
 * Relations interactions with i18n.
 *
 * TODO: Move to i18n tests
 */
import { LoadedStrapi } from '@strapi/types';
import { testInTransaction } from '../../../../utils';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const modelsUtils = require('api-tests/models');

let strapi: LoadedStrapi;
const builder = createTestBuilder();
let rq;

const populateShop = [
  'products_ow',
  'products_oo',
  'products_mo',
  'products_om',
  'products_mm',
  'products_mw',
  'myCompo.compo_products_ow',
  'myCompo.compo_products_mw',
];

const PRODUCT_UID = 'api::product.product';
const SHOP_UID = 'api::shop.shop';

const compo = (withRelations = false) => ({
  displayName: 'compo',
  category: 'default',
  attributes: {
    name: {
      type: 'string',
    },
    ...(!withRelations
      ? {}
      : {
          compo_products_ow: {
            type: 'relation',
            relation: 'oneToOne',
            target: PRODUCT_UID,
          },
          compo_products_mw: {
            type: 'relation',
            relation: 'oneToMany',
            target: PRODUCT_UID,
          },
        }),
  },
});

const productModel = {
  attributes: {
    name: {
      type: 'string',
    },
  },
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  displayName: 'Product',
  singularName: 'product',
  pluralName: 'products',
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
    myCompo: {
      type: 'component',
      repeatable: false,
      component: 'default.compo',
    },
  },
  displayName: 'Shop',
  singularName: 'shop',
  pluralName: 'shops',
};

describe('Document Service relations', () => {
  beforeAll(async () => {
    await builder
      .addComponent(compo(false))
      .addContentTypes([productModel, shopModel])
      .addFixtures('plugin::i18n.locale', [
        { name: 'Es', code: 'es' },
        { name: 'Fr', code: 'fr' },
      ])
      .build();

    await modelsUtils.modifyComponent(compo(true));

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const productDocuments = strapi.documents(PRODUCT_UID);
    const shopDocuments = strapi.documents(SHOP_UID);

    // PRODUCTS
    await strapi.db.query(PRODUCT_UID).createMany({
      data: [
        { documentId: 'Skate', name: 'Skate-En', locale: 'en' },
        { documentId: 'Skate', name: 'Skate-Es', locale: 'es' },
        { documentId: 'Candle', name: 'Candle-En', locale: 'en' },
        { documentId: 'Candle', name: 'Candle-Es', locale: 'es' },
        { documentId: 'Mug', name: 'Mug-En', locale: 'en' },
        { documentId: 'Mug', name: 'Mug-Es', locale: 'es' },
      ],
    });

    // SHOPS
    // const englishShop = await shopDocuments.create({ data: { name: 'Shop' }, locale: 'en' });
    // const spanishShop = await shopDocuments.create({ data: { name: 'Shop' }, locale: 'es' });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Non i18n Content Type (Shop) -> i18n Content Type (Product)', () => {
    it(
      'Can connect to single locale',
      testInTransaction(async () => {
        await strapi.documents(SHOP_UID).create({
          data: {
            name: 'test',
            products_mm: [
              { id: 'Skate', locale: 'en' },
              { id: 'Candle', locale: 'en' },
            ],
          },
          locale: 'en',
        });
      })
    );

    it(
      'Can connect to multiple locales',
      testInTransaction(async () => {
        await strapi.documents(SHOP_UID).create({
          data: {
            name: 'test',
            products_mm: [
              { id: 'Skate', locale: 'en' },
              { id: 'Skate', locale: 'es' },
            ],
          },
          locale: 'en',
        });
      })
    );
  });

  describe('i18n Content Type (Article) -> Non i18n Content Type (Author)', () => {
    it(
      'Can create a document with relations',
      testInTransaction(async () => {})
    );
  });

  describe('i18n Content Type (Article) -> i18n Content Type (Category) ', () => {
    it(
      'Can create a document with relations',
      testInTransaction(async () => {})
    );
  });
});
