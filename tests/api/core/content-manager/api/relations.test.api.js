'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const modelsUtils = require('api-tests/models');
const { isArray } = require('lodash');

let strapi;
let rq;
const data = {
  products: [],
  shops: [],
};

let id1;
let id2;
let id3;

let docid1;
let docid2;
let docid3;

const testCases = [
  ['documentId object format ([{ documentId: "123f" }, { documentId: "54ed" }])', 'docIdObject'],
  ['id object format ([{ id: 1 }, { id: 2 }])', 'idObject'],
  ['documentId directly (["1faw23", "2fawe"])', 'docId'],
];

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
  const res = await rq({
    method: 'POST',
    url: `/content-manager/collection-types/api::${singularName}.${singularName}/clone/${id}`,
    body: data,
    qs: { populate },
  });

  return res.body;
};

const getRelations = async (uid, field, id) => {
  const res = await rq({
    method: 'GET',
    url: `/content-manager/relations/${uid}/${id}/${field}`,
  });

  return res.body;
};

const mapRelationsByMode = (mode, docids, ids) => {
  if (mode === 'docIdObject') {
    if (isArray(docids)) {
      return docids.map((id) => {
        return {
          documentId: id,
        };
      });
    }
    return { documentId: docids };
  }
  if (mode === 'idObject') {
    if (isArray(ids)) {
      return ids.map((id) => {
        return {
          id,
        };
      });
    }
    return { id: ids };
  }
  if (mode === 'docId') {
    return ids;
  }
};

