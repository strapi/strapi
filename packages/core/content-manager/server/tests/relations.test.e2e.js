'use strict';

const { createTestBuilder } = require('../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../test/helpers/request');

let strapi;
let rq;
const data = {
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

const productModel = (draftAndPublish = false) => ({
  draftAndPublish,
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
});

const shopModel = (draftAndPublish = false) => ({
  draftAndPublish,
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
});

const createEntry = async (uid, data) => {
  const { body } = await rq({
    method: 'POST',
    url: `/content-manager/collection-types/${uid}`,
    body: data,
  });
  return body;
};

describe.each([false, true])('Relations, with d&p: %s', (withDraftAndPublish) => {
  const builder = createTestBuilder();
  const addPublishedAtCheck = (value) => (withDraftAndPublish ? { publishedAt: value } : undefined);

  beforeAll(async () => {
    await builder
      .addContentTypes([productModel(withDraftAndPublish)])
      .addComponent(compo)
      .addContentTypes([shopModel(withDraftAndPublish)])
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const createdProduct1 = await createEntry('api::product.product', { name: 'Skate' });
    const createdProduct2 = await createEntry('api::product.product', { name: 'Candle' });

    if (withDraftAndPublish) {
      await rq({
        url: `/content-manager/collection-types/api::product.product/${createdProduct1.id}/actions/publish`,
        method: 'POST',
      });
    }

    data.products.push(createdProduct1);
    data.products.push(createdProduct2);

    const createdShop = await createEntry('api::shop.shop', {
      name: 'Cazotte Shop',
      products: [createdProduct1.id],
      myCompo: { compoProducts: [createdProduct2.id] },
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
          ...addPublishedAtCheck(null),
        },
        {
          id: expect.any(Number),
          name: 'Skate',
          ...addPublishedAtCheck(expect.any(String)),
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
          ...addPublishedAtCheck(null),
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
          ...addPublishedAtCheck(null),
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
          ...addPublishedAtCheck(null),
        },
        {
          id: expect.any(Number),
          name: 'Skate',
          ...addPublishedAtCheck(expect.any(String)),
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
          ...addPublishedAtCheck(null),
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
          ...addPublishedAtCheck(expect.any(String)),
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

    test('can search', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-manager/relations/api::shop.shop/products',
        qs: {
          _q: 'Can',
        },
      });

      expect(res.status).toBe(200);
      expect(res.body.results).toMatchObject([
        {
          id: expect.any(Number),
          name: 'Candle',
          ...addPublishedAtCheck(null),
        },
      ]);
    });
  });
});
