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
  const res = await rq({
    method: 'POST',
    url: `/${pluralName}`,
    body: { data },
    qs: { populate },
  });

  return res.body;
};

const updateEntry = async (pluralName, id, data, populate) => {
  const res = await rq({
    method: 'PUT',
    url: `/${pluralName}/${id}`,
    body: { data },
    qs: { populate },
  });

  return res.body;
};

const createShop = async ({
  anyToOneRel = [{ id: id1 }],
  anyToManyRel = [{ id: id1 }, { id: id2 }, { id: id3 }],
  data = {},
  populate,
  strict,
}) => {
  const options = strict ? { strict } : {};

  return createEntry(
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
            id: rel.id ? rel.id : rel,
            __type: 'api::product.product',
            position: rel?.position || undefined,
          };
        }),
      },
      // do not set morphtomany by default, it complicates the tests unneccessarily
      myCompo: {
        compo_products_ow: { connect: anyToOneRel },
        compo_products_mw: { options, connect: anyToManyRel },
      },
      ...data,
    },
    populate || populateShop
  );
};

const updateShop = async (
  shop,
  {
    anyToOneRel = [{ id: id1 }],
    anyToManyRel = [{ id: id1 }, { id: id2 }, { id: id3 }],
    relAction = 'connect',
    data = {},
    populate,
    strict = true,
  }
) => {
  return updateEntry(
    'shops',
    shop.id,
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
            id: rel.id ? rel.id : rel,
            __type: 'api::product.product',
            position: rel?.position || undefined,
          };
        }),
      },
      myCompo: {
        id: shop.attributes?.myCompo?.id,
        compo_products_ow: { [relAction]: anyToOneRel },
        compo_products_mw: { options: { strict }, [relAction]: anyToManyRel },
      },
      ...data,
    },
    populate || populateShop
  );
};