describe('Relations', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder.addComponent(compo(false)).addContentTypes([productModel, shopModel]).build();

    await modelsUtils.modifyComponent(compo(true));

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const createdProduct1 = await createEntry('product', { name: 'Skate' });
    const createdProduct2 = await createEntry('product', { name: 'Candle' });
    const createdProduct3 = await createEntry('product', { name: 'Mug' });

    data.products.push(createdProduct1.data);
    data.products.push(createdProduct2.data);
    data.products.push(createdProduct3.data);

    docid1 = data.products[0].documentId;
    docid2 = data.products[1].documentId;
    docid3 = data.products[2].documentId;

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
      describe.each(testCases)('ids being %s', (name, mode) => {
        test('In one order', async () => {
          const oneRelation = mapRelationsByMode(mode, [docid1], [id1]);
          const manyRelations = mapRelationsByMode(mode, [docid1, docid2], [id1, id2]);

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
          const expectedOneRelation = mode === 'idObject' ? { id: id1 } : { documentId: docid1 };
          const expectedManyRelations =
            mode === 'idObject'
              ? [{ id: id2 }, { id: id1 }]
              : [{ documentId: docid2 }, { documentId: docid1 }];

          res = await getRelations('default.compo', 'compo_products_mw', shop.data.myCompo.id);
          expect(res.results).toMatchObject(expectedManyRelations);

          res = await getRelations('default.compo', 'compo_products_ow', shop.data.myCompo.id);
          expect(res.results).toMatchObject([expectedOneRelation]);

          res = await getRelations('api::shop.shop', 'products_mm', shop.data.documentId);
          expect(res.results).toMatchObject(expectedManyRelations);

          res = await getRelations('api::shop.shop', 'products_mo', shop.data.documentId);
          expect(res.results).toMatchObject([expectedOneRelation]);

          res = await getRelations('api::shop.shop', 'products_mw', shop.data.documentId);
          expect(res.results).toMatchObject(expectedManyRelations);

          res = await getRelations('api::shop.shop', 'products_om', shop.data.documentId);
          expect(res.results).toMatchObject(expectedManyRelations);

          res = await getRelations('api::shop.shop', 'products_oo', shop.data.documentId);
          expect(res.results).toMatchObject([expectedOneRelation]);

          res = await getRelations('api::shop.shop', 'products_ow', shop.data.documentId);
          expect(res.results).toMatchObject([expectedOneRelation]);
        });

        test('In reversed order', async () => {
          const oneRelation = mapRelationsByMode(mode, [docid1], [id1]);
          const manyRelations = mapRelationsByMode(mode, [docid1, docid2], [id1, id2]);
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
          const expectedOneRelation = mode === 'idObject' ? { id: id1 } : { documentId: docid1 };
          const expectedManyRelations =
            mode === 'idObject'
              ? [{ id: id1 }, { id: id2 }]
              : [{ documentId: docid1 }, { documentId: docid2 }];

          res = await getRelations('default.compo', 'compo_products_mw', shop.data.myCompo.id);
          expect(res.results).toMatchObject(expectedManyRelations);

          res = await getRelations('default.compo', 'compo_products_ow', shop.data.myCompo.id);
          expect(res.results).toMatchObject([expectedOneRelation]);

          res = await getRelations('api::shop.shop', 'products_mm', shop.data.documentId);
          expect(res.results).toMatchObject(expectedManyRelations);

          res = await getRelations('api::shop.shop', 'products_mo', shop.data.documentId);
          expect(res.results).toMatchObject([expectedOneRelation]);

          res = await getRelations('api::shop.shop', 'products_mw', shop.data.documentId);
          expect(res.results).toMatchObject(expectedManyRelations);

          res = await getRelations('api::shop.shop', 'products_om', shop.data.documentId);
          expect(res.results).toMatchObject(expectedManyRelations);

          res = await getRelations('api::shop.shop', 'products_oo', shop.data.documentId);
          expect(res.results).toMatchObject([expectedOneRelation]);

          res = await getRelations('api::shop.shop', 'products_ow', shop.data.documentId);
          expect(res.results).toMatchObject([expectedOneRelation]);
        });
      });
    }
  );

  describe('Update an entity relations', () => {
    describe.each(testCases)('ids being %s', (name, mode) => {
      test('Adding id3', async () => {
        const oneRelation = mapRelationsByMode(mode, [docid1], [id1]);
        const manyRelations = mapRelationsByMode(mode, [docid1, docid2], [id1, id2]);

        const createdShop = await createEntry(
          'shop',
          {
            name: 'Cazotte Shop',
            products_ow: { connect: oneRelation },
            products_oo: { connect: oneRelation },
            products_mo: { connect: oneRelation },
            products_om: { connect: manyRelations },
            products_mm: { connect: manyRelations },
            products_mw: { connect: manyRelations },
            myCompo: {
              compo_products_ow: { connect: oneRelation },
              compo_products_mw: { connect: manyRelations },
            },
          },
          ['myCompo']
        );

        const relationToAdd = mapRelationsByMode(mode, [docid3], [id3]);

        const updatedShop = await updateEntry(
          'shop',
          createdShop.data.documentId,
          {
            name: 'Cazotte Shop',
            products_ow: { connect: relationToAdd },
            products_oo: { connect: relationToAdd },
            products_mo: { connect: relationToAdd },
            products_om: { connect: relationToAdd },
            products_mm: { connect: relationToAdd },
            products_mw: { connect: relationToAdd },
            myCompo: {
              id: createdShop.data.myCompo.id,
              compo_products_ow: { connect: relationToAdd },
              compo_products_mw: { connect: relationToAdd },
            },
          },
          populateShop
        );

        let res;
        res = await getRelations('default.compo', 'compo_products_mw', updatedShop.data.myCompo.id);
        expect(res.results).toMatchObject([
          { documentId: docid3 },
          { documentId: docid2 },
          { documentId: docid1 },
        ]);

        res = await getRelations('default.compo', 'compo_products_ow', updatedShop.data.myCompo.id);
        expect(res.results).toMatchObject([{ documentId: docid3 }]);

        res = await getRelations('api::shop.shop', 'products_mm', updatedShop.data.documentId);
        expect(res.results).toMatchObject([
          { documentId: docid3 },
          { documentId: docid2 },
          { documentId: docid1 },
        ]);

        res = await getRelations('api::shop.shop', 'products_mo', updatedShop.data.documentId);
        expect(res.results).toMatchObject([{ documentId: docid3 }]);

        res = await getRelations('api::shop.shop', 'products_mw', updatedShop.data.documentId);
        expect(res.results).toMatchObject([
          { documentId: docid3 },
          { documentId: docid2 },
          { documentId: docid1 },
        ]);

        res = await getRelations('api::shop.shop', 'products_om', updatedShop.data.documentId);
        expect(res.results).toMatchObject([
          { documentId: docid3 },
          { documentId: docid2 },
          { documentId: docid1 },
        ]);

        res = await getRelations('api::shop.shop', 'products_oo', updatedShop.data.documentId);
        expect(res.results).toMatchObject([{ documentId: docid3 }]);

        res = await getRelations('api::shop.shop', 'products_ow', updatedShop.data.documentId);
        expect(res.results).toMatchObject([{ documentId: docid3 }]);
      });

      test('Adding docid3 & removing docid1', async () => {
        const oneRelation = mapRelationsByMode(mode, [docid1], [id1]);
        const manyRelations = mapRelationsByMode(mode, [docid1, docid2], [id1, id2]);

        const createdShop = await createEntry(
          'shop',
          {
            name: 'Cazotte Shop',
            products_ow: { connect: oneRelation },
            products_oo: { connect: oneRelation },
            products_mo: { connect: oneRelation },
            products_om: { connect: manyRelations },
            products_mm: { connect: manyRelations },
            products_mw: { connect: manyRelations },
            myCompo: {
              compo_products_ow: { connect: oneRelation },
              compo_products_mw: { connect: manyRelations },
            },
          },
          ['myCompo']
        );

        const relationToAdd = mapRelationsByMode(mode, [docid3], [id3]);
        const relationToRemove = mapRelationsByMode(mode, [docid1], [id1]);

        const updatedShop = await updateEntry(
          'shop',
          createdShop.data.documentId,
          {
            name: 'Cazotte Shop',
            products_ow: { connect: relationToAdd, disconnect: relationToRemove },
            products_oo: { connect: relationToAdd, disconnect: relationToRemove },
            products_mo: { connect: relationToAdd, disconnect: relationToRemove },
            products_om: { connect: relationToAdd, disconnect: relationToRemove },
            products_mm: { connect: relationToAdd, disconnect: relationToRemove },
            products_mw: { connect: relationToAdd, disconnect: relationToRemove },
            myCompo: {
              id: createdShop.data.myCompo.id,
              compo_products_ow: { connect: relationToAdd, disconnect: relationToRemove },
              compo_products_mw: { connect: relationToAdd, disconnect: relationToRemove },
            },
          },
          populateShop
        );

        let res;
        res = await getRelations('default.compo', 'compo_products_mw', updatedShop.data.myCompo.id);
        expect(res.results).toMatchObject([{ documentId: docid3 }, { documentId: docid2 }]);

        res = await getRelations('default.compo', 'compo_products_ow', updatedShop.data.myCompo.id);
        expect(res.results).toMatchObject([{ documentId: docid3 }]);

        res = await getRelations('api::shop.shop', 'products_mm', updatedShop.data.documentId);
        expect(res.results).toMatchObject([{ documentId: docid3 }, { documentId: docid2 }]);

        res = await getRelations('api::shop.shop', 'products_mo', updatedShop.data.documentId);
        expect(res.results).toMatchObject([{ documentId: docid3 }]);

        res = await getRelations('api::shop.shop', 'products_mw', updatedShop.data.documentId);
        expect(res.results).toMatchObject([{ documentId: docid3 }, { documentId: docid2 }]);

        res = await getRelations('api::shop.shop', 'products_om', updatedShop.data.documentId);
        expect(res.results).toMatchObject([{ documentId: docid3 }, { documentId: docid2 }]);

        res = await getRelations('api::shop.shop', 'products_oo', updatedShop.data.documentId);
        expect(res.results).toMatchObject([{ documentId: docid3 }]);

        res = await getRelations('api::shop.shop', 'products_ow', updatedShop.data.documentId);
        expect(res.results).toMatchObject([{ documentId: docid3 }]);
      });
      test('Adding docid3 & removing docid1, docid3 (should still add docid3)', async () => {
        const oneRelation = mapRelationsByMode(mode, [docid1], [id1]);
        const manyRelations = mapRelationsByMode(mode, [docid1, docid2], [id1, id2]);

        const createdShop = await createEntry(
          'shop',
          {
            name: 'Cazotte Shop',
            products_ow: { connect: oneRelation },
            products_oo: { connect: oneRelation },
            products_mo: { connect: oneRelation },
            products_om: { connect: manyRelations },
            products_mm: { connect: manyRelations },
            products_mw: { connect: manyRelations },
            myCompo: {
              compo_products_ow: { connect: oneRelation },
              compo_products_mw: { connect: manyRelations },
            },
          },
          ['myCompo']
        );

        const relationToAdd = mapRelationsByMode(mode, [docid3], [id3]);
        const relationToRemove = mapRelationsByMode(mode, [docid1, docid3], [id1, id3]);

        const updatedShop = await updateEntry(
          'shop',
          createdShop.data.documentId,
          {
            name: 'Cazotte Shop',
            products_ow: { connect: relationToAdd, disconnect: relationToRemove },
            products_oo: { connect: relationToAdd, disconnect: relationToRemove },
            products_mo: { connect: relationToAdd, disconnect: relationToRemove },
            products_om: { connect: relationToAdd, disconnect: relationToRemove },
            products_mm: { connect: relationToAdd, disconnect: relationToRemove },
            products_mw: { connect: relationToAdd, disconnect: relationToRemove },
            myCompo: {
              id: createdShop.data.myCompo.id,
              compo_products_ow: { connect: relationToAdd, disconnect: relationToRemove },
              compo_products_mw: { connect: relationToAdd, disconnect: relationToRemove },
            },
          },
          populateShop
        );

        let res;
        res = await getRelations('default.compo', 'compo_products_mw', updatedShop.data.myCompo.id);
        expect(res.results).toMatchObject([{ documentId: docid3 }, { documentId: docid2 }]);

        res = await getRelations('default.compo', 'compo_products_ow', updatedShop.data.myCompo.id);
        expect(res.results).toMatchObject([{ documentId: docid3 }]);

        res = await getRelations('api::shop.shop', 'products_mm', updatedShop.data.documentId);
        expect(res.results).toMatchObject([{ documentId: docid3 }, { documentId: docid2 }]);

        res = await getRelations('api::shop.shop', 'products_mo', updatedShop.data.documentId);
        expect(res.results).toMatchObject([{ documentId: docid3 }]);

        res = await getRelations('api::shop.shop', 'products_mw', updatedShop.data.documentId);
        expect(res.results).toMatchObject([{ documentId: docid3 }, { documentId: docid2 }]);

        res = await getRelations('api::shop.shop', 'products_om', updatedShop.data.documentId);
        expect(res.results).toMatchObject([{ documentId: docid3 }, { documentId: docid2 }]);

        res = await getRelations('api::shop.shop', 'products_oo', updatedShop.data.documentId);
        expect(res.results).toMatchObject([{ documentId: docid3 }]);

        res = await getRelations('api::shop.shop', 'products_ow', updatedShop.data.documentId);
        expect(res.results).toMatchObject([{ documentId: docid3 }]);
      });

      test('Change relation order from id1, id2, id3 to id3, id2, id1', async () => {
        const manyRelations = mapRelationsByMode(mode, [docid1, docid2, docid3], [id1, id2, id3]);

        const createdShop = await createEntry(
          'shop',
          {
            name: 'Cazotte Shop',
            products_om: { connect: manyRelations },
            products_mm: { connect: manyRelations },
            products_mw: { connect: manyRelations },
            myCompo: {
              compo_products_mw: { connect: manyRelations },
            },
          },
          ['myCompo']
        );

        const relationToChange = mapRelationsByMode(
          mode,
          [docid3, docid2, docid1],
          [id3, id2, id1]
        );

        const updatedShop = await updateEntry(
          'shop',
          createdShop.data.documentId,
          {
            name: 'Cazotte Shop',
            products_om: { connect: relationToChange },
            products_mm: { connect: relationToChange },
            products_mw: { connect: relationToChange },
            myCompo: {
              id: createdShop.data.myCompo.id,
              compo_products_mw: { connect: relationToChange },
            },
          },
          populateShop
        );

        let res;
        res = await getRelations('default.compo', 'compo_products_mw', updatedShop.data.myCompo.id);
        expect(res.results).toMatchObject([
          { documentId: docid1 },
          { documentId: docid2 },
          { documentId: docid3 },
        ]);

        res = await getRelations('api::shop.shop', 'products_mm', updatedShop.data.documentId);
        expect(res.results).toMatchObject([
          { documentId: docid1 },
          { documentId: docid2 },
          { documentId: docid3 },
        ]);

        res = await getRelations('api::shop.shop', 'products_mw', updatedShop.data.documentId);
        expect(res.results).toMatchObject([
          { documentId: docid1 },
          { documentId: docid2 },
          { documentId: docid3 },
        ]);

        res = await getRelations('api::shop.shop', 'products_om', updatedShop.data.documentId);
        expect(res.results).toMatchObject([
          { documentId: docid1 },
          { documentId: docid2 },
          { documentId: docid3 },
        ]);
      });

      test('Change relation order by putting id2 at the end', async () => {
        const manyRelations = mapRelationsByMode(mode, [docid1, docid2, docid3], [id1, id2, id3]);

        const createdShop = await createEntry(
          'shop',
          {
            name: 'Cazotte Shop',
            products_om: { connect: manyRelations },
            products_mm: { connect: manyRelations },
            products_mw: { connect: manyRelations },
            myCompo: {
              compo_products_mw: { connect: manyRelations },
            },
          },
          ['myCompo']
        );

        const relationToChange = mapRelationsByMode(mode, [docid2], [id2]);

        const updatedShop = await updateEntry(
          'shop',
          createdShop.data.documentId,
          {
            name: 'Cazotte Shop',
            products_om: { connect: relationToChange },
            products_mm: { connect: relationToChange },
            products_mw: { connect: relationToChange },
            myCompo: {
              id: createdShop.data.myCompo.id,
              compo_products_mw: { connect: relationToChange },
            },
          },
          populateShop
        );

        let res;
        res = await getRelations('default.compo', 'compo_products_mw', updatedShop.data.myCompo.id);
        expect(res.results).toMatchObject([
          { documentId: docid2 },
          { documentId: docid3 },
          { documentId: docid1 },
        ]);

        res = await getRelations('api::shop.shop', 'products_mm', updatedShop.data.documentId);
        expect(res.results).toMatchObject([
          { documentId: docid2 },
          { documentId: docid3 },
          { documentId: docid1 },
        ]);

        res = await getRelations('api::shop.shop', 'products_mw', updatedShop.data.documentId);
        expect(res.results).toMatchObject([
          { documentId: docid2 },
          { documentId: docid3 },
          { documentId: docid1 },
        ]);

        res = await getRelations('api::shop.shop', 'products_om', updatedShop.data.documentId);
        expect(res.results).toMatchObject([
          { documentId: docid2 },
          { documentId: docid3 },
          { documentId: docid1 },
        ]);
      });

      test('Change relation order by putting docid2, docid1 at the end', async () => {
        const manyRelations = mapRelationsByMode(mode, [docid1, docid2, docid3], [id1, id2, id3]);

        const createdShop = await createEntry(
          'shop',
          {
            name: 'Cazotte Shop',
            products_om: { connect: manyRelations },
            products_mm: { connect: manyRelations },
            products_mw: { connect: manyRelations },
            myCompo: {
              compo_products_mw: { connect: manyRelations },
            },
          },
          ['myCompo']
        );

        const relationToChange = mapRelationsByMode(mode, [docid2, docid1], [id2, id1]);

        const updatedShop = await updateEntry(
          'shop',
          createdShop.data.documentId,
          {
            name: 'Cazotte Shop',
            products_om: { connect: relationToChange },
            products_mm: { connect: relationToChange },
            products_mw: { connect: relationToChange },
            myCompo: {
              id: createdShop.data.myCompo.id,
              compo_products_mw: { connect: relationToChange },
            },
          },
          populateShop
        );

        let res;
        res = await getRelations('default.compo', 'compo_products_mw', updatedShop.data.myCompo.id);
        expect(res.results).toMatchObject([
          { documentId: docid1 },
          { documentId: docid2 },
          { documentId: docid3 },
        ]);

        res = await getRelations('api::shop.shop', 'products_mm', updatedShop.data.documentId);

        expect(res.results).toMatchObject([
          { documentId: docid1 },
          { documentId: docid2 },
          { documentId: docid3 },
        ]);

        res = await getRelations('api::shop.shop', 'products_mw', updatedShop.data.documentId);
        expect(res.results).toMatchObject([
          { documentId: docid1 },
          { documentId: docid2 },
          { documentId: docid3 },
        ]);

        res = await getRelations('api::shop.shop', 'products_om', updatedShop.data.documentId);
        expect(res.results).toMatchObject([
          { documentId: docid1 },
          { documentId: docid2 },
          { documentId: docid3 },
        ]);
      });
    });
  });

  // exclude docId because reordering only works with objects
  // eslint-disable-next-line no-unused-vars
  describe.each(testCases.filter(([_name, mode]) => mode !== 'docId'))(
    'Reorder an entity relations - %s',
    (name, mode) => {
      test('Reorder single relation', async () => {
        const manyRelations = mapRelationsByMode(mode, [docid1, docid2, docid3], [id1, id2, id3]);

        const createdShop = await createEntry(
          'shop',
          {
            name: 'Cazotte Shop',
            products_om: { connect: manyRelations },
            products_mm: { connect: manyRelations },
            products_mw: { connect: manyRelations },
            myCompo: {
              compo_products_mw: { connect: manyRelations },
            },
          },
          ['myCompo']
        );

        const relationToChange =
          mode === 'idObject'
            ? [{ id: id1, position: { before: id3 } }]
            : [{ documentId: docid1, position: { before: docid3 } }];

        const updatedEntry = await updateEntry('shop', createdShop.data.documentId, {
          name: 'Cazotte Shop',
          products_om: { connect: relationToChange },
          products_mm: { connect: relationToChange },
          products_mw: { connect: relationToChange },
          myCompo: {
            id: createdShop.data.myCompo.id,
            compo_products_mw: { connect: relationToChange },
          },
        });

        const expectedRelations =
          mode === 'idObject'
            ? [{ id: id2 }, { id: id1 }, { id: id3 }]
            : [{ documentId: docid2 }, { documentId: docid1 }, { documentId: docid3 }];

        const updatedShop = await strapi.db
          .query('api::shop.shop')
          .findOne({ where: { id: updatedEntry.data.id }, populate: populateShop });

        expect(updatedShop.myCompo.compo_products_mw).toMatchObject(expectedRelations);
        expect(updatedShop.products_mm).toMatchObject(expectedRelations);
        expect(updatedShop.products_mw).toMatchObject(expectedRelations);
        expect(updatedShop.products_om).toMatchObject(expectedRelations);
      });

      test('Reorder multiple relations', async () => {
        const manyRelations = mapRelationsByMode(mode, [docid1, docid2, docid3], [id1, id2, id3]);

        const createdShop = await createEntry(
          'shop',
          {
            name: 'Cazotte Shop',
            products_om: { connect: manyRelations },
            products_mm: { connect: manyRelations },
            products_mw: { connect: manyRelations },
            myCompo: {
              compo_products_mw: { connect: manyRelations },
            },
          },
          ['myCompo']
        );

        const relationToChange =
          mode === 'idObject'
            ? [
                { id: id1, position: { end: true } },
                { id: id3, position: { start: true } },
                { id: id2, position: { after: id1 } },
              ]
            : [
                { documentId: docid1, position: { end: true } },
                { documentId: docid3, position: { start: true } },
                { documentId: docid2, position: { after: docid1 } },
              ];

        const updatedEntry = await updateEntry('shop', createdShop.data.documentId, {
          name: 'Cazotte Shop',
          products_om: { connect: relationToChange },
          products_mm: { connect: relationToChange },
          products_mw: { connect: relationToChange },
          myCompo: {
            id: createdShop.data.myCompo.id,
            compo_products_mw: { connect: relationToChange },
          },
        });

        const expectedRelations =
          mode === 'idObject'
            ? [{ id: id3 }, { id: id1 }, { id: id2 }]
            : [{ documentId: docid3 }, { documentId: docid1 }, { documentId: docid2 }];

        const updatedShop = await strapi.db
          .query('api::shop.shop')
          .findOne({ where: { id: updatedEntry.data.id }, populate: populateShop });

        expect(updatedShop.myCompo.compo_products_mw).toMatchObject(expectedRelations);
        expect(updatedShop.products_mm).toMatchObject(expectedRelations);
        expect(updatedShop.products_mw).toMatchObject(expectedRelations);
        expect(updatedShop.products_om).toMatchObject(expectedRelations);
      });

      test('Invalid reorder with non-strict mode should not give an error', async () => {
        const manyRelations = mapRelationsByMode(mode, [docid1, docid2], [id1, id2]);

        const createdShop = await createEntry(
          'shop',
          {
            name: 'Cazotte Shop',
            products_om: { connect: manyRelations },
            products_mm: { connect: manyRelations },
            products_mw: { connect: manyRelations },
            myCompo: {
              compo_products_mw: { connect: manyRelations },
            },
          },
          ['myCompo']
        );

        const relationToChange =
          mode === 'idObject'
            ? [{ id: id1, position: { before: id3 } }] // id3 does not exist in these relations
            : [{ documentId: docid1, position: { before: docid3 } }]; // docid3 does not exist in these relations

        const updatedEntry = await updateEntry('shop', createdShop.data.documentId, {
          name: 'Cazotte Shop',
          products_om: { options: { strict: false }, connect: relationToChange },
          products_mm: { options: { strict: false }, connect: relationToChange },
          products_mw: { options: { strict: false }, connect: relationToChange },
          myCompo: {
            id: createdShop.data.myCompo.id,
            compo_products_mw: { options: { strict: false }, connect: relationToChange },
          },
        });

        const expectedRelations =
          mode === 'idObject'
            ? [{ id: id2 }, { id: id1 }]
            : [{ documentId: docid2 }, { documentId: docid1 }];

        const updatedShop = await strapi.db
          .query('api::shop.shop')
          .findOne({ where: { id: updatedEntry.data.id }, populate: populateShop });

        expect(updatedShop.myCompo.compo_products_mw).toMatchObject(expectedRelations);
        expect(updatedShop.products_mm).toMatchObject(expectedRelations);
        expect(updatedShop.products_mw).toMatchObject(expectedRelations);
        expect(updatedShop.products_om).toMatchObject(expectedRelations);
      });
    }
  );

  describe('Disconnect entity relations', () => {
    describe.each(testCases)('ids being %s', (name, mode) => {
      test('Remove all relations docid1, docid2, docid3', async () => {
        const createdShop = await createEntry(
          'shop',
          {
            name: 'Cazotte Shop',
            products_ow: { connect: [docid1] },
            products_oo: { connect: [docid1] },
            products_mo: { connect: [docid1] },
            products_om: { connect: [docid1, docid2, docid3] },
            products_mm: { connect: [docid1, docid2, docid3] },
            products_mw: { connect: [docid1, docid2, docid3] },
            myCompo: {
              compo_products_ow: { connect: [docid1] },
              compo_products_mw: { connect: [docid1, docid2, docid3] },
            },
          },
          ['myCompo']
        );

        const relationsToDisconnectOne =
          mode === 'docIdObject' ? [{ documentId: docid1 }] : [docid1];
        const relationsToDisconnectMany =
          mode === 'docIdObject'
            ? [{ documentId: docid3 }, { documentId: docid2 }, { documentId: docid1 }]
            : [docid3, docid2, docid1];

        const updatedEntry = await updateEntry(
          'shop',
          createdShop.data.documentId,
          {
            name: 'Cazotte Shop',
            products_ow: { disconnect: relationsToDisconnectOne },
            products_oo: { disconnect: relationsToDisconnectOne },
            products_mo: { disconnect: relationsToDisconnectOne },
            products_om: { disconnect: relationsToDisconnectMany },
            products_mm: { disconnect: relationsToDisconnectMany },
            products_mw: { disconnect: relationsToDisconnectMany },
            myCompo: {
              id: createdShop.data.myCompo.id,
              compo_products_ow: { disconnect: relationsToDisconnectOne },
              compo_products_mw: { disconnect: relationsToDisconnectMany },
            },
          },
          populateShop
        );

        const updatedShop = await strapi.db
          .query('api::shop.shop')
          .findOne({ where: { id: updatedEntry.data.id }, populate: populateShop });

        expect(updatedShop.myCompo.compo_products_mw).toMatchObject([]);
        expect(updatedShop.myCompo.compo_products_ow).toBe(null);
        expect(updatedShop.products_mm).toMatchObject([]);
        expect(updatedShop.products_mo).toBe(null);
        expect(updatedShop.products_mw).toMatchObject([]);
        expect(updatedShop.products_om).toMatchObject([]);
        expect(updatedShop.products_oo).toBe(null);
        expect(updatedShop.products_ow).toBe(null);
      });

      // TODO v6: direct docId does not throw an error but it should; it would be a breaking change to alter it now
      test("Handles relations that don't exist", async () => {
        const createdShop = await createEntry(
          'shop',
          {
            name: 'Cazotte Shop',
            products_ow: { connect: [docid1] },
            products_oo: { connect: [docid1] },
            products_mo: { connect: [docid1] },
            products_om: { connect: [docid1] },
            products_mm: { connect: [docid1] },
            products_mw: { connect: [docid1] },
            myCompo: {
              compo_products_ow: { connect: [docid1] },
              compo_products_mw: { connect: [docid1] },
            },
          },
          ['myCompo']
        );

        // TODO: rewrite this in a loop to test each attribute individually
        const relationsToDisconnectMany =
          mode === 'docIdObject'
            ? [{ documentId: docid3 }, { documentId: docid2 }, { documentId: 9999 }]
            : [docid3, docid2, 9999];

        const updatedEntry = await updateEntry(
          'shop',
          createdShop.data.documentId,
          {
            name: 'Cazotte Shop',
            products_ow: { disconnect: relationsToDisconnectMany },
            products_oo: { disconnect: relationsToDisconnectMany },
            products_mo: { disconnect: relationsToDisconnectMany },
            products_om: { disconnect: relationsToDisconnectMany },
            products_mm: { disconnect: relationsToDisconnectMany },
            products_mw: { disconnect: relationsToDisconnectMany },
            myCompo: {
              id: createdShop.data.myCompo.id,
              compo_products_ow: { disconnect: relationsToDisconnectMany },
              compo_products_mw: { disconnect: relationsToDisconnectMany },
            },
          },
          populateShop
        );

        if (mode === 'docIdObject') {
          expect(updatedEntry.error).toBeDefined();
          expect(updatedEntry.error.status).toBe(400);
        } else if (mode === 'docId' || mode === 'idObject') {
          const updatedShop = await strapi.db
            .query('api::shop.shop')
            .findOne({ where: { id: updatedEntry.data.id }, populate: populateShop });

          expect(updatedShop.myCompo.compo_products_mw).toMatchObject([{ id: id1 }]);
          expect(updatedShop.myCompo.compo_products_ow).toMatchObject({ id: id1 });
          expect(updatedShop.products_mm).toMatchObject([{ id: id1 }]);
          expect(updatedShop.products_mo).toMatchObject({ id: id1 });
          expect(updatedShop.products_mw).toMatchObject([{ id: id1 }]);
          expect(updatedShop.products_om).toMatchObject([{ id: id1 }]);
          expect(updatedShop.products_oo).toMatchObject({ id: id1 });
          expect(updatedShop.products_ow).toMatchObject({ id: id1 });
        } else {
          throw new Error(`Implement test for mode ${mode}`);
        }
      });
    });
  });

  describe.skip('Clone entity with relations', () => {
    test('Auto cloning entity with relations should fail', async () => {
      const createdShop = await createEntry(
        'shop',
        {
          name: 'Cazotte Shop',
          products_ow: { connect: [docid1] },
          products_oo: { connect: [docid1] },
          products_mo: { connect: [docid1] },
          products_om: { connect: [docid1] },
          products_mm: { connect: [docid1] },
          products_mw: { connect: [docid1] },
          myCompo: {
            compo_products_ow: { connect: [docid1] },
            compo_products_mw: { connect: [docid1] },
          },
        },
        ['myCompo']
      );

      // Clone with empty data
      const res = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/api::shop.shop/auto-clone/${createdShop.data.documentId}`,
        body: {},
      });

      expect(res.statusCode).toBe(400);
    });

    test('Clone entity with relations and connect data', async () => {
      const createdShop = await createEntry(
        'shop',
        {
          name: 'Cazotte Shop',
          products_ow: { connect: [docid1] },
          products_oo: { connect: [docid1] },
          products_mo: { connect: [docid1] },
          products_om: { connect: [docid1] },
          products_mm: { connect: [docid1] },
          products_mw: { connect: [docid1] },
          myCompo: {
            compo_products_ow: { connect: [docid1] },
            compo_products_mw: { connect: [docid1] },
          },
        },
        ['myCompo']
      );

      const { id, name } = await cloneEntry('shop', createdShop.documentId, {
        name: 'Cazotte Shop 2',
        products_ow: { connect: [docid2] },
        products_oo: { connect: [docid2] },
        products_mo: { connect: [docid2] },
        products_om: { connect: [docid2] },
        products_mm: { connect: [docid2] },
        products_mw: { connect: [docid2] },
        myCompo: {
          id: createdShop.data.myCompo.id,
          compo_products_ow: { connect: [docid2] },
          compo_products_mw: { connect: [docid2] },
        },
      });

      expect(name).toBe('Cazotte Shop 2');

      const clonedShop = await strapi.db
        .query('api::shop.shop')
        .findOne({ where: { id }, populate: populateShop });

      expect(clonedShop.myCompo.compo_products_mw).toMatchObject([
        { documentId: docid1 },
        { documentId: docid2 },
      ]);
      expect(clonedShop.myCompo.compo_products_ow).toMatchObject({ documentId: docid2 });
      expect(clonedShop.products_mm).toMatchObject([
        { documentId: docid1 },
        { documentId: docid2 },
      ]);
      expect(clonedShop.products_mo).toMatchObject({ documentId: docid2 });
      expect(clonedShop.products_mw).toMatchObject([
        { documentId: docid1 },
        { documentId: docid2 },
      ]);
      expect(clonedShop.products_om).toMatchObject([
        { documentId: docid1 },
        { documentId: docid2 },
      ]);
      expect(clonedShop.products_oo).toMatchObject({ documentId: docid2 });
      expect(clonedShop.products_ow).toMatchObject({ documentId: docid2 });
    });

    test('Clone entity with relations and disconnect data', async () => {
      const createdShop = await createEntry(
        'shop',
        {
          name: 'Cazotte Shop',
          products_ow: { connect: [docid1] },
          products_oo: { connect: [docid1] },
          products_mo: { connect: [docid1] },
          products_om: { connect: [docid1, docid2] },
          products_mm: { connect: [docid1, docid2] },
          products_mw: { connect: [docid1, docid2] },
          myCompo: {
            compo_products_ow: { connect: [docid1] },
            compo_products_mw: { connect: [docid1, docid2] },
          },
        },
        ['myCompo']
      );

      const { id, name } = await cloneEntry('shop', createdShop.documentId, {
        name: 'Cazotte Shop 2',
        products_ow: { disconnect: [docid1] },
        products_oo: { disconnect: [docid1] },
        products_mo: { disconnect: [docid1] },
        products_om: { disconnect: [docid1] },
        products_mm: { disconnect: [docid1] },
        products_mw: { disconnect: [docid1] },
        myCompo: {
          id: createdShop.myCompo.id,
          compo_products_ow: { disconnect: [docid1] },
          compo_products_mw: { disconnect: [docid1] },
        },
      });

      expect(name).toBe('Cazotte Shop 2');

      const clonedShop = await strapi.db
        .query('api::shop.shop')
        .findOne({ where: { id }, populate: populateShop });

      expect(clonedShop.myCompo.compo_products_mw).toMatchObject([{ documentId: docid2 }]);
      expect(clonedShop.myCompo.compo_products_ow).toBe(null);
      expect(clonedShop.products_mm).toMatchObject([{ documentId: docid2 }]);
      expect(clonedShop.products_mo).toBe(null);
      expect(clonedShop.products_mw).toMatchObject([{ documentId: docid2 }]);
      expect(clonedShop.products_om).toMatchObject([{ documentId: docid2 }]);
      expect(clonedShop.products_oo).toBe(null);
      expect(clonedShop.products_ow).toBe(null);
    });

    test('Clone entity with relations and disconnect data should not steal relations', async () => {
      const createdShop = await createEntry(
        'shop',
        {
          name: 'Cazotte Shop',
          products_ow: { connect: [docid1] },
          products_oo: { connect: [docid1] },
          products_mo: { connect: [docid1] },
          products_om: { connect: [docid1, docid2] },
          products_mm: { connect: [docid1, docid2] },
          products_mw: { connect: [docid1, docid2] },
          myCompo: {
            compo_products_ow: { connect: [docid1] },
            compo_products_mw: { connect: [docid1, docid2] },
          },
        },
        ['myCompo']
      );

      await cloneEntry('shop', createdShop.documentId, {
        name: 'Cazotte Shop 2',
        products_oo: { disconnect: [docid1] },
        products_om: { disconnect: [docid1] },
      });

      const populatedCreatedShop = await strapi.db
        .query('api::shop.shop')
        .findOne({ where: { documentId: createdShop.data.documentId }, populate: populateShop });

      expect(populatedCreatedShop.products_om).toMatchObject([{ documentId: docid1 }]);
      expect(populatedCreatedShop.products_oo).toMatchObject({ documentId: docid1 });
    });

    test('Clone entity with relations and set data should not steal relations', async () => {
      const createdShop = await createEntry(
        'shop',
        {
          name: 'Cazotte Shop',
          products_ow: { connect: [docid1] },
          products_oo: { connect: [docid1] },
          products_mo: { connect: [docid1] },
          products_om: { connect: [docid1, docid2] },
          products_mm: { connect: [docid1, docid2] },
          products_mw: { connect: [docid1, docid2] },
          myCompo: {
            compo_products_ow: { connect: [docid1] },
            compo_products_mw: { connect: [docid1, docid2] },
          },
        },
        ['myCompo']
      );

      const cloned = await cloneEntry('shop', createdShop.data.documentId, {
        name: 'Cazotte Shop 2',
        products_ow: { set: [docid2] }, // id 1 should not be stolen from createdShop products_ow
        products_oo: { set: [docid2] }, // id 1 should not be stolen from createdShop products_oo
        products_mo: { set: [docid2] }, // id 1 should not be stolen from createdShop products_om
      });

      expect(cloned.data.documentId).toBeDefined();
      expect(cloned.data.products_ow.count).toBe(1);
      expect(cloned.data.products_oo.count).toBe(1);
      expect(cloned.data.products_mo.count).toBe(1);
      expect(cloned.data.products_om.count).toBe(2);
      expect(cloned.data.products_mm.count).toBe(2);
      expect(cloned.data.products_mw.count).toBe(2);

      const populatedCreatedShop = await strapi.db
        .query('api::shop.shop')
        .findOne({ where: { id: createdShop.data.id }, populate: populateShop });

      expect(populatedCreatedShop.products_om).toMatchObject([{ documentId: docid1 }]);
      expect(populatedCreatedShop.products_oo).toMatchObject({ documentId: docid1 });
      expect(populatedCreatedShop.products_ow).toMatchObject({ documentId: docid1 });
    });
  });
});
