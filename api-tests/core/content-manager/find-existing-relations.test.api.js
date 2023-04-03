'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const modelsUtils = require('api-tests/models');

let strapi;
let rq;
const data = {
  products: [],
  shops: [],
};

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
      .addComponent(compo(false))
      .addContentTypes([productModel(withDraftAndPublish), shopModel(withDraftAndPublish)])
      .build();

    await modelsUtils.modifyComponent(compo(true));

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const createdProduct1 = await createEntry('api::product.product', { name: 'Skate' });
    const createdProduct2 = await createEntry('api::product.product', { name: 'Candle' });
    const createdProduct3 = await createEntry('api::product.product', { name: 'Tofu' });

    if (withDraftAndPublish) {
      await rq({
        url: `/content-manager/collection-types/api::product.product/${createdProduct1.id}/actions/publish`,
        method: 'POST',
      });
    }

    data.products.push(createdProduct1);
    data.products.push(createdProduct2);
    data.products.push(createdProduct3);

    const id1 = createdProduct1.id;
    const id2 = createdProduct2.id;

    const createdShop1 = await createEntry('api::shop.shop', {
      name: 'Cazotte Shop',
      products_ow: id1,
      products_oo: id1,
      products_mo: id1,
      products_om: [id1, id2],
      products_mm: [id1, id2],
      products_mw: [id1, id2],
      myCompo: {
        compo_products_ow: id1,
        compo_products_mw: [id1, id2],
      },
    });
    const createdShop2 = await createEntry('api::shop.shop', {
      name: 'Empty Shop',
      myCompo: {
        compo_products_ow: null,
        compo_products_mw: [],
      },
    });

    data.shops.push(createdShop1);
    data.shops.push(createdShop2);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });
  describe('findExisting', () => {
    describe('On a content-type', () => {
      test('Fail when entity is not found', async () => {
        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/api::shop.shop/999999/products_ow`,
        });

        expect(res.status).toBe(404);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {},
            message: 'Not Found',
            name: 'NotFoundError',
            status: 404,
          },
        });
      });

      test("Fail when the field doesn't exist", async () => {
        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/api::shop.shop/${data.shops[0].id}/unkown`,
        });

        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {},
            message: "This relational field doesn't exist",
            name: 'BadRequestError',
            status: 400,
          },
        });
      });

      test('Fail when the field exists but is not a relational field', async () => {
        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/api::shop.shop/${data.shops[0].id}/name`,
        });

        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {},
            message: "This relational field doesn't exist",
            name: 'BadRequestError',
            status: 400,
          },
        });
      });

      describe.each([
        ['one-way', 'products_ow', false],
        ['one-one', 'products_oo', false],
        ['many-to-one', 'products_mo', false],
        ['one-to-many', 'products_om', true],
        ['many-many', 'products_mm', true],
        ['many-way', 'products_mw', true],
      ])('%s relation (%s)', (relationType, fieldName, isManyRelation) => {
        test('Can retrieve the relation(s) for an entity that have some relations', async () => {
          const res = await rq({
            method: 'GET',
            url: `/content-manager/relations/api::shop.shop/${data.shops[0].id}/${fieldName}`,
          });

          expect(res.status).toBe(200);

          if (isManyRelation) {
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
          } else {
            expect(res.body.data).toMatchObject({
              id: expect.any(Number),
              name: 'Skate',
              ...addPublishedAtCheck(expect.any(String)),
            });
          }
        });

        test("Can retrieve the relation(s) for an entity that don't have relations yet", async () => {
          const res = await rq({
            method: 'GET',
            url: `/content-manager/relations/api::shop.shop/${data.shops[1].id}/${fieldName}`,
          });

          expect(res.status).toBe(200);
          if (isManyRelation) {
            expect(res.body.results).toHaveLength(0);
          } else {
            expect(res.body.data).toBe(null);
          }
        });

        if (isManyRelation) {
          test("Can search ''", async () => {
            const res = await rq({
              method: 'GET',
              url: `/content-manager/relations/api::shop.shop/${data.shops[0].id}/${fieldName}`,
              qs: {
                _q: '',
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
          });
        }
      });
    });

    describe('On a component', () => {
      test('Fail when the component is not found', async () => {
        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/default.compo/999999/compo_products_ow`,
        });

        expect(res.status).toBe(404);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {},
            message: 'Not Found',
            name: 'NotFoundError',
            status: 404,
          },
        });
      });

      test("Fail when the field doesn't exist", async () => {
        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/default.compo/${data.shops[0].myCompo.id}/unknown`,
        });

        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {},
            message: "This relational field doesn't exist",
            name: 'BadRequestError',
            status: 400,
          },
        });
      });

      test('Fail when the field exists but is not a relational field', async () => {
        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/default.compo/${data.shops[0].myCompo.id}/name`,
        });

        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {},
            message: "This relational field doesn't exist",
            name: 'BadRequestError',
            status: 400,
          },
        });
      });

      describe.each([
        ['one-way', 'compo_products_ow', false],
        ['many-way', 'compo_products_mw', true],
      ])('%s relation (%s)', (relationType, fieldName, isManyRelation) => {
        test('Can retrieve the relation(s)', async () => {
          const res = await rq({
            method: 'GET',
            url: `/content-manager/relations/default.compo/${data.shops[0].myCompo.id}/${fieldName}`,
          });

          expect(res.status).toBe(200);

          if (isManyRelation) {
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
          } else {
            expect(res.body.data).toMatchObject({
              id: expect.any(Number),
              name: 'Skate',
              ...addPublishedAtCheck(expect.any(String)),
            });
          }
        });
      });
    });
  });
});
