import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createContentAPIRequest } from 'api-tests/request';
import * as modelsUtils from 'api-tests/models';

let strapi;
let rq;
const data = {
  products: [],
  shops: [],
};
let documentId1, documentId2, documentId3;

const populateShop = '*';
// TODO: why does this format not work?
// {
//   products_ow: true,
//   products_oo: true,
//   products_mo: true,
//   products_om: true,
//   products_mm: true,
//   products_mw: true,
//   myCompo: {
//     populate: ['compo_products_ow', 'compo_products_mw'],
//   },
// };

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
    url: `/${singularName}`,
    body: { data },
    qs: { populate },
  });
  return body;
};

// Add updateEntry similar to createEntry
const updateEntry = async (singularName, documentId, data, populate) => {
  const { body } = await rq({
    method: 'PUT',
    url: `/${singularName}/${documentId}`,
    body: { data },
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
    rq = await createContentAPIRequest({ strapi });

    const createdProduct1 = await createEntry('products', { name: 'Skate' }, populateShop);
    const createdProduct2 = await createEntry('products', { name: 'Candle' }, populateShop);
    const createdProduct3 = await createEntry('products', { name: 'Mug' }, populateShop);

    data.products.push(createdProduct1.data);
    data.products.push(createdProduct2.data);
    data.products.push(createdProduct3.data);

    documentId1 = data.products[0].documentId;
    documentId2 = data.products[1].documentId;
    documentId3 = data.products[2].documentId;
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
        ['an object in the array ([{ documentId: 1 }, { documentId: 2 }])', 'array'],
      ])('documentIds being %s', (name, mode) => {
        test('In one order', async () => {
          const oneRelation = mode === 'object' ? [{ documentId: documentId1 }] : [documentId1];
          const manyRelations =
            mode === 'object'
              ? [{ documentId: documentId1 }, { documentId: documentId2 }]
              : [documentId1, documentId2];

          const shop = await createEntry(
            'shops',
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

          expect(shop.data.products_ow).toMatchObject({ documentId: documentId1 });
          expect(shop.data.products_oo).toMatchObject({ documentId: documentId1 });
          expect(shop.data.products_mm).toMatchObject([
            { documentId: documentId1 },
            { documentId: documentId2 },
          ]);
        });

        test('In reversed order', async () => {
          const oneRelation = mode === 'object' ? [{ documentId: documentId1 }] : [documentId1];
          const manyRelations =
            mode === 'object'
              ? [{ documentId: documentId1 }, { documentId: documentId2 }]
              : [documentId1, documentId2];
          manyRelations.reverse();

          const shop = await createEntry(
            'shops',
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

          expect(shop.data.products_mm).toMatchObject([
            { documentId: documentId2 },
            { documentId: documentId1 },
          ]);
        });
      });
    }
  );

  describe('Update an entity relations', () => {
    describe.each([
      ['directly in the array ([3])', 'object'],
      ['an object in the array ([{ documentId: 3 }])', 'array'],
    ])('documentIds being %s', (name, mode) => {
      test('Adding documentId3', async () => {
        const createdShop = await createEntry(
          'shops',
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
          populateShop
        );

        const relationToAdd = mode === 'object' ? [{ documentId: documentId3 }] : [documentId3];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.documentId,
          {
            products_ow: { connect: relationToAdd },
            products_oo: { connect: relationToAdd },
            products_mo: { connect: relationToAdd },
            products_om: { connect: relationToAdd },
            products_mm: { connect: relationToAdd },
            products_mw: { connect: relationToAdd },
            myCompo: {
              compo_products_ow: { connect: relationToAdd },
              compo_products_mw: { connect: relationToAdd },
            },
          },
          populateShop
        );

        expect(updatedShop.data.products_ow).toMatchObject({ documentId: documentId3 });
        expect(updatedShop.data.products_mm).toMatchObject([
          { documentId: documentId1 },
          { documentId: documentId2 },
          { documentId: documentId3 },
        ]);
      });

      test('Adding documentId3 & removing documentId1', async () => {
        const createdShop = await createEntry(
          'shops',
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
          populateShop
        );

        const relationToAdd = mode === 'object' ? [{ documentId: documentId3 }] : [documentId3];
        const relationToRemove = mode === 'object' ? [{ documentId: documentId1 }] : [documentId1];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.documentId,
          {
            products_ow: { connect: relationToAdd, disconnect: relationToRemove },
            products_oo: { connect: relationToAdd, disconnect: relationToRemove },
            products_mo: { connect: relationToAdd, disconnect: relationToRemove },
            products_om: { connect: relationToAdd, disconnect: relationToRemove },
            products_mm: { connect: relationToAdd, disconnect: relationToRemove },
            products_mw: { connect: relationToAdd, disconnect: relationToRemove },
            myCompo: {
              compo_products_ow: { connect: relationToAdd, disconnect: relationToRemove },
              compo_products_mw: { connect: relationToAdd, disconnect: relationToRemove },
            },
          },
          populateShop
        );

        expect(updatedShop.data.products_ow).toMatchObject({ documentId: documentId3 });
        expect(updatedShop.data.products_mm).toMatchObject([
          { documentId: documentId2 },
          { documentId: documentId3 },
        ]);
      });

      test('Adding documentId3 & removing documentId1, documentId3 (should still add documentId3)', async () => {
        const createdShop = await createEntry(
          'shops',
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
          populateShop
        );

        const relationToAdd = mode === 'object' ? [{ documentId: documentId3 }] : [documentId3];
        const relationToRemove =
          mode === 'object'
            ? [{ documentId: documentId1 }, { documentId: documentId3 }]
            : [documentId1, documentId3];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.documentId,
          {
            products_ow: { connect: relationToAdd, disconnect: relationToRemove },
            products_oo: { connect: relationToAdd, disconnect: relationToRemove },
            products_mo: { connect: relationToAdd, disconnect: relationToRemove },
            products_om: { connect: relationToAdd, disconnect: relationToRemove },
            products_mm: { connect: relationToAdd, disconnect: relationToRemove },
            products_mw: { connect: relationToAdd, disconnect: relationToRemove },
            myCompo: {
              compo_products_ow: { connect: relationToAdd, disconnect: relationToRemove },
              compo_products_mw: { connect: relationToAdd, disconnect: relationToRemove },
            },
          },
          populateShop
        );

        expect(updatedShop.data.products_ow).toMatchObject({ documentId: documentId3 });
        expect(updatedShop.data.products_mm).toMatchObject([
          { documentId: documentId2 },
          { documentId: documentId3 },
        ]);
      });

      test('Change relation order from documentId1, documentId2, documentId3 to documentId3, documentId2, documentId1', async () => {
        const createdShop = await createEntry(
          'shops',
          {
            name: 'Cazotte Shop',
            products_om: { connect: [documentId1, documentId2, documentId3] },
            products_mm: { connect: [documentId1, documentId2, documentId3] },
            products_mw: { connect: [documentId1, documentId2, documentId3] },
            myCompo: {
              compo_products_mw: { connect: [documentId1, documentId2, documentId3] },
            },
          },
          populateShop
        );

        const relationToChange =
          mode === 'object'
            ? [
                { documentId: documentId3 },
                { documentId: documentId2 },
                { documentId: documentId1 },
              ]
            : [documentId3, documentId2, documentId1];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.documentId,
          {
            products_om: { connect: relationToChange },
            products_mm: { connect: relationToChange },
            products_mw: { connect: relationToChange },
            myCompo: {
              compo_products_mw: { connect: relationToChange },
            },
          },
          populateShop
        );

        expect(updatedShop.data.products_mm).toMatchObject([
          { documentId: documentId3 },
          { documentId: documentId2 },
          { documentId: documentId1 },
        ]);
      });

      test('Change relation order by putting documentId2 at the end', async () => {
        const createdShop = await createEntry(
          'shops',
          {
            name: 'Cazotte Shop',
            products_om: { connect: [documentId1, documentId2, documentId3] },
            products_mm: { connect: [documentId1, documentId2, documentId3] },
            products_mw: { connect: [documentId1, documentId2, documentId3] },
            myCompo: {
              compo_products_mw: { connect: [documentId1, documentId2, documentId3] },
            },
          },
          populateShop
        );

        const relationToChange = mode === 'object' ? [{ documentId: documentId2 }] : [documentId2];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.documentId,
          {
            products_om: { connect: relationToChange },
            products_mm: { connect: relationToChange },
            products_mw: { connect: relationToChange },
            myCompo: {
              compo_products_mw: { connect: relationToChange },
            },
          },
          populateShop
        );

        expect(updatedShop.data.products_mm).toMatchObject([
          { documentId: documentId1 },
          { documentId: documentId3 },
          { documentId: documentId2 },
        ]);
      });

      test('Change relation order by putting documentId2, documentId1 at the end', async () => {
        const createdShop = await createEntry(
          'shops',
          {
            name: 'Cazotte Shop',
            products_om: { connect: [documentId1, documentId2, documentId3] },
            products_mm: { connect: [documentId1, documentId2, documentId3] },
            products_mw: { connect: [documentId1, documentId2, documentId3] },
            myCompo: {
              compo_products_mw: { connect: [documentId1, documentId2, documentId3] },
            },
          },
          populateShop
        );

        const relationToChange =
          mode === 'object'
            ? [{ documentId: documentId2 }, { documentId: documentId1 }]
            : [documentId2, documentId1];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.documentId,
          {
            products_om: { connect: relationToChange },
            products_mm: { connect: relationToChange },
            products_mw: { connect: relationToChange },
            myCompo: {
              compo_products_mw: { connect: relationToChange },
            },
          },
          populateShop
        );

        expect(updatedShop.data.products_mm).toMatchObject([
          { documentId: documentId3 },
          { documentId: documentId2 },
          { documentId: documentId1 },
        ]);
      });
    });
  });

  describe('Reorder entity relations', () => {
    // TODO: this seems to be an actual bug; the error is that it cannot position before documentId3 because it says it is not connected
    test.skip('Reorder single relation', async () => {
      const createdShop = await createEntry(
        'shops',
        {
          name: 'Cazotte Shop',
          products_om: { connect: [documentId1, documentId2, documentId3] },
          products_mm: { connect: [documentId1, documentId2, documentId3] },
          products_mw: { connect: [documentId1, documentId2, documentId3] },
          myCompo: {
            compo_products_mw: { connect: [documentId1, documentId2, documentId3] },
          },
        },
        populateShop
      );

      const relationToChange = [{ documentId: documentId1, position: { before: documentId3 } }];
      const updatedShop = await updateEntry(
        'shops',
        createdShop.data.documentId,
        {
          products_om: { connect: relationToChange },
          products_mm: { connect: relationToChange },
          products_mw: { connect: relationToChange },
          myCompo: {
            compo_products_mw: { connect: relationToChange },
          },
        },
        populateShop
      );

      const expectedRelations = [
        { documentId: documentId2 },
        { documentId: documentId1 },
        { documentId: documentId3 },
      ];

      expect(updatedShop.products_mm).toMatchObject(expectedRelations);
    });

    test('Reorder multiple relations', async () => {
      const createdShop = await createEntry(
        'shops',
        {
          name: 'Cazotte Shop',
          products_om: { connect: [documentId1, documentId2, documentId3] },
          products_mm: { connect: [documentId1, documentId2, documentId3] },
          products_mw: { connect: [documentId1, documentId2, documentId3] },
          myCompo: {
            compo_products_mw: { connect: [documentId1, documentId2, documentId3] },
          },
        },
        populateShop
      );

      const relationToChange = [
        { documentId: documentId1, position: { end: true } },
        { documentId: documentId3, position: { start: true } },
        { documentId: documentId2, position: { after: documentId1 } },
      ];
      const updatedShop = await updateEntry(
        'shops',
        createdShop.data.documentId,
        {
          products_om: { connect: relationToChange },
          products_mm: { connect: relationToChange },
          products_mw: { connect: relationToChange },
          myCompo: {
            compo_products_mw: { connect: relationToChange },
          },
        },
        populateShop
      );

      const expectedRelations = [
        { documentId: documentId3 },
        { documentId: documentId1 },
        { documentId: documentId2 },
      ];

      expect(updatedShop.data.products_mm).toMatchObject(expectedRelations);
    });
  });
});
