'use strict';

import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import modelsUtils from 'api-tests/models';

let strapi;
let rq;
const data = {
  products: [],
  shops: [],
};
let documentId1: string;
let documentId2: string;
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
            target: 'api::product.product',
          },
          compo_products_mw: {
            type: 'relation',
            relation: 'oneToMany',
            target: 'api::product.product',
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
      target: 'api::product.product',
    },
    products_oo: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'api::product.product',
      targetAttribute: 'shop',
    },
    products_mo: {
      type: 'relation',
      relation: 'manyToOne',
      target: 'api::product.product',
      targetAttribute: 'shops_mo',
    },
    products_om: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::product.product',
      targetAttribute: 'shop_om',
    },
    products_mm: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::product.product',
      targetAttribute: 'shops',
    },
    products_mw: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::product.product',
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

const createEntry = async (singularName: string, data: any, populate: string[]) => {
  const { body } = await rq({
    method: 'POST',
    url: `/content-manager/collection-types/api::${singularName}.${singularName}`,
    body: data,
    qs: { populate },
  });
  return body;
};

const updateEntry = async (singularName: string, id: string, data: any, populate: string[]) => {
  const { body } = await rq({
    method: 'PUT',
    url: `/content-manager/collection-types/api::${singularName}.${singularName}/${id}`,
    body: data,
    qs: { populate },
  });
  return body;
};

describe('Relations', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder.addComponent(compo(false)).addContentTypes([productModel, shopModel]).build();

    await modelsUtils.modifyComponent(compo(true));

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const createdProduct1 = await createEntry('product', { name: 'Skate' }, []);
    const createdProduct2 = await createEntry('product', { name: 'Candle' }, []);
    const createdProduct3 = await createEntry('product', { name: 'Mug' }, []);

    data.products.push(createdProduct1);
    data.products.push(createdProduct2);
    data.products.push(createdProduct3);

    documentId1 = data.products[0].data.documentId;
    documentId2 = data.products[1].data.documentId;
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Update entity relations does not break other relations', () => {
    test('Update and disconnect relation does not break other relations', async () => {
      // Create 2 entries connected to the same relations
      const shops = [];

      for (let i = 0; i < 2; i++) {
        const createdShop = await createEntry(
          'shop',
          {
            name: 'Cazotte Shop',
            products_ow: { connect: [documentId1] },
            products_oo: { connect: [documentId1] },
            products_mo: { connect: [documentId1] },
            products_om: { connect: [documentId1, documentId2] },
            products_mm: { connect: [documentId1, documentId2] },
            products_mw: { connect: [documentId1, documentId2] },
            myCompo: {
              compo_products_ow: { connect: [documentId1] },
              compo_products_mw: { connect: [documentId1, documentId2] },
            },
          },
          ['myCompo']
        );
        shops.push(createdShop);
      }

      // Update shop 1 relation order
      await updateEntry(
        'shop',
        shops[0].data.documentId,
        {
          name: 'Cazotte Shop',
          products_om: { disconnect: [documentId2] },
          products_mm: { disconnect: [documentId2] },
          products_mw: { disconnect: [documentId2] },
          myCompo: {
            compo_products_mw: { disconnect: [documentId2] },
          },
        },
        []
      );

      const updatedShop2 = await strapi.db.query('api::shop.shop').findOne({
        where: { documentId: shops[1].data.documentId },
        populate: populateShop,
      });

      // shop2 relations should be unchanged
      expect(updatedShop2.products_om).toMatchObject([
        { documentId: documentId1 },
        { documentId: documentId2 },
      ]);
      expect(updatedShop2.products_mm).toMatchObject([
        { documentId: documentId1 },
        { documentId: documentId2 },
      ]);
      expect(updatedShop2.products_mw).toMatchObject([
        { documentId: documentId1 },
        { documentId: documentId2 },
      ]);
      expect(updatedShop2.myCompo.compo_products_mw).toMatchObject([
        { documentId: documentId1 },
        { documentId: documentId2 },
      ]);
    });
  });
});
