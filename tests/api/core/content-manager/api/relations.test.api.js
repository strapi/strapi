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
let id1;
let id2;
let id3;
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

const createEntry = async (singularName, data, populate) => {
  const { body } = await rq({
    method: 'POST',
    url: `/content-manager/collection-types/api::${singularName}.${singularName}`,
    body: data,
    qs: { populate },
  });
  return body;
};

const updateEntry = async (singularName, id, data, populate) => {
  const { body } = await rq({
    method: 'PUT',
    url: `/content-manager/collection-types/api::${singularName}.${singularName}/${id}`,
    body: data,
    qs: { populate },
  });
  return body;
};

const cloneEntry = async (singularName, id, data, populate) => {
  const { body } = await rq({
    method: 'POST',
    url: `/content-manager/collection-types/api::${singularName}.${singularName}/clone/${id}`,
    body: data,
    qs: { populate },
  });
  return body;
};

const getRelations = async (uid, field, id) => {
  const res = await rq({
    method: 'GET',
    url: `/content-manager/relations/${uid}/${id}/${field}`,
  });

  return res.body;
};

// TODO: Fix relations
describe.skip('Relations', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder.addComponent(compo(false)).addContentTypes([productModel, shopModel]).build();

    await modelsUtils.modifyComponent(compo(true));

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const createdProduct1 = await createEntry('product', { name: 'Skate' });
    const createdProduct2 = await createEntry('product', { name: 'Candle' });
    const createdProduct3 = await createEntry('product', { name: 'Mug' });

    data.products.push(createdProduct1);
    data.products.push(createdProduct2);
    data.products.push(createdProduct3);

    id1 = data.products[0].id;
    id2 = data.products[1].id;
    id3 = data.products[2].id;
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe.each([['connect'], ['set']])(
    'Create an entity with relations using %s',
    (connectOrSet) => {
      describe.each([
        ['directly in the array ([1, 2])', 'object'],
        ['an object in the array ([{ id: 1 }, { id: 2 }])', 'array'],
      ])('ids being %s', (name, mode) => {
        test('In one order', async () => {
          const oneRelation = mode === 'object' ? [{ id: id1 }] : [id1];
          const manyRelations = mode === 'object' ? [{ id: id1 }, { id: id2 }] : [id1, id2];

          const shop = await createEntry(
            'shop',
            {
              name: 'Cazotte Shop',
              products_ow: { [connectOrSet]: oneRelation },
              products_oo: { [connectOrSet]: oneRelation },
              products_mo: { [connectOrSet]: oneRelation },
              products_om: { [connectOrSet]: manyRelations },
              products_mm: { [connectOrSet]: manyRelations },
              products_mw: { [connectOrSet]: manyRelations },
              myCompo: {
                compo_products_ow: { [connectOrSet]: oneRelation },
                compo_products_mw: { [connectOrSet]: manyRelations },
              },
            },
            populateShop
          );

          let res;
          res = await getRelations('default.compo', 'compo_products_mw', shop.myCompo.id);
          expect(res.results).toMatchObject([{ id: id2 }, { id: id1 }]);

          res = await getRelations('default.compo', 'compo_products_ow', shop.myCompo.id);
          expect(res.data).toMatchObject({ id: id1 });

          res = await getRelations('api::shop.shop', 'products_mm', shop.id);
          expect(res.results).toMatchObject([{ id: id2 }, { id: id1 }]);

          res = await getRelations('api::shop.shop', 'products_mo', shop.id);
          expect(res.data).toMatchObject({ id: id1 });

          res = await getRelations('api::shop.shop', 'products_mw', shop.id);
          expect(res.results).toMatchObject([{ id: id2 }, { id: id1 }]);

          res = await getRelations('api::shop.shop', 'products_om', shop.id);
          expect(res.results).toMatchObject([{ id: id2 }, { id: id1 }]);

          res = await getRelations('api::shop.shop', 'products_oo', shop.id);
          expect(res.data).toMatchObject({ id: id1 });

          res = await getRelations('api::shop.shop', 'products_ow', shop.id);
          expect(res.data).toMatchObject({ id: id1 });
        });

        test('In reversed order', async () => {
          const oneRelation = mode === 'object' ? [{ id: id1 }] : [id1];
          const manyRelations = mode === 'object' ? [{ id: id1 }, { id: id2 }] : [id1, id2];
          manyRelations.reverse();

          const shop = await createEntry(
            'shop',
            {
              name: 'Cazotte Shop',
              products_ow: { [connectOrSet]: oneRelation },
              products_oo: { [connectOrSet]: oneRelation },
              products_mo: { [connectOrSet]: oneRelation },
              products_om: { [connectOrSet]: manyRelations },
              products_mm: { [connectOrSet]: manyRelations },
              products_mw: { [connectOrSet]: manyRelations },
              myCompo: {
                compo_products_ow: { [connectOrSet]: oneRelation },
                compo_products_mw: { [connectOrSet]: manyRelations },
              },
            },
            populateShop
          );

          let res;
          res = await getRelations('default.compo', 'compo_products_mw', shop.myCompo.id);
          expect(res.results).toMatchObject([{ id: id1 }, { id: id2 }]);

          res = await getRelations('default.compo', 'compo_products_ow', shop.myCompo.id);
          expect(res.data).toMatchObject({ id: id1 });

          res = await getRelations('api::shop.shop', 'products_mm', shop.id);
          expect(res.results).toMatchObject([{ id: id1 }, { id: id2 }]);

          res = await getRelations('api::shop.shop', 'products_mo', shop.id);
          expect(res.data).toMatchObject({ id: id1 });

          res = await getRelations('api::shop.shop', 'products_mw', shop.id);
          expect(res.results).toMatchObject([{ id: id1 }, { id: id2 }]);

          res = await getRelations('api::shop.shop', 'products_om', shop.id);
          expect(res.results).toMatchObject([{ id: id1 }, { id: id2 }]);

          res = await getRelations('api::shop.shop', 'products_oo', shop.id);
          expect(res.data).toMatchObject({ id: id1 });

          res = await getRelations('api::shop.shop', 'products_ow', shop.id);
          expect(res.data).toMatchObject({ id: id1 });
        });
      });
    }
  );

  describe('Update an entity relations', () => {
    describe.each([
      ['directly in the array ([3])', 'object'],
      ['an object in the array ([{ id: 3 }])', 'array'],
    ])('ids being %s', (name, mode) => {
      test('Adding id3', async () => {
        const createdShop = await createEntry(
          'shop',
          {
            name: 'Cazotte Shop',
            products_ow: { connect: [id1] },
            products_oo: { connect: [id1] },
            products_mo: { connect: [id1] },
            products_om: { connect: [id1, id2] },
            products_mm: { connect: [id1, id2] },
            products_mw: { connect: [id1, id2] },
            myCompo: {
              compo_products_ow: { connect: [id1] },
              compo_products_mw: { connect: [id1, id2] },
            },
          },
          ['myCompo']
        );

        const relationToAdd = mode === 'object' ? [{ id: id3 }] : [id3];

        const updatedShop = await updateEntry(
          'shop',
          createdShop.id,
          {
            name: 'Cazotte Shop',
            products_ow: { connect: relationToAdd },
            products_oo: { connect: relationToAdd },
            products_mo: { connect: relationToAdd },
            products_om: { connect: relationToAdd },
            products_mm: { connect: relationToAdd },
            products_mw: { connect: relationToAdd },
            myCompo: {
              id: createdShop.myCompo.id,
              compo_products_ow: { connect: relationToAdd },
              compo_products_mw: { connect: relationToAdd },
            },
          },
          populateShop
        );

        let res;
        res = await getRelations('default.compo', 'compo_products_mw', updatedShop.myCompo.id);
        expect(res.results).toMatchObject([{ id: id3 }, { id: id2 }, { id: id1 }]);

        res = await getRelations('default.compo', 'compo_products_ow', updatedShop.myCompo.id);
        expect(res.data).toMatchObject({ id: id3 });

        res = await getRelations('api::shop.shop', 'products_mm', updatedShop.id);
        expect(res.results).toMatchObject([{ id: id3 }, { id: id2 }, { id: id1 }]);

        res = await getRelations('api::shop.shop', 'products_mo', updatedShop.id);
        expect(res.data).toMatchObject({ id: id3 });

        res = await getRelations('api::shop.shop', 'products_mw', updatedShop.id);
        expect(res.results).toMatchObject([{ id: id3 }, { id: id2 }, { id: id1 }]);

        res = await getRelations('api::shop.shop', 'products_om', updatedShop.id);
        expect(res.results).toMatchObject([{ id: id3 }, { id: id2 }, { id: id1 }]);

        res = await getRelations('api::shop.shop', 'products_oo', updatedShop.id);
        expect(res.data).toMatchObject({ id: id3 });

        res = await getRelations('api::shop.shop', 'products_ow', updatedShop.id);
        expect(res.data).toMatchObject({ id: id3 });
      });

      test('Adding id3 & removing id1', async () => {
        const createdShop = await createEntry(
          'shop',
          {
            name: 'Cazotte Shop',
            products_ow: { connect: [id1] },
            products_oo: { connect: [id1] },
            products_mo: { connect: [id1] },
            products_om: { connect: [id1, id2] },
            products_mm: { connect: [id1, id2] },
            products_mw: { connect: [id1, id2] },
            myCompo: {
              compo_products_ow: { connect: [id1] },
              compo_products_mw: { connect: [id1, id2] },
            },
          },
          ['myCompo']
        );

        const relationToAdd = mode === 'object' ? [{ id: id3 }] : [id3];
        const relationToRemove = mode === 'object' ? [{ id: id1 }] : [id1];

        const updatedShop = await updateEntry(
          'shop',
          createdShop.id,
          {
            name: 'Cazotte Shop',
            products_ow: { connect: relationToAdd, disconnect: relationToRemove },
            products_oo: { connect: relationToAdd, disconnect: relationToRemove },
            products_mo: { connect: relationToAdd, disconnect: relationToRemove },
            products_om: { connect: relationToAdd, disconnect: relationToRemove },
            products_mm: { connect: relationToAdd, disconnect: relationToRemove },
            products_mw: { connect: relationToAdd, disconnect: relationToRemove },
            myCompo: {
              id: createdShop.myCompo.id,
              compo_products_ow: { connect: relationToAdd, disconnect: relationToRemove },
              compo_products_mw: { connect: relationToAdd, disconnect: relationToRemove },
            },
          },
          populateShop
        );

        let res;
        res = await getRelations('default.compo', 'compo_products_mw', updatedShop.myCompo.id);
        expect(res.results).toMatchObject([{ id: id3 }, { id: id2 }]);

        res = await getRelations('default.compo', 'compo_products_ow', updatedShop.myCompo.id);
        expect(res.data).toMatchObject({ id: id3 });

        res = await getRelations('api::shop.shop', 'products_mm', updatedShop.id);
        expect(res.results).toMatchObject([{ id: id3 }, { id: id2 }]);

        res = await getRelations('api::shop.shop', 'products_mo', updatedShop.id);
        expect(res.data).toMatchObject({ id: id3 });

        res = await getRelations('api::shop.shop', 'products_mw', updatedShop.id);
        expect(res.results).toMatchObject([{ id: id3 }, { id: id2 }]);

        res = await getRelations('api::shop.shop', 'products_om', updatedShop.id);
        expect(res.results).toMatchObject([{ id: id3 }, { id: id2 }]);

        res = await getRelations('api::shop.shop', 'products_oo', updatedShop.id);
        expect(res.data).toMatchObject({ id: id3 });

        res = await getRelations('api::shop.shop', 'products_ow', updatedShop.id);
        expect(res.data).toMatchObject({ id: id3 });
      });

      test('Adding id3 & removing id1, id3 (should still add id3)', async () => {
        const createdShop = await createEntry(
          'shop',
          {
            name: 'Cazotte Shop',
            products_ow: { connect: [id1] },
            products_oo: { connect: [id1] },
            products_mo: { connect: [id1] },
            products_om: { connect: [id1, id2] },
            products_mm: { connect: [id1, id2] },
            products_mw: { connect: [id1, id2] },
            myCompo: {
              compo_products_ow: { connect: [id1] },
              compo_products_mw: { connect: [id1, id2] },
            },
          },
          ['myCompo']
        );

        const relationToAdd = mode === 'object' ? [{ id: id3 }] : [id3];
        const relationToRemove = mode === 'object' ? [{ id: id1 }, { id: id3 }] : [id1, id3];

        const updatedShop = await updateEntry(
          'shop',
          createdShop.id,
          {
            name: 'Cazotte Shop',
            products_ow: { connect: relationToAdd, disconnect: relationToRemove },
            products_oo: { connect: relationToAdd, disconnect: relationToRemove },
            products_mo: { connect: relationToAdd, disconnect: relationToRemove },
            products_om: { connect: relationToAdd, disconnect: relationToRemove },
            products_mm: { connect: relationToAdd, disconnect: relationToRemove },
            products_mw: { connect: relationToAdd, disconnect: relationToRemove },
            myCompo: {
              id: createdShop.myCompo.id,
              compo_products_ow: { connect: relationToAdd, disconnect: relationToRemove },
              compo_products_mw: { connect: relationToAdd, disconnect: relationToRemove },
            },
          },
          populateShop
        );

        let res;
        res = await getRelations('default.compo', 'compo_products_mw', updatedShop.myCompo.id);
        expect(res.results).toMatchObject([{ id: id3 }, { id: id2 }]);

        res = await getRelations('default.compo', 'compo_products_ow', updatedShop.myCompo.id);
        expect(res.data).toMatchObject({ id: id3 });

        res = await getRelations('api::shop.shop', 'products_mm', updatedShop.id);
        expect(res.results).toMatchObject([{ id: id3 }, { id: id2 }]);

        res = await getRelations('api::shop.shop', 'products_mo', updatedShop.id);
        expect(res.data).toMatchObject({ id: id3 });

        res = await getRelations('api::shop.shop', 'products_mw', updatedShop.id);
        expect(res.results).toMatchObject([{ id: id3 }, { id: id2 }]);

        res = await getRelations('api::shop.shop', 'products_om', updatedShop.id);
        expect(res.results).toMatchObject([{ id: id3 }, { id: id2 }]);

        res = await getRelations('api::shop.shop', 'products_oo', updatedShop.id);
        expect(res.data).toMatchObject({ id: id3 });

        res = await getRelations('api::shop.shop', 'products_ow', updatedShop.id);
        expect(res.data).toMatchObject({ id: id3 });
      });

      test('Change relation order from id1, id2, id3 to id3, id2, id1', async () => {
        const createdShop = await createEntry(
          'shop',
          {
            name: 'Cazotte Shop',
            products_om: { connect: [id1, id2, id3] },
            products_mm: { connect: [id1, id2, id3] },
            products_mw: { connect: [id1, id2, id3] },
            myCompo: {
              compo_products_mw: { connect: [id1, id2, id3] },
            },
          },
          ['myCompo']
        );

        const relationToChange =
          mode === 'object' ? [{ id: id3 }, { id: id2 }, { id: id1 }] : [id3, id2, id1];

        const updatedShop = await updateEntry(
          'shop',
          createdShop.id,
          {
            name: 'Cazotte Shop',
            products_om: { connect: relationToChange },
            products_mm: { connect: relationToChange },
            products_mw: { connect: relationToChange },
            myCompo: {
              id: createdShop.myCompo.id,
              compo_products_mw: { connect: relationToChange },
            },
          },
          populateShop
        );

        let res;
        res = await getRelations('default.compo', 'compo_products_mw', updatedShop.myCompo.id);
        expect(res.results).toMatchObject([{ id: id1 }, { id: id2 }, { id: id3 }]);

        res = await getRelations('api::shop.shop', 'products_mm', updatedShop.id);
        expect(res.results).toMatchObject([{ id: id1 }, { id: id2 }, { id: id3 }]);

        res = await getRelations('api::shop.shop', 'products_mw', updatedShop.id);
        expect(res.results).toMatchObject([{ id: id1 }, { id: id2 }, { id: id3 }]);

        res = await getRelations('api::shop.shop', 'products_om', updatedShop.id);
        expect(res.results).toMatchObject([{ id: id1 }, { id: id2 }, { id: id3 }]);
      });

      test('Change relation order by putting id2 at the end', async () => {
        const createdShop = await createEntry(
          'shop',
          {
            name: 'Cazotte Shop',
            products_om: { connect: [id1, id2, id3] },
            products_mm: { connect: [id1, id2, id3] },
            products_mw: { connect: [id1, id2, id3] },
            myCompo: {
              compo_products_mw: { connect: [id1, id2, id3] },
            },
          },
          ['myCompo']
        );

        const relationToChange = mode === 'object' ? [{ id: id2 }] : [id2];

        const updatedShop = await updateEntry(
          'shop',
          createdShop.id,
          {
            name: 'Cazotte Shop',
            products_om: { connect: relationToChange },
            products_mm: { connect: relationToChange },
            products_mw: { connect: relationToChange },
            myCompo: {
              id: createdShop.myCompo.id,
              compo_products_mw: { connect: relationToChange },
            },
          },
          populateShop
        );

        let res;
        res = await getRelations('default.compo', 'compo_products_mw', updatedShop.myCompo.id);
        expect(res.results).toMatchObject([{ id: id2 }, { id: id3 }, { id: id1 }]);

        res = await getRelations('api::shop.shop', 'products_mm', updatedShop.id);
        expect(res.results).toMatchObject([{ id: id2 }, { id: id3 }, { id: id1 }]);

        res = await getRelations('api::shop.shop', 'products_mw', updatedShop.id);
        expect(res.results).toMatchObject([{ id: id2 }, { id: id3 }, { id: id1 }]);

        res = await getRelations('api::shop.shop', 'products_om', updatedShop.id);
        expect(res.results).toMatchObject([{ id: id2 }, { id: id3 }, { id: id1 }]);
      });

      test('Change relation order by putting id2, id1 at the end', async () => {
        const createdShop = await createEntry(
          'shop',
          {
            name: 'Cazotte Shop',
            products_om: { connect: [id1, id2, id3] },
            products_mm: { connect: [id1, id2, id3] },
            products_mw: { connect: [id1, id2, id3] },
            myCompo: {
              compo_products_mw: { connect: [id1, id2, id3] },
            },
          },
          ['myCompo']
        );

        const relationToChange = mode === 'object' ? [{ id: id2 }, { id: id1 }] : [id2, id1];

        const updatedShop = await updateEntry(
          'shop',
          createdShop.id,
          {
            name: 'Cazotte Shop',
            products_om: { connect: relationToChange },
            products_mm: { connect: relationToChange },
            products_mw: { connect: relationToChange },
            myCompo: {
              id: createdShop.myCompo.id,
              compo_products_mw: { connect: relationToChange },
            },
          },
          populateShop
        );

        let res;
        res = await getRelations('default.compo', 'compo_products_mw', updatedShop.myCompo.id);
        expect(res.results).toMatchObject([{ id: id1 }, { id: id2 }, { id: id3 }]);

        res = await getRelations('api::shop.shop', 'products_mm', updatedShop.id);
        expect(res.results).toMatchObject([{ id: id1 }, { id: id2 }, { id: id3 }]);

        res = await getRelations('api::shop.shop', 'products_mw', updatedShop.id);
        expect(res.results).toMatchObject([{ id: id1 }, { id: id2 }, { id: id3 }]);

        res = await getRelations('api::shop.shop', 'products_om', updatedShop.id);
        expect(res.results).toMatchObject([{ id: id1 }, { id: id2 }, { id: id3 }]);
      });
    });
  });

  describe('Reorder an entity relations', () => {
    test('Reorder single relation', async () => {
      const createdShop = await createEntry(
        'shop',
        {
          name: 'Cazotte Shop',
          products_om: { connect: [id1, id2, id3] },
          products_mm: { connect: [id1, id2, id3] },
          products_mw: { connect: [id1, id2, id3] },
          myCompo: {
            compo_products_mw: { connect: [id1, id2, id3] },
          },
        },
        ['myCompo']
      );

      const relationToChange = [{ id: id1, position: { before: id3 } }];
      const { id } = await updateEntry('shop', createdShop.id, {
        name: 'Cazotte Shop',
        products_om: { connect: relationToChange },
        products_mm: { connect: relationToChange },
        products_mw: { connect: relationToChange },
        myCompo: {
          id: createdShop.myCompo.id,
          compo_products_mw: { connect: relationToChange },
        },
      });

      const expectedRelations = [{ id: id2 }, { id: id1 }, { id: id3 }];

      const updatedShop = await strapi.db
        .query('api::shop.shop')
        .findOne({ where: { id }, populate: populateShop });

      expect(updatedShop.myCompo.compo_products_mw).toMatchObject(expectedRelations);
      expect(updatedShop.products_mm).toMatchObject(expectedRelations);
      expect(updatedShop.products_mw).toMatchObject(expectedRelations);
      expect(updatedShop.products_om).toMatchObject(expectedRelations);
    });

    test('Reorder multiple relations', async () => {
      const createdShop = await createEntry(
        'shop',
        {
          name: 'Cazotte Shop',
          products_om: { connect: [id1, id2, id3] },
          products_mm: { connect: [id1, id2, id3] },
          products_mw: { connect: [id1, id2, id3] },
          myCompo: {
            compo_products_mw: { connect: [id1, id2, id3] },
          },
        },
        ['myCompo']
      );

      const relationToChange = [
        { id: id1, position: { end: true } },
        { id: id3, position: { start: true } },
        { id: id2, position: { after: id1 } },
      ];
      const { id } = await updateEntry('shop', createdShop.id, {
        name: 'Cazotte Shop',
        products_om: { connect: relationToChange },
        products_mm: { connect: relationToChange },
        products_mw: { connect: relationToChange },
        myCompo: {
          id: createdShop.myCompo.id,
          compo_products_mw: { connect: relationToChange },
        },
      });

      const updatedShop = await strapi.db
        .query('api::shop.shop')
        .findOne({ where: { id }, populate: populateShop });

      const expectedRelations = [{ id: id3 }, { id: id1 }, { id: id2 }];

      expect(updatedShop.myCompo.compo_products_mw).toMatchObject(expectedRelations);
      expect(updatedShop.products_mm).toMatchObject(expectedRelations);
      expect(updatedShop.products_mw).toMatchObject(expectedRelations);
      expect(updatedShop.products_om).toMatchObject(expectedRelations);
    });

    test('Invalid reorder with non-strict mode should not give an error', async () => {
      const createdShop = await createEntry(
        'shop',
        {
          name: 'Cazotte Shop',
          products_om: { connect: [id1, id2] },
          products_mm: { connect: [id1, id2] },
          products_mw: { connect: [id1, id2] },
          myCompo: {
            compo_products_mw: { connect: [id1, id2] },
          },
        },
        ['myCompo']
      );

      const relationToChange = [
        { id: id1, position: { before: id3 } }, // id3 does not exist, should place it at the end
      ];
      const { id } = await updateEntry('shop', createdShop.id, {
        name: 'Cazotte Shop',
        products_om: { options: { strict: false }, connect: relationToChange },
        products_mm: { options: { strict: false }, connect: relationToChange },
        products_mw: { options: { strict: false }, connect: relationToChange },
        myCompo: {
          id: createdShop.myCompo.id,
          compo_products_mw: { options: { strict: false }, connect: relationToChange },
        },
      });

      const expectedRelations = [{ id: id2 }, { id: id1 }];
      const updatedShop = await strapi.db
        .query('api::shop.shop')
        .findOne({ where: { id }, populate: populateShop });

      expect(updatedShop.myCompo.compo_products_mw).toMatchObject(expectedRelations);
      expect(updatedShop.products_mm).toMatchObject(expectedRelations);
      expect(updatedShop.products_mw).toMatchObject(expectedRelations);
      expect(updatedShop.products_om).toMatchObject(expectedRelations);
    });
  });

  describe('Disconnect entity relations', () => {
    describe.each([
      ['directly in the array ([1, 2, 3])', 'object'],
      ['an object in the array ([{ id: 1 }, { id: 2 }, { id: 3 }])', 'array'],
    ])('ids being %s', (name, mode) => {
      test('Remove all relations id1, id2, id3', async () => {
        const createdShop = await createEntry(
          'shop',
          {
            name: 'Cazotte Shop',
            products_ow: { connect: [id1] },
            products_oo: { connect: [id1] },
            products_mo: { connect: [id1] },
            products_om: { connect: [id1, id2, id3] },
            products_mm: { connect: [id1, id2, id3] },
            products_mw: { connect: [id1, id2, id3] },
            myCompo: {
              compo_products_ow: { connect: [id1] },
              compo_products_mw: { connect: [id1, id2, id3] },
            },
          },
          ['myCompo']
        );

        const relationsToDisconnectOne = mode === 'object' ? [{ id: id1 }] : [id1];
        const relationsToDisconnectMany =
          mode === 'object' ? [{ id: id3 }, { id: id2 }, { id: id1 }] : [id3, id2, id1];

        const { id } = await updateEntry(
          'shop',
          createdShop.id,
          {
            name: 'Cazotte Shop',
            products_ow: { disconnect: relationsToDisconnectOne },
            products_oo: { disconnect: relationsToDisconnectOne },
            products_mo: { disconnect: relationsToDisconnectOne },
            products_om: { disconnect: relationsToDisconnectMany },
            products_mm: { disconnect: relationsToDisconnectMany },
            products_mw: { disconnect: relationsToDisconnectMany },
            myCompo: {
              id: createdShop.myCompo.id,
              compo_products_ow: { disconnect: relationsToDisconnectOne },
              compo_products_mw: { disconnect: relationsToDisconnectMany },
            },
          },
          populateShop
        );

        const updatedShop = await strapi.db
          .query('api::shop.shop')
          .findOne({ where: { id }, populate: populateShop });

        expect(updatedShop.myCompo.compo_products_mw).toMatchObject([]);
        expect(updatedShop.myCompo.compo_products_ow).toBe(null);
        expect(updatedShop.products_mm).toMatchObject([]);
        expect(updatedShop.products_mo).toBe(null);
        expect(updatedShop.products_mw).toMatchObject([]);
        expect(updatedShop.products_om).toMatchObject([]);
        expect(updatedShop.products_oo).toBe(null);
        expect(updatedShop.products_ow).toBe(null);
      });

      test("Remove relations that doesn't exist doesn't fail", async () => {
        const createdShop = await createEntry(
          'shop',
          {
            name: 'Cazotte Shop',
            products_ow: { connect: [id1] },
            products_oo: { connect: [id1] },
            products_mo: { connect: [id1] },
            products_om: { connect: [id1] },
            products_mm: { connect: [id1] },
            products_mw: { connect: [id1] },
            myCompo: {
              compo_products_ow: { connect: [id1] },
              compo_products_mw: { connect: [id1] },
            },
          },
          ['myCompo']
        );

        const relationsToDisconnectMany =
          mode === 'object' ? [{ id: id3 }, { id: id2 }, { id: 9999 }] : [id3, id2, 9999];

        const { id } = await updateEntry(
          'shop',
          createdShop.id,
          {
            name: 'Cazotte Shop',
            products_ow: { disconnect: relationsToDisconnectMany },
            products_oo: { disconnect: relationsToDisconnectMany },
            products_mo: { disconnect: relationsToDisconnectMany },
            products_om: { disconnect: relationsToDisconnectMany },
            products_mm: { disconnect: relationsToDisconnectMany },
            products_mw: { disconnect: relationsToDisconnectMany },
            myCompo: {
              id: createdShop.myCompo.id,
              compo_products_ow: { disconnect: relationsToDisconnectMany },
              compo_products_mw: { disconnect: relationsToDisconnectMany },
            },
          },
          populateShop
        );

        const updatedShop = await strapi.db
          .query('api::shop.shop')
          .findOne({ where: { id }, populate: populateShop });

        expect(updatedShop.myCompo.compo_products_mw).toMatchObject([{ id: id1 }]);
        expect(updatedShop.myCompo.compo_products_ow).toMatchObject({ id: id1 });
        expect(updatedShop.products_mm).toMatchObject([{ id: id1 }]);
        expect(updatedShop.products_mo).toMatchObject({ id: id1 });
        expect(updatedShop.products_mw).toMatchObject([{ id: id1 }]);
        expect(updatedShop.products_om).toMatchObject([{ id: id1 }]);
        expect(updatedShop.products_oo).toMatchObject({ id: id1 });
        expect(updatedShop.products_ow).toMatchObject({ id: id1 });
      });
    });
  });

  describe('Clone entity with relations', () => {
    test('Auto cloning entity with relations should fail', async () => {
      const createdShop = await createEntry(
        'shop',
        {
          name: 'Cazotte Shop',
          products_ow: { connect: [id1] },
          products_oo: { connect: [id1] },
          products_mo: { connect: [id1] },
          products_om: { connect: [id1] },
          products_mm: { connect: [id1] },
          products_mw: { connect: [id1] },
          myCompo: {
            compo_products_ow: { connect: [id1] },
            compo_products_mw: { connect: [id1] },
          },
        },
        ['myCompo']
      );

      // Clone with empty data
      const res = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/api::shop.shop/auto-clone/${createdShop.id}`,
        body: {},
      });

      expect(res.statusCode).toBe(400);
    });

    test('Clone entity with relations and connect data', async () => {
      const createdShop = await createEntry(
        'shop',
        {
          name: 'Cazotte Shop',
          products_ow: { connect: [id1] },
          products_oo: { connect: [id1] },
          products_mo: { connect: [id1] },
          products_om: { connect: [id1] },
          products_mm: { connect: [id1] },
          products_mw: { connect: [id1] },
          myCompo: {
            compo_products_ow: { connect: [id1] },
            compo_products_mw: { connect: [id1] },
          },
        },
        ['myCompo']
      );

      const { id, name } = await cloneEntry('shop', createdShop.id, {
        name: 'Cazotte Shop 2',
        products_ow: { connect: [id2] },
        products_oo: { connect: [id2] },
        products_mo: { connect: [id2] },
        products_om: { connect: [id2] },
        products_mm: { connect: [id2] },
        products_mw: { connect: [id2] },
        myCompo: {
          id: createdShop.myCompo.id,
          compo_products_ow: { connect: [id2] },
          compo_products_mw: { connect: [id2] },
        },
      });

      expect(name).toBe('Cazotte Shop 2');

      const clonedShop = await strapi.db
        .query('api::shop.shop')
        .findOne({ where: { id }, populate: populateShop });

      expect(clonedShop.myCompo.compo_products_mw).toMatchObject([{ id: id1 }, { id: id2 }]);
      expect(clonedShop.myCompo.compo_products_ow).toMatchObject({ id: id2 });
      expect(clonedShop.products_mm).toMatchObject([{ id: id1 }, { id: id2 }]);
      expect(clonedShop.products_mo).toMatchObject({ id: id2 });
      expect(clonedShop.products_mw).toMatchObject([{ id: id1 }, { id: id2 }]);
      expect(clonedShop.products_om).toMatchObject([{ id: id1 }, { id: id2 }]);
      expect(clonedShop.products_oo).toMatchObject({ id: id2 });
      expect(clonedShop.products_ow).toMatchObject({ id: id2 });
    });

    test('Clone entity with relations and disconnect data', async () => {
      const createdShop = await createEntry(
        'shop',
        {
          name: 'Cazotte Shop',
          products_ow: { connect: [id1] },
          products_oo: { connect: [id1] },
          products_mo: { connect: [id1] },
          products_om: { connect: [id1, id2] },
          products_mm: { connect: [id1, id2] },
          products_mw: { connect: [id1, id2] },
          myCompo: {
            compo_products_ow: { connect: [id1] },
            compo_products_mw: { connect: [id1, id2] },
          },
        },
        ['myCompo']
      );

      const { id, name } = await cloneEntry('shop', createdShop.id, {
        name: 'Cazotte Shop 2',
        products_ow: { disconnect: [id1] },
        products_oo: { disconnect: [id1] },
        products_mo: { disconnect: [id1] },
        products_om: { disconnect: [id1] },
        products_mm: { disconnect: [id1] },
        products_mw: { disconnect: [id1] },
        myCompo: {
          id: createdShop.myCompo.id,
          compo_products_ow: { disconnect: [id1] },
          compo_products_mw: { disconnect: [id1] },
        },
      });

      expect(name).toBe('Cazotte Shop 2');

      const clonedShop = await strapi.db
        .query('api::shop.shop')
        .findOne({ where: { id }, populate: populateShop });

      expect(clonedShop.myCompo.compo_products_mw).toMatchObject([{ id: id2 }]);
      expect(clonedShop.myCompo.compo_products_ow).toBe(null);
      expect(clonedShop.products_mm).toMatchObject([{ id: id2 }]);
      expect(clonedShop.products_mo).toBe(null);
      expect(clonedShop.products_mw).toMatchObject([{ id: id2 }]);
      expect(clonedShop.products_om).toMatchObject([{ id: id2 }]);
      expect(clonedShop.products_oo).toBe(null);
      expect(clonedShop.products_ow).toBe(null);
    });

    test('Clone entity with relations and disconnect data should not steal relations', async () => {
      const createdShop = await createEntry(
        'shop',
        {
          name: 'Cazotte Shop',
          products_ow: { connect: [id1] },
          products_oo: { connect: [id1] },
          products_mo: { connect: [id1] },
          products_om: { connect: [id1, id2] },
          products_mm: { connect: [id1, id2] },
          products_mw: { connect: [id1, id2] },
          myCompo: {
            compo_products_ow: { connect: [id1] },
            compo_products_mw: { connect: [id1, id2] },
          },
        },
        ['myCompo']
      );

      await cloneEntry('shop', createdShop.id, {
        name: 'Cazotte Shop 2',
        products_oo: { disconnect: [id1] },
        products_om: { disconnect: [id1] },
      });

      const populatedCreatedShop = await strapi.db
        .query('api::shop.shop')
        .findOne({ where: { id: createdShop.id }, populate: populateShop });

      expect(populatedCreatedShop.products_om).toMatchObject([{ id: id1 }]);
      expect(populatedCreatedShop.products_oo).toMatchObject({ id: id1 });
    });

    test('Clone entity with relations and set data should not steal relations', async () => {
      const createdShop = await createEntry(
        'shop',
        {
          name: 'Cazotte Shop',
          products_ow: { connect: [id1] },
          products_oo: { connect: [id1] },
          products_mo: { connect: [id1] },
          products_om: { connect: [id1, id2] },
          products_mm: { connect: [id1, id2] },
          products_mw: { connect: [id1, id2] },
          myCompo: {
            compo_products_ow: { connect: [id1] },
            compo_products_mw: { connect: [id1, id2] },
          },
        },
        ['myCompo']
      );

      await cloneEntry('shop', createdShop.id, {
        name: 'Cazotte Shop 2',
        products_oo: { set: [id2] }, // id 1 should not be stolen from createdShop products_oo
        products_om: { set: [id2] }, // id 1 should not be stolen from createdShop products_om
      });

      const populatedCreatedShop = await strapi.db
        .query('api::shop.shop')
        .findOne({ where: { id: createdShop.id }, populate: populateShop });

      expect(populatedCreatedShop.products_om).toMatchObject([{ id: id1 }]);
      expect(populatedCreatedShop.products_oo).toMatchObject({ id: id1 });
    });
  });
});