const shopFactory = ({
  anyToOneRel = { id: id1 },
  anyToManyRel = [{ id: id1 }, { id: id2 }, { id: id3 }],
  data = {},
}) => {
  return {
    attributes: {
      myCompo: {
        compo_products_mw: { data: anyToManyRel },
        compo_products_ow: { data: anyToOneRel },
      },
      products_mm: { data: anyToManyRel },
      products_mo: { data: anyToOneRel },
      products_mw: { data: anyToManyRel },
      products_morphtomany: anyToManyRel,
      products_om: { data: anyToManyRel },
      products_oo: { data: anyToOneRel },
      products_ow: { data: anyToOneRel },
      ...data,
    },
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

    id1 = data.products[0].id;
    id2 = data.products[1].id;
    id3 = data.products[2].id;
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe.each([['set', 'connect']])(
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
            'shops',
            {
              name: 'Cazotte Shop',
              products_ow: { [connectOrSet]: oneRelation },
              products_oo: { [connectOrSet]: oneRelation },
              products_mo: { [connectOrSet]: oneRelation },
              products_om: { [connectOrSet]: manyRelations },
              products_mm: { [connectOrSet]: manyRelations },
              products_mw: { [connectOrSet]: manyRelations },
              products_morphtomany: {
                [connectOrSet]: manyRelations.map((rel) => {
                  return { id: mode === 'object' ? rel.id : rel, __type: 'api::product.product' };
                }),
              },
              myCompo: {
                compo_products_ow: { [connectOrSet]: oneRelation },
                compo_products_mw: { [connectOrSet]: manyRelations },
              },
            },
            populateShop
          );

          expect(shop.data).toMatchObject({
            attributes: {
              myCompo: {
                compo_products_mw: { data: [{ id: id1 }, { id: id2 }] },
                compo_products_ow: { data: { id: id1 } },
              },
              products_mm: { data: [{ id: id1 }, { id: id2 }] },
              products_mo: { data: { id: id1 } },
              products_mw: { data: [{ id: id1 }, { id: id2 }] },
              products_morphtomany: [{ id: id1 }, { id: id2 }],
              products_om: { data: [{ id: id1 }, { id: id2 }] },
              products_oo: { data: { id: id1 } },
              products_ow: { data: { id: id1 } },
            },
          });
        });

        test('In reversed order', async () => {
          const oneRelation = mode === 'object' ? [{ id: id1 }] : [id1];
          const manyRelations = mode === 'object' ? [{ id: id1 }, { id: id2 }] : [id1, id2];
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
              products_morphtomany: {
                [connectOrSet]: manyRelations.map((rel) => {
                  return { id: mode === 'object' ? rel.id : rel, __type: 'api::product.product' };
                }),
              },
              myCompo: {
                compo_products_ow: { [connectOrSet]: oneRelation },
                compo_products_mw: { [connectOrSet]: manyRelations },
              },
            },
            populateShop
          );

          expect(shop.data).toMatchObject({
            attributes: {
              myCompo: {
                compo_products_mw: { data: [{ id: id2 }, { id: id1 }] },
                compo_products_ow: { data: { id: id1 } },
              },
              products_mm: { data: [{ id: id2 }, { id: id1 }] },
              products_mo: { data: { id: id1 } },
              products_mw: { data: [{ id: id2 }, { id: id1 }] },
              products_morphtomany: [{ id: id2 }, { id: id1 }],
              products_om: { data: [{ id: id2 }, { id: id1 }] },
              products_oo: { data: { id: id1 } },
              products_ow: { data: { id: id1 } },
            },
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
        const oneRelation = [id1];
        const manyRelations = [id1, id2];

        const createdShop = await createEntry(
          'shops',
          {
            name: 'Cazotte Shop',
            products_ow: { connect: oneRelation },
            products_oo: { connect: oneRelation },
            products_mo: { connect: oneRelation },
            products_om: { connect: manyRelations },
            products_mm: { connect: manyRelations },
            products_mw: { connect: manyRelations },
            products_morphtomany: {
              connect: manyRelations.map((rel) => {
                return { id: rel, __type: 'api::product.product' };
              }),
            },
            myCompo: {
              compo_products_ow: { connect: oneRelation },
              compo_products_mw: { connect: manyRelations },
            },
          },
          populateShop
        );

        expect(createdShop.data).toMatchObject({
          attributes: {
            myCompo: {
              compo_products_mw: { data: [{ id: id1 }, { id: id2 }] },
              compo_products_ow: { data: { id: id1 } },
            },
            products_mm: { data: [{ id: id1 }, { id: id2 }] },
            products_mo: { data: { id: id1 } },
            products_mw: { data: [{ id: id1 }, { id: id2 }] },
            products_morphtomany: [{ id: id1 }, { id: id2 }],
            products_om: { data: [{ id: id1 }, { id: id2 }] },
            products_oo: { data: { id: id1 } },
            products_ow: { data: { id: id1 } },
          },
        });

        const relationsToAdd = mode === 'object' ? [{ id: id3 }] : [id3];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.id,
          {
            name: 'Cazotte Shop',
            products_ow: { connect: relationsToAdd },
            products_oo: { connect: relationsToAdd },
            products_mo: { connect: relationsToAdd },
            products_om: { connect: relationsToAdd },
            products_mm: { connect: relationsToAdd },
            products_mw: { connect: relationsToAdd },
            products_morphtomany: {
              connect: relationsToAdd.map((rel) => {
                return { id: mode === 'object' ? rel.id : rel, __type: 'api::product.product' };
              }),
            },
            myCompo: {
              id: createdShop.data.attributes.myCompo.id,
              compo_products_ow: { connect: relationsToAdd },
              compo_products_mw: { connect: relationsToAdd },
            },
          },
          populateShop
        );

        expect(updatedShop.data).toMatchObject({
          attributes: {
            myCompo: {
              compo_products_mw: { data: [{ id: id1 }, { id: id2 }, { id: id3 }] },
              compo_products_ow: { data: { id: id3 } },
            },
            products_mm: { data: [{ id: id1 }, { id: id2 }, { id: id3 }] },
            products_mo: { data: { id: id3 } },
            products_mw: { data: [{ id: id1 }, { id: id2 }, { id: id3 }] },
            products_morphtomany: [{ id: id1 }, { id: id2 }, { id: id3 }],
            products_om: { data: [{ id: id1 }, { id: id2 }, { id: id3 }] },
            products_oo: { data: { id: id3 } },
            products_ow: { data: { id: id3 } },
          },
        });
      });

      test('Adding id3 & removing id1', async () => {
        const manyRelations = [id1, id2];
        const oneRelation = [id1];

        const createdShop = await createEntry(
          'shops',
          {
            name: 'Cazotte Shop',
            products_ow: { connect: oneRelation },
            products_oo: { connect: oneRelation },
            products_mo: { connect: oneRelation },
            products_om: { connect: manyRelations },
            products_mm: { connect: manyRelations },
            products_mw: { connect: manyRelations },
            products_morphtomany: {
              connect: manyRelations.map((rel) => {
                return { id: rel, __type: 'api::product.product' };
              }),
            },
            myCompo: {
              compo_products_ow: { connect: oneRelation },
              compo_products_mw: { connect: manyRelations },
            },
          },
          ['myCompo']
        );

        const relationsToAdd = mode === 'object' ? [{ id: id3 }] : [id3];
        const relationsToRemove = mode === 'object' ? [{ id: id1 }] : [id1];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.id,
          {
            name: 'Cazotte Shop',
            products_ow: { connect: relationsToAdd, disconnect: relationsToRemove },
            products_oo: { connect: relationsToAdd, disconnect: relationsToRemove },
            products_mo: { connect: relationsToAdd, disconnect: relationsToRemove },
            products_om: { connect: relationsToAdd, disconnect: relationsToRemove },
            products_mm: { connect: relationsToAdd, disconnect: relationsToRemove },
            products_mw: { connect: relationsToAdd, disconnect: relationsToRemove },
            products_morphtomany: {
              connect: relationsToAdd.map((rel) => {
                return { id: mode === 'object' ? rel.id : rel, __type: 'api::product.product' };
              }),
              disconnect: relationsToRemove.map((rel) => {
                return { id: mode === 'object' ? rel.id : rel, __type: 'api::product.product' };
              }),
            },
            myCompo: {
              id: createdShop.data.attributes.myCompo.id,
              compo_products_ow: { connect: relationsToAdd, disconnect: relationsToRemove },
              compo_products_mw: { connect: relationsToAdd, disconnect: relationsToRemove },
            },
          },
          populateShop
        );

        expect(updatedShop.data).toMatchObject({
          attributes: {
            myCompo: {
              compo_products_mw: { data: [{ id: id2 }, { id: id3 }] },
              compo_products_ow: { data: { id: id3 } },
            },
            products_mm: { data: [{ id: id2 }, { id: id3 }] },
            products_mo: { data: { id: id3 } },
            products_mw: { data: [{ id: id2 }, { id: id3 }] },
            products_morphtomany: [{ id: id2 }, { id: id3 }],
            products_om: { data: [{ id: id2 }, { id: id3 }] },
            products_oo: { data: { id: id3 } },
            products_ow: { data: { id: id3 } },
          },
        });
      });

      test('Adding id3 & removing id1, id3 (should still add id3)', async () => {
        const manyRelations = [id1, id2];
        const oneRelation = [id1];

        const createdShop = await createEntry(
          'shops',
          {
            name: 'Cazotte Shop',
            products_ow: { connect: oneRelation },
            products_oo: { connect: oneRelation },
            products_mo: { connect: oneRelation },
            products_om: { connect: manyRelations },
            products_mm: { connect: manyRelations },
            products_mw: { connect: manyRelations },
            products_morphtomany: {
              connect: manyRelations.map((rel) => {
                return { id: rel, __type: 'api::product.product' };
              }),
            },
            myCompo: {
              compo_products_ow: { connect: oneRelation },
              compo_products_mw: { connect: manyRelations },
            },
          },
          ['myCompo']
        );

        const relationsToAdd = mode === 'object' ? [{ id: id3 }] : [id3];
        const relationsToRemove = mode === 'object' ? [{ id: id1 }, { id: id3 }] : [id1, id3];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.id,
          {
            name: 'Cazotte Shop',
            products_ow: { connect: relationsToAdd, disconnect: relationsToRemove },
            products_oo: { connect: relationsToAdd, disconnect: relationsToRemove },
            products_mo: { connect: relationsToAdd, disconnect: relationsToRemove },
            products_om: { connect: relationsToAdd, disconnect: relationsToRemove },
            products_mm: { connect: relationsToAdd, disconnect: relationsToRemove },
            products_mw: { connect: relationsToAdd, disconnect: relationsToRemove },
            products_morphtomany: {
              connect: relationsToAdd.map((rel) => {
                return { id: mode === 'object' ? rel.id : rel, __type: 'api::product.product' };
              }),
              disconnect: relationsToRemove.map((rel) => {
                return { id: mode === 'object' ? rel.id : rel, __type: 'api::product.product' };
              }),
            },
            myCompo: {
              id: createdShop.data.attributes.myCompo.id,
              compo_products_ow: { connect: relationsToAdd, disconnect: relationsToRemove },
              compo_products_mw: { connect: relationsToAdd, disconnect: relationsToRemove },
            },
          },
          populateShop
        );

        expect(updatedShop.data).toMatchObject({
          attributes: {
            myCompo: {
              compo_products_mw: { data: [{ id: id2 }, { id: id3 }] },
              compo_products_ow: { data: { id: id3 } },
            },
            products_mm: { data: [{ id: id2 }, { id: id3 }] },
            products_mo: { data: { id: id3 } },
            products_mw: { data: [{ id: id2 }, { id: id3 }] },
            products_morphtomany: [{ id: id2 }, { id: id3 }],
            products_om: { data: [{ id: id2 }, { id: id3 }] },
            products_oo: { data: { id: id3 } },
            products_ow: { data: { id: id3 } },
          },
        });
      });

      test('Change relation order from id1, id2, id3 to id3, id2, id1', async () => {
        const manyRelations = [id1, id2, id3];
        const createdShop = await createEntry(
          'shops',
          {
            name: 'Cazotte Shop',
            products_om: { connect: manyRelations },
            products_mm: { connect: manyRelations },
            products_mw: { connect: manyRelations },
            products_morphtomany: {
              connect: manyRelations.map((rel) => {
                return { id: rel, __type: 'api::product.product' };
              }),
            },
            myCompo: {
              compo_products_mw: { connect: manyRelations },
            },
          },
          ['myCompo']
        );

        const relationsToChange =
          mode === 'object' ? [{ id: id3 }, { id: id2 }, { id: id1 }] : [id3, id2, id1];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.id,
          {
            name: 'Cazotte Shop',
            products_om: { connect: relationsToChange },
            products_mm: { connect: relationsToChange },
            products_mw: { connect: relationsToChange },
            products_morphtomany: {
              connect: relationsToChange.map((rel) => {
                return { id: mode === 'object' ? rel.id : rel, __type: 'api::product.product' };
              }),
            },
            myCompo: {
              id: createdShop.data.attributes.myCompo.id,
              compo_products_mw: { connect: relationsToChange },
            },
          },
          populateShop
        );

        expect(updatedShop.data).toMatchObject({
          attributes: {
            myCompo: {
              compo_products_mw: { data: [{ id: id3 }, { id: id2 }, { id: id1 }] },
            },
            products_mm: { data: [{ id: id3 }, { id: id2 }, { id: id1 }] },
            products_mw: { data: [{ id: id3 }, { id: id2 }, { id: id1 }] },
            products_morphtomany: [{ id: id3 }, { id: id2 }, { id: id1 }],
            products_om: { data: [{ id: id3 }, { id: id2 }, { id: id1 }] },
          },
        });
      });

      test('Change relation order by putting id2 at the end', async () => {
        const manyRelations = [id1, id2, id3];

        const createdShop = await createEntry(
          'shops',
          {
            name: 'Cazotte Shop',
            products_om: { connect: manyRelations },
            products_mm: { connect: manyRelations },
            products_mw: { connect: manyRelations },
            products_morphtomany: {
              connect: manyRelations.map((rel) => {
                return { id: rel, __type: 'api::product.product' };
              }),
            },
            myCompo: {
              compo_products_mw: { connect: manyRelations },
            },
          },
          ['myCompo']
        );

        const relationsToChange = mode === 'object' ? [{ id: id2 }] : [id2];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.id,
          {
            name: 'Cazotte Shop',
            products_om: { connect: relationsToChange },
            products_mm: { connect: relationsToChange },
            products_mw: { connect: relationsToChange },
            products_morphtomany: {
              connect: relationsToChange.map((rel) => {
                return { id: mode === 'object' ? rel.id : rel, __type: 'api::product.product' };
              }),
            },
            myCompo: {
              id: createdShop.data.attributes.myCompo.id,
              compo_products_mw: { connect: relationsToChange },
            },
          },
          populateShop
        );

        expect(updatedShop.data).toMatchObject({
          attributes: {
            myCompo: {
              compo_products_mw: { data: [{ id: id1 }, { id: id3 }, { id: id2 }] },
            },
            products_mm: { data: [{ id: id1 }, { id: id3 }, { id: id2 }] },
            products_mw: { data: [{ id: id1 }, { id: id3 }, { id: id2 }] },
            products_morphtomany: [{ id: id1 }, { id: id3 }, { id: id2 }],
            products_om: { data: [{ id: id1 }, { id: id3 }, { id: id2 }] },
          },
        });
      });

      test('Change relation order by putting id2, id1 at the end', async () => {
        const manyRelations = [id1, id2, id3];

        const createdShop = await createEntry(
          'shops',
          {
            name: 'Cazotte Shop',
            products_om: { connect: manyRelations },
            products_mm: { connect: manyRelations },
            products_mw: { connect: manyRelations },
            products_morphtomany: {
              connect: manyRelations.map((rel) => {
                return { id: rel, __type: 'api::product.product' };
              }),
            },
            myCompo: {
              compo_products_mw: { connect: manyRelations },
            },
          },
          ['myCompo']
        );

        const relationsToChange = mode === 'object' ? [{ id: id2 }, { id: id1 }] : [id2, id1];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.id,
          {
            name: 'Cazotte Shop',
            products_om: { connect: relationsToChange },
            products_mm: { connect: relationsToChange },
            products_mw: { connect: relationsToChange },
            products_morphtomany: {
              connect: relationsToChange.map((rel) => {
                return { id: mode === 'object' ? rel.id : rel, __type: 'api::product.product' };
              }),
            },
            myCompo: {
              id: createdShop.data.attributes.myCompo.id,
              compo_products_mw: { connect: relationsToChange },
            },
          },
          populateShop
        );

        expect(updatedShop.data).toMatchObject({
          attributes: {
            myCompo: {
              compo_products_mw: { data: [{ id: id3 }, { id: id2 }, { id: id1 }] },
            },
            products_mm: { data: [{ id: id3 }, { id: id2 }, { id: id1 }] },
            products_mw: { data: [{ id: id3 }, { id: id2 }, { id: id1 }] },
            products_morphtomany: [{ id: id3 }, { id: id2 }, { id: id1 }],
            products_om: { data: [{ id: id3 }, { id: id2 }, { id: id1 }] },
          },
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
        const manyRelations = [id1, id2, id3];
        const oneRelation = [id1];

        const createdShop = await createEntry(
          'shops',
          {
            name: 'Cazotte Shop',
            products_ow: { connect: oneRelation },
            products_oo: { connect: oneRelation },
            products_mo: { connect: oneRelation },
            products_om: { connect: manyRelations },
            products_mm: { connect: manyRelations },
            products_mw: { connect: manyRelations },
            products_morphtomany: {
              connect: manyRelations.map((rel) => {
                return { id: rel, __type: 'api::product.product' };
              }),
            },
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

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.id,
          {
            name: 'Cazotte Shop',
            products_ow: { disconnect: relationsToDisconnectOne },
            products_oo: { disconnect: relationsToDisconnectOne },
            products_mo: { disconnect: relationsToDisconnectOne },
            products_om: { disconnect: relationsToDisconnectMany },
            products_mm: { disconnect: relationsToDisconnectMany },
            products_mw: { disconnect: relationsToDisconnectMany },
            products_morphtomany: {
              disconnect: relationsToDisconnectMany.map((rel) => {
                return { id: mode === 'object' ? rel.id : rel, __type: 'api::product.product' };
              }),
            },
            myCompo: {
              id: createdShop.data.attributes.myCompo.id,
              compo_products_ow: { disconnect: relationsToDisconnectOne },
              compo_products_mw: { disconnect: relationsToDisconnectMany },
            },
          },
          populateShop
        );

        expect(updatedShop.data).toMatchObject({
          attributes: {
            myCompo: {
              compo_products_ow: { data: null },
              compo_products_mw: { data: [] },
            },
            products_ow: { data: null },
            products_oo: { data: null },
            products_mo: { data: null },
            products_mm: { data: [] },
            products_mw: { data: [] },
            // products_morphtomany: []],
            products_om: { data: [] },
          },
        });

        // TODO: This is a bug in how morphtomany returns an empty result; it should return an empty array
        expect(updatedShop.data.attributes.products_morphtomany).not.toBeDefined();
      });

      test("Remove relations that doesn't exist doesn't fail", async () => {
        const createRelation = [id1];
        const createdShop = await createEntry(
          'shops',
          {
            name: 'Cazotte Shop',
            products_ow: { connect: createRelation },
            products_oo: { connect: createRelation },
            products_mo: { connect: createRelation },
            products_om: { connect: createRelation },
            products_mm: { connect: createRelation },
            products_mw: { connect: createRelation },
            products_morphtomany: {
              connect: createRelation.map((rel) => {
                return { id: rel, __type: 'api::product.product' };
              }),
            },
            myCompo: {
              compo_products_ow: { connect: createRelation },
              compo_products_mw: { connect: createRelation },
            },
          },
          ['myCompo']
        );

        const relationsToDisconnectMany =
          mode === 'object' ? [{ id: id3 }, { id: id2 }, { id: 9999 }] : [id3, id2, 9999];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.id,
          {
            name: 'Cazotte Shop',
            products_ow: { disconnect: relationsToDisconnectMany },
            products_oo: { disconnect: relationsToDisconnectMany },
            products_mo: { disconnect: relationsToDisconnectMany },
            products_om: { disconnect: relationsToDisconnectMany },
            products_mm: { disconnect: relationsToDisconnectMany },
            products_mw: { disconnect: relationsToDisconnectMany },
            products_morphtomany: {
              disconnect: relationsToDisconnectMany.map((rel) => {
                return { id: mode === 'object' ? rel.id : rel, __type: 'api::product.product' };
              }),
            },
            myCompo: {
              id: createdShop.data.attributes.myCompo.id,
              compo_products_ow: { disconnect: relationsToDisconnectMany },
              compo_products_mw: { disconnect: relationsToDisconnectMany },
            },
          },
          populateShop
        );

        expect(updatedShop.data).toMatchObject({
          attributes: {
            myCompo: {
              compo_products_ow: { data: { id: id1 } },
              compo_products_mw: { data: [{ id: id1 }] },
            },
            products_ow: { data: { id: id1 } },
            products_oo: { data: { id: id1 } },
            products_mo: { data: { id: id1 } },
            products_mm: { data: [{ id: id1 }] },
            products_mw: { data: [{ id: id1 }] },
            products_morphtomany: [{ id: id1 }],
            products_om: { data: [{ id: id1 }] },
          },
        });
      });
    });
  });

  describe('Reorder entity relations', () => {
    test('Connect new relation at the start', async () => {
      const createdShop = await createShop({
        anyToManyRel: [
          { id: id1, position: { start: true } },
          { id: id2, position: { start: true } },
        ],
      });

      const expectedCreatedShop = shopFactory({ anyToManyRel: [{ id: id2 }, { id: id1 }] });

      expect(createdShop.data).toMatchObject(expectedCreatedShop);
    });

    test('Connect new relation at the end', async () => {
      const createdShop = await createShop({
        anyToManyRel: [
          { id: id1, position: { end: true } },
          { id: id2, position: { end: true } },
        ],
      });

      const expectedCreatedShop = shopFactory({ anyToManyRel: [{ id: id1 }, { id: id2 }] });
      expect(createdShop.data).toMatchObject(expectedCreatedShop);
    });

    test('Create relations using before and after', async () => {
      const createdShop = await createShop({
        anyToManyRel: [
          { id: id1, position: { start: true } },
          { id: id2, position: { start: true } },
          { id: id3, position: { after: id1 } },
        ],
      });

      const expectedShop = shopFactory({
        anyToManyRel: [{ id: id2 }, { id: id1 }, { id: id3 }],
      });
      expect(createdShop.data).toMatchObject(expectedShop);
    });

    test('Update relations using before and after', async () => {
      const shop = await createShop({
        anyToManyRel: [
          { id: id1, position: { end: true } },
          { id: id2, position: { end: true } },
        ],
      });

      const updatedShop = await updateShop(shop.data, {
        anyToManyRel: [
          { id: id1, position: { before: id2 } },
          { id: id2, position: { start: true } },
          { id: id3, position: { end: true } },
        ],
      });

      const expectedShop = shopFactory({
        anyToManyRel: [{ id: id2 }, { id: id1 }, { id: id3 }],
      });
      expect(updatedShop.data).toMatchObject(expectedShop);
    });

    test('Update relations using the same id multiple times', async () => {
      const shop = await createShop({
        anyToManyRel: [
          { id: id1, position: { end: true } },
          { id: id2, position: { end: true } },
        ],
      });

      const updatedShop = await updateShop(shop.data, {
        anyToManyRel: [
          { id: id1, position: { end: true } },
          { id: id1, position: { start: true } },
          { id: id1, position: { after: id2 } },
        ],
      });

      expect(updatedShop.error).toMatchObject({ status: 400, name: 'ValidationError' });
    });

    test('Update relations with invalid connect array in strict mode', async () => {
      const shop = await createShop({
        anyToManyRel: [],
      });

      // Connect before an id that does not exist.
      const updatedShop = await updateShop(shop.data, {
        anyToManyRel: [{ id: id1, position: { after: id2 } }],
      });

      expect(updatedShop.error).toMatchObject({ status: 400, name: 'ValidationError' });
    });

    test('Update relations with invalid connect array in non-strict mode', async () => {
      const shop = await createShop({
        anyToManyRel: [{ id: id1 }],
      });

      // Connect before an id that does not exist.
      const updatedShop = await updateShop(shop.data, {
        anyToManyRel: [{ id: id2, position: { after: id3 } }],
        strict: false,
      });

      const expectedShop = shopFactory({
        anyToManyRel: [{ id: id1 }, { id: id2 }],
      });

      expect(updatedShop.data).toMatchObject(expectedShop);
    });
  });
});
