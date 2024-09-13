'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest } = require('api-tests/request');
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

const populateShop = {
  products_ow: true,
  products_oo: true,
  products_mo: true,
  products_om: true,
  products_mm: true,
  products_mw: true,
  products_morphtomany: {
    on: {
      'api::product.product': true,
    },
  },
  myCompo: {
    populate: ['compo_products_ow', 'compo_products_mw'],
  },
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
    products_morphtomany: {
      type: 'relation',
      relation: 'morphToMany',
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

const createEntry = async (pluralName, data, populate) => {
  const { body } = await rq({
    method: 'POST',
    url: `/${pluralName}`,
    body: { data },
    qs: { populate },
  });
  return body;
};

const updateEntry = async (pluralName, id, data, populate) => {
  const { body } = await rq({
    method: 'PUT',
    url: `/${pluralName}/${id}`,
    body: { data },
    qs: { populate },
  });

  return body;
};

const createShop = async ({
  anyToOneRel = [{ documentId: id1 }],
  anyToManyRel = [{ documentId: id1 }, { documentId: id2 }, { documentId: id3 }],
  data = {},
  populate,
  strict,
}) => {
  const options = strict ? { strict } : {};

  const result = await createEntry(
    'shops',
    {
      name: 'Cazotte Shop',
      products_ow: { connect: anyToOneRel },
      products_oo: { connect: anyToOneRel },
      products_mo: { connect: anyToOneRel },
      products_om: { options, connect: anyToManyRel },
      products_mm: { options, connect: anyToManyRel },
      products_mw: { options, connect: anyToManyRel },
      products_morphtomany: {
        options,
        connect: anyToManyRel.map((rel) => {
          return {
            id: rel.documentId ? rel.documentId : rel,
            __type: 'api::product.product',
            position: rel?.position || undefined,
          };
        }),
      },
      myCompo: {
        compo_products_ow: { connect: anyToOneRel },
        compo_products_mw: { options, connect: anyToManyRel },
      },
      ...data,
    },
    populate || populateShop
  );

  return result;
};

const updateShop = async (
  shop,
  {
    anyToOneRel = [{ documentId: id1 }],
    anyToManyRel = [{ documentId: id1 }, { documentId: id2 }, { documentId: id3 }],
    relAction = 'connect',
    data = {},
    populate,
    strict = true,
  }
) => {
  const result = await updateEntry(
    'shops',
    shop.documentId,
    {
      name: 'Cazotte Shop',
      products_ow: { [relAction]: anyToOneRel },
      products_oo: { [relAction]: anyToOneRel },
      products_mo: { [relAction]: anyToOneRel },
      products_om: { options: { strict }, [relAction]: anyToManyRel },
      products_mm: { options: { strict }, [relAction]: anyToManyRel },
      products_mw: { options: { strict }, [relAction]: anyToManyRel },
      products_morphtomany: {
        options: { strict },
        [relAction]: anyToManyRel.map((rel) => {
          return {
            id: rel.documentId ? rel.documentId : rel,
            __type: 'api::product.product',
            position: rel?.position || undefined,
          };
        }),
      },
      // TODO V5: Discuss component id update, updating a draft component
      //          with a published component id will fail
      // myCompo: {
      //   id: shop?.myCompo?.id,
      //   compo_products_ow: { [relAction]: anyToOneRel },
      //   compo_products_mw: { options: { strict }, [relAction]: anyToManyRel },
      // },
      ...data,
    },
    populate || populateShop
  );

  return result;
};

const shopFactory = ({
  anyToOneRel = { documentId: id1 },
  anyToManyRel = [{ documentId: id1 }, { documentId: id2 }, { documentId: id3 }],
  data = {},
}) => {
  return {
    // TODO V5: Discuss component id update, updating a draft component
    //          with a published component id will fail
    // myCompo: {
    //   compo_products_mw: anyToManyRel,
    //   compo_products_ow: anyToOneRel,
    // },
    products_mm: anyToManyRel,
    products_mo: anyToOneRel,
    products_mw: anyToManyRel,
    products_om: anyToManyRel,
    products_oo: anyToOneRel,
    products_ow: anyToOneRel,
    ...data,
  };
};

describe('Relations', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder.addComponent(compo(false)).addContentTypes([productModel, shopModel]).build();

    await modelsUtils.modifyComponent(compo(true));

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });

    const createdProduct1 = await createEntry('products', { name: 'Skate' });
    const createdProduct2 = await createEntry('products', { name: 'Candle' });
    const createdProduct3 = await createEntry('products', { name: 'Mug' });

    data.products.push(createdProduct1.data);
    data.products.push(createdProduct2.data);
    data.products.push(createdProduct3.data);

    id1 = data.products[0].documentId;
    id2 = data.products[1].documentId;
    id3 = data.products[2].documentId;
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
          const oneRelation = mode === 'object' ? [{ documentId: id1 }] : [id1];
          const manyRelations =
            mode === 'object' ? [{ documentId: id1 }, { documentId: id2 }] : [id1, id2];

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

          expect(shop.data).toMatchObject({
            myCompo: {
              compo_products_mw: [{ documentId: id1 }, { documentId: id2 }],
              compo_products_ow: { documentId: id1 },
            },
            products_mm: [{ documentId: id1 }, { documentId: id2 }],
            products_mo: { documentId: id1 },
            products_mw: [{ documentId: id1 }, { documentId: id2 }],
            products_om: [{ documentId: id1 }, { documentId: id2 }],
            products_oo: { documentId: id1 },
            products_ow: { documentId: id1 },
          });
        });

        test('In reversed order', async () => {
          const oneRelation = mode === 'object' ? [{ documentId: id1 }] : [id1];
          const manyRelations =
            mode === 'object' ? [{ documentId: id1 }, { documentId: id2 }] : [id1, id2];
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

          expect(shop.data).toMatchObject({
            myCompo: {
              compo_products_mw: [{ documentId: id2 }, { documentId: id1 }],
              compo_products_ow: { documentId: id1 },
            },
            products_mm: [{ documentId: id2 }, { documentId: id1 }],
            products_mo: { documentId: id1 },
            products_mw: [{ documentId: id2 }, { documentId: id1 }],
            products_om: [{ documentId: id2 }, { documentId: id1 }],
            products_oo: { documentId: id1 },
            products_ow: { documentId: id1 },
          });
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
          'shops',
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

        const relationToAdd = mode === 'object' ? [{ documentId: id3 }] : [id3];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.documentId,
          {
            name: 'Cazotte Shop',
            products_ow: { connect: relationToAdd },
            products_oo: { connect: relationToAdd },
            products_mo: { connect: relationToAdd },
            products_om: { connect: relationToAdd },
            products_mm: { connect: relationToAdd },
            products_mw: { connect: relationToAdd },
            // TODO V5: Discuss component id update, updating a draft component
            //          with a published component id will fail
            // myCompo: {
            //   id: createdShop.data.myCompo.id,
            //   compo_products_ow: { connect: relationToAdd },
            //   compo_products_mw: { connect: relationToAdd },
            // },
          },
          populateShop
        );

        expect(updatedShop.data).toMatchObject({
          // myCompo: {
          //   compo_products_mw: [{ documentId: id1 }, { documentId: id2 }, { documentId: id3 }],
          //   compo_products_ow: { documentId: id3 },
          // },
          products_mm: [{ documentId: id1 }, { documentId: id2 }, { documentId: id3 }],
          products_mo: { documentId: id3 },
          products_mw: [{ documentId: id1 }, { documentId: id2 }, { documentId: id3 }],
          products_om: [{ documentId: id1 }, { documentId: id2 }, { documentId: id3 }],
          products_oo: { documentId: id3 },
          products_ow: { documentId: id3 },
        });
      });

      test('Adding id3 & removing id1', async () => {
        const createdShop = await createEntry(
          'shops',
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

        const relationToAdd = mode === 'object' ? [{ documentId: id3 }] : [id3];
        const relationToRemove = mode === 'object' ? [{ documentId: id1 }] : [id1];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.documentId,
          {
            name: 'Cazotte Shop',
            products_ow: { connect: relationToAdd, disconnect: relationToRemove },
            products_oo: { connect: relationToAdd, disconnect: relationToRemove },
            products_mo: { connect: relationToAdd, disconnect: relationToRemove },
            products_om: { connect: relationToAdd, disconnect: relationToRemove },
            products_mm: { connect: relationToAdd, disconnect: relationToRemove },
            products_mw: { connect: relationToAdd, disconnect: relationToRemove },
            // TODO V5: Discuss component id update, updating a draft component
            //          with a published component id will fail
            // myCompo: {
            //   id: createdShop.data.myCompo.id,
            //   compo_products_ow: { connect: relationToAdd, disconnect: relationToRemove },
            //   compo_products_mw: { connect: relationToAdd, disconnect: relationToRemove },
            // },
          },
          populateShop
        );

        expect(updatedShop.data).toMatchObject({
          // myCompo: {
          //   compo_products_mw: [{ documentId: id2 }, { documentId: id3 }],
          //   compo_products_ow: { documentId: id3 },
          // },
          products_mm: [{ documentId: id2 }, { documentId: id3 }],
          products_mo: { documentId: id3 },
          products_mw: [{ documentId: id2 }, { documentId: id3 }],
          products_om: [{ documentId: id2 }, { documentId: id3 }],
          products_oo: { documentId: id3 },
          products_ow: { documentId: id3 },
        });
      });

      test('Adding id3 & removing id1, id3 (should still add id3)', async () => {
        const createdShop = await createEntry(
          'shops',
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

        const relationToAdd = mode === 'object' ? [{ documentId: id3 }] : [id3];
        const relationToRemove =
          mode === 'object' ? [{ documentId: id1 }, { documentId: id3 }] : [id1, id3];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.documentId,
          {
            name: 'Cazotte Shop',
            products_ow: { connect: relationToAdd, disconnect: relationToRemove },
            products_oo: { connect: relationToAdd, disconnect: relationToRemove },
            products_mo: { connect: relationToAdd, disconnect: relationToRemove },
            products_om: { connect: relationToAdd, disconnect: relationToRemove },
            products_mm: { connect: relationToAdd, disconnect: relationToRemove },
            products_mw: { connect: relationToAdd, disconnect: relationToRemove },
            // TODO V5: Discuss component id update, updating a draft component
            //          with a published component id will fail
            // myCompo: {
            //   id: createdShop.data.myCompo.id,
            //   compo_products_ow: { connect: relationToAdd, disconnect: relationToRemove },
            //   compo_products_mw: { connect: relationToAdd, disconnect: relationToRemove },
            // },
          },
          populateShop
        );

        expect(updatedShop.data).toMatchObject({
          // myCompo: {
          //   compo_products_mw:  [{ documentId: id2 }, { documentId: id3 }] ,
          //   compo_products_ow:  { documentId: id3 } ,
          // },
          products_mm: [{ documentId: id2 }, { documentId: id3 }],
          products_mo: { documentId: id3 },
          products_mw: [{ documentId: id2 }, { documentId: id3 }],
          products_om: [{ documentId: id2 }, { documentId: id3 }],
          products_oo: { documentId: id3 },
          products_ow: { documentId: id3 },
        });
      });

      test('Change relation order from id1, id2, id3 to id3, id2, id1', async () => {
        const createdShop = await createEntry(
          'shops',
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
          mode === 'object'
            ? [{ documentId: id3 }, { documentId: id2 }, { documentId: id1 }]
            : [id3, id2, id1];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.documentId,
          {
            name: 'Cazotte Shop',
            products_om: { connect: relationToChange },
            products_mm: { connect: relationToChange },
            products_mw: { connect: relationToChange },
            // TODO V5: Discuss component id update, updating a draft component
            //          with a published component id will fail
            // myCompo: {
            //   id: createdShop.data.myCompo.id,
            //   compo_products_mw: { connect: relationToChange },
            // },
          },
          populateShop
        );

        expect(updatedShop.data).toMatchObject({
          // myCompo: {
          //   compo_products_mw: [{ documentId: id3 }, { documentId: id2 }, { documentId: id1 }],
          // },
          products_mm: [{ documentId: id3 }, { documentId: id2 }, { documentId: id1 }],
          products_mw: [{ documentId: id3 }, { documentId: id2 }, { documentId: id1 }],
          products_om: [{ documentId: id3 }, { documentId: id2 }, { documentId: id1 }],
        });
      });

      test('Change relation order by putting id2 at the end', async () => {
        const createdShop = await createEntry(
          'shops',
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

        const relationToChange = mode === 'object' ? [{ documentId: id2 }] : [id2];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.documentId,
          {
            name: 'Cazotte Shop',
            products_om: { connect: relationToChange },
            products_mm: { connect: relationToChange },
            products_mw: { connect: relationToChange },
            // TODO V5: Discuss component id update, updating a draft component
            //          with a published component id will fail
            // myCompo: {
            //   id: createdShop.data.myCompo.id,
            //   compo_products_mw: { connect: relationToChange },
            // },
          },
          populateShop
        );

        expect(updatedShop.data).toMatchObject({
          // myCompo: {
          //   compo_products_mw: [{ documentId: id1 }, { documentId: id3 }, { documentId: id2 }],
          // },
          products_mm: [{ documentId: id1 }, { documentId: id3 }, { documentId: id2 }],
          products_mw: [{ documentId: id1 }, { documentId: id3 }, { documentId: id2 }],
          products_om: [{ documentId: id1 }, { documentId: id3 }, { documentId: id2 }],
        });
      });

      test('Change relation order by putting id2, id1 at the end', async () => {
        const createdShop = await createEntry(
          'shops',
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
          mode === 'object' ? [{ documentId: id2 }, { documentId: id1 }] : [id2, id1];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.documentId,
          {
            name: 'Cazotte Shop',
            products_om: { connect: relationToChange },
            products_mm: { connect: relationToChange },
            products_mw: { connect: relationToChange },
            // TODO V5: Discuss component id update, updating a draft component
            //          with a published component id will fail
            // myCompo: {
            //   id: createdShop.data.myCompo.id,
            //   compo_products_mw: { connect: relationToChange },
            // },
          },
          populateShop
        );

        expect(updatedShop.data).toMatchObject({
          // myCompo: {
          //   compo_products_mw: [{ documentId: id3 }, { documentId: id2 }, { documentId: id1 }],
          // },
          products_mm: [{ documentId: id3 }, { documentId: id2 }, { documentId: id1 }],
          products_mw: [{ documentId: id3 }, { documentId: id2 }, { documentId: id1 }],
          products_om: [{ documentId: id3 }, { documentId: id2 }, { documentId: id1 }],
        });
      });
    });
  });

  describe('Disconnect entity relations', () => {
    describe.each([
      ['directly in the array ([1, 2, 3])', 'object'],
      ['an object in the array ([{ id: 1 }, { id: 2 }, { id: 3 }])', 'array'],
    ])('ids being %s', (name, mode) => {
      test('Remove all relations id1, id2, id3', async () => {
        const createdShop = await createEntry(
          'shops',
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

        const relationsToDisconnectOne = mode === 'object' ? [{ documentId: id1 }] : [id1];
        const relationsToDisconnectMany =
          mode === 'object'
            ? [{ documentId: id3 }, { documentId: id2 }, { documentId: id1 }]
            : [id3, id2, id1];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.documentId,
          {
            name: 'Cazotte Shop',
            products_ow: { disconnect: relationsToDisconnectOne },
            products_oo: { disconnect: relationsToDisconnectOne },
            products_mo: { disconnect: relationsToDisconnectOne },
            products_om: { disconnect: relationsToDisconnectMany },
            products_mm: { disconnect: relationsToDisconnectMany },
            products_mw: { disconnect: relationsToDisconnectMany },
            // TODO V5: Discuss component id update, updating a draft component
            //          with a published component id will fail
            // myCompo: {
            //   id: createdShop.data.myCompo.id,
            //   compo_products_ow: { disconnect: relationsToDisconnectOne },
            //   compo_products_mw: { disconnect: relationsToDisconnectMany },
            // },
          },
          populateShop
        );

        expect(updatedShop.data).toMatchObject({
          // myCompo: {
          //   compo_products_ow: null ,
          //   compo_products_mw:  [] ,
          // },
          products_ow: null,
          products_oo: null,
          products_mo: null,
          products_mm: [],
          products_mw: [],
          products_om: [],
        });
      });

      // TODO: V5 - relations should throw an error if they do not exist
      test.skip("Remove relations that doesn't exist doesn't fail", async () => {
        const createdShop = await createEntry(
          'shops',
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
          mode === 'object'
            ? [{ documentId: id3 }, { documentId: id2 }, { documentId: 9999 }]
            : [id3, id2, 9999];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.documentId,
          {
            name: 'Cazotte Shop',
            products_ow: { disconnect: relationsToDisconnectMany },
            products_oo: { disconnect: relationsToDisconnectMany },
            products_mo: { disconnect: relationsToDisconnectMany },
            products_om: { disconnect: relationsToDisconnectMany },
            products_mm: { disconnect: relationsToDisconnectMany },
            products_mw: { disconnect: relationsToDisconnectMany },
            // TODO V5: Discuss component id update, updating a draft component
            //          with a published component id will fail
            // myCompo: {
            //   id: createdShop.data.myCompo.id,
            //   compo_products_ow: { disconnect: relationsToDisconnectMany },
            //   compo_products_mw: { disconnect: relationsToDisconnectMany },
            // },
          },
          populateShop
        );

        expect(updatedShop.data).toMatchObject({
          // myCompo: {
          //   compo_products_ow: { documentId: id1 },
          //   compo_products_mw: [{ documentId: id1 }],
          // },
          products_ow: { documentId: id1 },
          products_oo: { documentId: id1 },
          products_mo: { documentId: id1 },
          products_mm: [{ documentId: id1 }],
          products_mw: [{ documentId: id1 }],
          products_om: [{ documentId: id1 }],
        });
      });
    });
  });

  describe('Reorder entity relations', () => {
    test('Connect new relation at the start', async () => {
      const createdShop = await createShop({
        anyToManyRel: [
          { documentId: id1, position: { start: true } },
          { documentId: id2, position: { start: true } },
        ],
      });

      const expectedCreatedShop = shopFactory({
        anyToManyRel: [{ documentId: id2 }, { documentId: id1 }],
      });
      expect(createdShop.data).toMatchObject(expectedCreatedShop);
    });

    test('Connect new relation at the end', async () => {
      const createdShop = await createShop({
        anyToManyRel: [
          { documentId: id1, position: { end: true } },
          { documentId: id2, position: { end: true } },
        ],
      });

      const expectedCreatedShop = shopFactory({
        anyToManyRel: [{ documentId: id1 }, { documentId: id2 }],
      });
      expect(createdShop.data).toMatchObject(expectedCreatedShop);
    });

    test('Create relations using before and after', async () => {
      const createdShop = await createShop({
        anyToManyRel: [
          { documentId: id1, position: { start: true } },
          { documentId: id2, position: { start: true } },
          { documentId: id3, position: { after: id1 } },
        ],
      });

      const expectedShop = shopFactory({
        anyToManyRel: [{ documentId: id2 }, { documentId: id1 }, { documentId: id3 }],
      });
      expect(createdShop.data).toMatchObject(expectedShop);
    });

    test('Update relations using before and after', async () => {
      const shop = await createShop({
        anyToManyRel: [
          { documentId: id1, position: { end: true } },
          { documentId: id2, position: { end: true } },
        ],
      });

      const updatedShop = await updateShop(shop.data, {
        anyToManyRel: [
          { documentId: id1, position: { before: id2 } },
          { documentId: id2, position: { start: true } },
          { documentId: id3, position: { end: true } },
        ],
      });

      const expectedShop = shopFactory({
        anyToManyRel: [{ documentId: id2 }, { documentId: id1 }, { documentId: id3 }],
      });
      expect(updatedShop.data).toMatchObject(expectedShop);
    });

    test('Update relations using the same id multiple times', async () => {
      const shop = await createShop({
        anyToManyRel: [
          { documentId: id1, position: { end: true } },
          { documentId: id2, position: { end: true } },
        ],
      });

      const updatedShop = await updateShop(shop.data, {
        anyToManyRel: [
          { documentId: id1, position: { end: true } },
          { documentId: id1, position: { start: true } },
          { documentId: id1, position: { after: id2 } },
        ],
      });

      expect(updatedShop.error).toMatchObject({ status: 400, name: 'ValidationError' });
    });

    test('Create relations using invalid key in morphToMany returns error', async () => {
      const result = await createEntry(
        'shops',
        {
          name: 'Cazotte Shop',
          products_morphtomany: {
            options: { strict: true, invalid: true },
            connect: [
              {
                id: id1,
                __type: 'api::product.product',
                position: 'end',
              },
            ],
            invalid: 'fake',
          },
        },
        populateShop
      );

      expect(result.error).toMatchObject({ status: 400, name: 'ValidationError' });
    });

    test('Create relations using invalid options for morphToMany returns error', async () => {
      const result = await createEntry(
        'shops',
        {
          name: 'Cazotte Shop',
          products_morphtomany: {
            options: { strict: true, invalid: true },
            connect: [
              {
                id: id1,
                __type: 'api::product.product',
                position: 'end',
              },
            ],
          },
        },
        populateShop
      );

      expect(result.error).toMatchObject({ status: 400, name: 'ValidationError' });
    });

    test('Create relations using invalid connect for morphToMany returns error', async () => {
      const result = await createEntry(
        'shops',
        {
          name: 'Cazotte Shop',
          products_morphtomany: {
            options: { strict: true },
            connect: [
              {
                id: id1,
                __type: 'api::product.product',
                position: 'end',
              },
              'invalid',
            ],
          },
        },
        populateShop
      );

      expect(result.error).toMatchObject({ status: 400, name: 'ValidationError' });
    });

    test('Create relations using invalid disconnect for morphToMany returns error', async () => {
      const result = await createEntry(
        'shops',
        {
          name: 'Cazotte Shop',
          products_morphtomany: {
            options: { strict: true, invalid: true },
            disconnect: [
              {
                id: id1,
                __type: 'api::product.product',
                position: 'end',
              },
              'invalid',
            ],
          },
        },
        populateShop
      );

      expect(result.error).toMatchObject({ status: 400, name: 'ValidationError' });
    });

    test('Create relations using invalid set for morphToMany returns error', async () => {
      const result = await createEntry(
        'shops',
        {
          name: 'Cazotte Shop',
          products_morphtomany: {
            options: { strict: true, invalid: true },
            set: [
              {
                id: id1,
                __type: 'api::product.product',
                position: 'end',
              },
              'invalid',
            ],
          },
        },
        populateShop
      );

      expect(result.error).toMatchObject({ status: 400, name: 'ValidationError' });
    });

    test('Update relations with invalid connect array in strict mode', async () => {
      const shop = await createShop({
        anyToManyRel: [],
      });

      // Connect before an id that does not exist.
      const updatedShop = await updateShop(shop.data, {
        anyToManyRel: [{ documentId: id1, position: { after: id2 } }],
      });

      expect(updatedShop.error).toMatchObject({ status: 400, name: 'ValidationError' });
    });

    // TODO: V5 - relations should throw an error if they do not exist. Remove strict mode of relations
    test.skip('Update relations with invalid connect array in non-strict mode', async () => {
      const shop = await createShop({
        anyToManyRel: [{ documentId: id1 }],
      });

      // Connect before an id that does not exist.
      const updatedShop = await updateShop(shop.data, {
        anyToManyRel: [{ documentId: id2, position: { after: id3 } }],
        strict: false,
      });

      const expectedShop = shopFactory({
        anyToManyRel: [{ documentId: id1 }, { documentId: id2 }],
      });

      expect(updatedShop.data).toMatchObject(expectedShop);
    });
  });
});
