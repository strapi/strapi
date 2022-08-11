'use strict';

const { createTestBuilder } = require('../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../test/helpers/request');

let strapi;
let rq;
let data = {
  products: [],
  shops: [],
};

const compo = {
  displayName: 'compo',
  attributes: {
    name: {
      type: 'string',
    },
    compoProducts: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::product.product',
    },
  },
};

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
    products: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::product.product',
      targetAttribute: 'shops',
      inversedBy: 'shops',
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

describe('Relations', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder
      .addContentTypes([productModel])
      .addComponent(compo)
      .addContentTypes([shopModel])
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const { body: createdProduct1 } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product.product',
      body: { name: 'Skate' },
    });
    const { body: createdProduct2 } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product.product',
      body: { name: 'Candle' },
    });

    data.products.push(createdProduct1);
    data.products.push(createdProduct2);

    const { body: createdShop } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::shop.shop',
      body: {
        name: 'Cazotte Shop',
        products: [createdProduct1.id],
        myCompo: { compoProducts: [createdProduct2.id] },
      },
    });

    data.shops.push(createdShop);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('findAvailable', () => {
    test('relation not in a component && no entity', async () => {
      let res = await rq({
        method: 'GET',
        url: '/content-manager/relations/api::shop.shop/products',
      });

      expect(res.status).toBe(200);
      expect(res.body.results).toMatchObject([
        {
          id: expect.any(Number),
          name: 'Candle',
        },
        {
          id: expect.any(Number),
          name: 'Skate',
        },
      ]);

      // can omitIds
      res = await rq({
        method: 'GET',
        url: '/content-manager/relations/api::shop.shop/products',
        qs: {
          idsToOmit: [data.products[0].id],
        },
      });

      expect(res.body.results).toMatchObject([
        {
          id: expect.any(Number),
          name: 'Candle',
        },
      ]);
    });

    test('relation not in a component && on an entity', async () => {
      let res = await rq({
        method: 'GET',
        url: '/content-manager/relations/api::shop.shop/products',
        qs: {
          entityId: data.shops[0].id,
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.results).toMatchObject([
        {
          id: expect.any(Number),
          name: 'Candle',
        },
      ]);

      // can omitIds
      res = await rq({
        method: 'GET',
        url: '/content-manager/relations/api::shop.shop/products',
        qs: {
          entityId: data.shops[0].id,
          idsToOmit: [data.products[1].id],
        },
      });

      expect(res.body.results).toHaveLength(0);
    });

    test('relation in a component && no entity', async () => {
      let res = await rq({
        method: 'GET',
        url: '/content-manager/relations/api::shop.shop/compoProducts',
        qs: {
          component: 'default.compo',
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.results).toMatchObject([
        {
          id: expect.any(Number),
          name: 'Candle',
        },
        {
          id: expect.any(Number),
          name: 'Skate',
        },
      ]);

      // can omitIds
      res = await rq({
        method: 'GET',
        url: '/content-manager/relations/api::shop.shop/compoProducts',
        qs: {
          component: 'default.compo',
          idsToOmit: [data.products[0].id],
        },
      });

      expect(res.body.results).toMatchObject([
        {
          id: expect.any(Number),
          name: 'Candle',
        },
      ]);
    });

    test('relation in a component && on an entity', async () => {
      let res = await rq({
        method: 'GET',
        url: '/content-manager/relations/api::shop.shop/compoProducts',
        qs: {
          entityId: data.shops[0].myCompo.id,
          component: 'default.compo',
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.results).toMatchObject([
        {
          id: expect.any(Number),
          name: 'Skate',
        },
      ]);

      // can omitIds
      res = await rq({
        method: 'GET',
        url: '/content-manager/relations/api::shop.shop/compoProducts',
        qs: {
          entityId: data.shops[0].myCompo.id,
          component: 'default.compo',
          idsToOmit: [data.products[0].id],
        },
      });

      expect(res.body.results).toHaveLength(0);
    });
  });
});
