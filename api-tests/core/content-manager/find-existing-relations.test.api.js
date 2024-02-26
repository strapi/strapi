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

const productUid = 'api::product.product';
const shopUid = 'api::shop.shop';
const compoUid = 'default.compo';

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
            target: productUid,
          },
          compo_products_mw: {
            type: 'relation',
            relation: 'oneToMany',
            target: productUid,
          },
        }),
  },
});

const productModel = () => ({
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

const shopModel = () => ({
  attributes: {
    name: {
      type: 'string',
    },
    products_ow: {
      type: 'relation',
      relation: 'oneToOne',
      target: productUid,
    },
    products_oo: {
      type: 'relation',
      relation: 'oneToOne',
      target: productUid,
      targetAttribute: 'shop',
    },
    products_mo: {
      type: 'relation',
      relation: 'manyToOne',
      target: productUid,
      targetAttribute: 'shops_mo',
    },
    products_om: {
      type: 'relation',
      relation: 'oneToMany',
      target: productUid,
      targetAttribute: 'shop_om',
    },
    products_mm: {
      type: 'relation',
      relation: 'manyToMany',
      target: productUid,
      targetAttribute: 'shops',
    },
    products_mw: {
      type: 'relation',
      relation: 'oneToMany',
      target: productUid,
    },
    myCompo: {
      type: 'component',
      repeatable: false,
      component: compoUid,
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

describe('Relations', () => {
  const builder = createTestBuilder();
  const addPublishedAtCheck = (value) => {
    publishedAt: value;
  };

  beforeAll(async () => {
    await builder.addComponent(compo(false)).addContentTypes([productModel(), shopModel()]).build();

    await modelsUtils.modifyComponent(compo(true));

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const createdProduct1 = await createEntry(productUid, { name: 'Skate' });
    const createdProduct2 = await createEntry(productUid, { name: 'Candle' });
    const createdProduct3 = await createEntry(productUid, { name: 'Tofu' });

    await rq({
      url: `/content-manager/collection-types/${productUid}/${createdProduct1.id}/actions/publish`,
      method: 'POST',
    });

    data.products.push(createdProduct1.data);
    data.products.push(createdProduct2.data);
    data.products.push(createdProduct3.data);

    const id1 = createdProduct1.data.id;
    const id2 = createdProduct2.data.id;

    const createdShop1 = await createEntry(shopUid, {
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
    const createdShop2 = await createEntry(shopUid, {
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
          url: `/content-manager/relations/${shopUid}/999999/products_ow`,
          qs: {
            status: 'draft',
          },
        });

        expect(res.status).toBe(404);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {},
            message: 'Entity not found',
            name: 'NotFoundError',
            status: 404,
          },
        });
      });

      test("Fail when the field doesn't exist", async () => {
        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/${shopUid}/${data.shops[0].data.id}/unkown`,
          qs: {
            status: 'draft',
          },
        });

        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {},
            message: `The relational field unkown doesn't exist on ${shopUid}`,
            name: 'ValidationError',
            status: 400,
          },
        });
      });

      test('Fail when the field exists but is not a relational field', async () => {
        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/${shopUid}/${data.shops[0].data.id}/name`,
          qs: {
            status: 'draft',
          },
        });

        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {},
            message: `The relational field name doesn't exist on ${shopUid}`,
            name: 'ValidationError',
            status: 400,
          },
        });
      });

      describe.each([
        ['products_ow', false],
        ['products_oo', false],
        ['products_om', true],
        ['products_mo', false],
        ['products_mm', true],
        ['products_mw', true],
      ])('%s relation (%s)', (fieldName, isManyRelation) => {
        test('Can retrieve the relation(s) for an entity that have some relations', async () => {
          const res = await rq({
            method: 'GET',
            url: `/content-manager/relations/${shopUid}/${data.shops[0].data.id}/${fieldName}`,
            qs: {
              locale: null,
              status: 'draft',
            },
          });

          expect(res.status).toBe(200);

          if (isManyRelation) {
            expect(res.body.results).toMatchObject([
              {
                id: expect.any(String),
                name: 'Candle',
                ...addPublishedAtCheck(null),
              },
              {
                id: expect.any(String),
                name: 'Skate',
                ...addPublishedAtCheck(expect.any(String)),
              },
            ]);
          } else {
            expect(res.body.results).toMatchObject([
              {
                id: expect.any(String),
                name: 'Skate',
                ...addPublishedAtCheck(expect.any(String)),
              },
            ]);
          }
        });

        test("Can retrieve the relation(s) for an entity that don't have relations yet", async () => {
          const res = await rq({
            method: 'GET',
            url: `/content-manager/relations/${shopUid}/${data.shops[1].data.id}/${fieldName}`,
          });

          expect(res.status).toBe(200);
          expect(res.body.results).toHaveLength(0);
        });

        if (isManyRelation) {
          // TODO searching does nothing for find existing, do we need it?
          test.skip("Can search ''", async () => {
            const res = await rq({
              method: 'GET',
              url: `/content-manager/relations/${shopUid}/${data.shops[0].data.id}/${fieldName}`,
              qs: {
                _q: 'Candle',
              },
            });

            expect(res.status).toBe(200);
            expect(res.body.results).toMatchObject([
              {
                id: expect.any(String),
                name: 'Candle',
                ...addPublishedAtCheck(null),
              },
              {
                id: expect.any(String),
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
          url: `/content-manager/relations/${compoUid}/999999/compo_products_ow`,
        });

        expect(res.status).toBe(404);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {},
            message: 'Entity not found',
            name: 'NotFoundError',
            status: 404,
          },
        });
      });

      test("Fail when the field doesn't exist", async () => {
        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/${compoUid}/${data.shops[0].data.myCompo.id}/unknown`,
        });

        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {},
            message: `The relational field unknown doesn't exist on ${compoUid}`,
            name: 'ValidationError',
            status: 400,
          },
        });
      });

      test('Fail when the field exists but is not a relational field', async () => {
        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/${compoUid}/${data.shops[0].data.myCompo.id}/name`,
        });

        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {},
            message: `The relational field name doesn't exist on ${compoUid}`,
            name: 'ValidationError',
            status: 400,
          },
        });
      });

      describe.each([
        ['compo_products_ow', false],
        ['compo_products_mw', true],
      ])('%s relation (%s)', (fieldName, isManyRelation) => {
        test('Can retrieve the relation(s)', async () => {
          const res = await rq({
            method: 'GET',
            url: `/content-manager/relations/${compoUid}/${data.shops[0].data.myCompo.id}/${fieldName}`,
          });

          expect(res.status).toBe(200);

          if (isManyRelation) {
            expect(res.body.results).toMatchObject([
              {
                id: expect.any(String),
                name: 'Candle',
                ...addPublishedAtCheck(null),
              },
              {
                id: expect.any(String),
                name: 'Skate',
                ...addPublishedAtCheck(expect.any(String)),
              },
            ]);
          } else {
            expect(res.body.results).toMatchObject([
              {
                id: expect.any(String),
                name: 'Skate',
                ...addPublishedAtCheck(expect.any(String)),
              },
            ]);
          }
        });
      });
    });
  });
});
