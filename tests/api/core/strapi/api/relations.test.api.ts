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

// TODO: refactor these ids to be cleaner
let docid1;
let docid2;
let docid3;
let id1;
let id2;
let id3;
let shopid1;
let shopdocid1;

const populateShop = {
  products_ow: true,
  products_oo: true,
  products_mo: true,
  products_om: true,
  products_mm: true,
  products_mw: true,
  products_morphtomany: {
    on: {
      'api::shop.shop': true,
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

const createEntry = async (pluralName, data, populate?) => {
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

interface Relation {
  documentId: string;
  position?: object;
}

interface ShopOptions {
  anyToOneRel?: Relation[];
  anyToManyRel?: Relation[];
  relAction?: 'connect' | 'disconnect' | 'replace';
  data?: Record<string, any>;
  populate?: string[];
  strict?: boolean;
}

const createShop = async ({
  anyToOneRel = [{ documentId: docid1 }],
  anyToManyRel = [{ documentId: docid1 }, { documentId: docid2 }, { documentId: docid3 }],
  data = {},
  populate = populateShop,
  strict,
}: ShopOptions) => {
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
            documentId: rel.documentId ? rel.documentId : rel,
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
    populate
  );

  return result;
};

const updateShop = async (
  shop: any, // TODO: type
  {
    anyToOneRel = [{ documentId: docid1 }],
    anyToManyRel = [{ documentId: docid1 }, { documentId: docid2 }, { documentId: docid3 }],
    relAction = 'connect',
    data = {},
    populate = populateShop,
    strict = true,
  }: ShopOptions
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
            documentId: rel.documentId ? rel.documentId : rel,
            __type: 'api::product.product',
            position: rel?.position || undefined,
          };
        }),
      },
      ...data,
    },
    populate
  );

  return result;
};

const shopFactory = ({
  anyToOneRel = { documentId: docid1 },
  anyToManyRel = [{ documentId: docid1 }, { documentId: docid2 }, { documentId: docid3 }],
  data = {},
}) => {
  return {
    products_mm: anyToManyRel,
    products_mo: anyToOneRel,
    products_mw: anyToManyRel,
    products_morphtomany: anyToManyRel,
    products_om: anyToManyRel,
    products_oo: anyToOneRel,
    products_ow: anyToOneRel,
    ...data,
  };
};

const testCases = [
  ['direct documentId ([1, 2])', 'docId'],
  [
    'object with documentId ([{ documentId: "123asdf" }, { documentId: "432fdsa" }])',
    'docIdObject',
  ],
  ['object with id ([{ id: 123 }, { id: 321 }])', 'idObject'],
];

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

    docid1 = data.products[0].documentId;
    docid2 = data.products[1].documentId;
    docid3 = data.products[2].documentId;

    id1 = data.products[0].id;
    id2 = data.products[1].id;
    id3 = data.products[2].id;

    const createdShop1 = await createShop({
      anyToOneRel: [],
      anyToManyRel: [],
      data: { name: 'Test Shop' },
      // @ts-expect-error ignore
      populate: populateShop,
    });

    data.shops.push(createdShop1.data);
    shopid1 = data.shops[0].id;
    shopdocid1 = data.shops[0].documentId;
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
          const oneRelation =
            mode === 'docIdObject'
              ? [{ documentId: docid1 }]
              : mode === 'idObject'
                ? [{ id: id1 }]
                : [docid1];

          const manyRelations =
            mode === 'docIdObject'
              ? [{ documentId: docid1 }, { documentId: docid2 }]
              : mode === 'idObject'
                ? [{ id: id1 }, { id: id2 }]
                : [docid1, docid2];

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
                  return {
                    ...(mode === 'docId' && { documentId: rel }),
                    ...(mode === 'docIdObject' && { documentId: rel.documentId }),
                    ...(mode === 'idObject' && { id: rel.id }),
                    __type: 'api::product.product',
                  };
                }),
              },
              myCompo: {
                compo_products_ow: { [connectOrSet]: oneRelation },
                compo_products_mw: { [connectOrSet]: manyRelations },
              },
            },
            populateShop
          );

          const expectedRelation =
            mode === 'idObject'
              ? [{ id: id1 }, { id: id2 }]
              : [{ documentId: docid1 }, { documentId: docid2 }];
          const expectedOneRelation = mode === 'idObject' ? { id: id1 } : { documentId: docid1 };

          expect(shop.data).toMatchObject({
            myCompo: {
              compo_products_mw: expectedRelation,
              compo_products_ow: expectedOneRelation,
            },
            products_mm: expectedRelation,
            products_mo: expectedOneRelation,
            products_mw: expectedRelation,
            products_morphtomany: expectedRelation,
            products_om: expectedRelation,
            products_oo: expectedOneRelation,
            products_ow: expectedOneRelation,
          });
        });

        test('In reversed order', async () => {
          const oneRelation =
            mode === 'docIdObject'
              ? [{ documentId: docid1 }]
              : mode === 'idObject'
                ? [{ id: id1 }]
                : [docid1];

          const manyRelations =
            mode === 'docIdObject'
              ? [{ documentId: docid1 }, { documentId: docid2 }]
              : mode === 'idObject'
                ? [{ id: id1 }, { id: id2 }]
                : [docid1, docid2];
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
                  return {
                    ...(mode === 'docIdObject' && { documentId: rel.documentId }),
                    ...(mode === 'idObject' && { id: rel.id }),
                    ...(mode === 'docId' && { documentId: rel }),
                    __type: 'api::product.product',
                  };
                }),
              },
              myCompo: {
                compo_products_ow: { [connectOrSet]: oneRelation },
                compo_products_mw: { [connectOrSet]: manyRelations },
              },
            },
            populateShop
          );

          const expectedRelation =
            mode === 'idObject'
              ? [{ id: id2 }, { id: id1 }]
              : [{ documentId: docid2 }, { documentId: docid1 }];
          const expectedOneRelation = mode === 'idObject' ? { id: id1 } : { documentId: docid1 };

          expect(shop.data).toMatchObject({
            myCompo: {
              compo_products_mw: expectedRelation,
              compo_products_ow: expectedOneRelation,
            },
            products_mm: expectedRelation,
            products_mo: expectedOneRelation,
            products_mw: expectedRelation,
            products_morphtomany: expectedRelation,
            products_om: expectedRelation,
            products_oo: expectedOneRelation,
            products_ow: expectedOneRelation,
          });
        });
      });
    }
  );

  describe('Update an entity relations', () => {
    describe.each(testCases)('ids being %s', (name, mode) => {
      test('Adding id3', async () => {
        const oneRelation =
          mode === 'docIdObject'
            ? [{ documentId: docid1 }]
            : mode === 'idObject'
              ? [{ id: id1 }]
              : [docid1];

        const manyRelations =
          mode === 'docIdObject'
            ? [{ documentId: docid1 }, { documentId: docid2 }]
            : mode === 'idObject'
              ? [{ id: id1 }, { id: id2 }]
              : [docid1, docid2];

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
                return {
                  ...(mode === 'docIdObject' && { documentId: rel.documentId }),
                  ...(mode === 'idObject' && { id: rel.id }),
                  ...(mode === 'docId' && { documentId: rel }),
                  __type: 'api::product.product',
                };
              }),
            },
            myCompo: {
              compo_products_ow: { connect: oneRelation },
              compo_products_mw: { connect: manyRelations },
            },
          },
          populateShop
        );

        const expectedRelation =
          mode === 'idObject'
            ? [{ id: id1 }, { id: id2 }]
            : [{ documentId: docid1 }, { documentId: docid2 }];

        expect(createdShop.data).toMatchObject({
          myCompo: {
            compo_products_mw: expectedRelation,
            compo_products_ow: mode === 'idObject' ? { id: id1 } : { documentId: docid1 },
          },
          products_mm: expectedRelation,
          products_mo: mode === 'idObject' ? { id: id1 } : { documentId: docid1 },
          products_mw: expectedRelation,
          products_morphtomany: expectedRelation,
          products_om: expectedRelation,
          products_oo: mode === 'idObject' ? { id: id1 } : { documentId: docid1 },
          products_ow: mode === 'idObject' ? { id: id1 } : { documentId: docid1 },
        });

        const relationsToAdd =
          mode === 'docIdObject'
            ? [{ documentId: docid3 }]
            : mode === 'idObject'
              ? [{ id: id3 }]
              : [docid3];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.documentId,
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
                return {
                  ...(mode === 'docIdObject' && { documentId: rel.documentId }),
                  ...(mode === 'idObject' && { id: rel.id }),
                  ...(mode === 'docId' && { documentId: rel }),
                  __type: 'api::product.product',
                };
              }),
            },
          },
          populateShop
        );

        const expectedUpdatedRelation =
          mode === 'idObject'
            ? [{ id: id1 }, { id: id2 }, { id: id3 }]
            : [{ documentId: docid1 }, { documentId: docid2 }, { documentId: docid3 }];

        expect(updatedShop.data).toMatchObject({
          products_mm: expectedUpdatedRelation,
          products_mo: mode === 'idObject' ? { id: id3 } : { documentId: docid3 },
          products_mw: expectedUpdatedRelation,
          products_morphtomany: expectedUpdatedRelation,
          products_om: expectedUpdatedRelation,
          products_oo: mode === 'idObject' ? { id: id3 } : { documentId: docid3 },
          products_ow: mode === 'idObject' ? { id: id3 } : { documentId: docid3 },
        });
      });

      test('Adding id3 & removing id1', async () => {
        const manyRelations = [docid1, docid2];
        const oneRelation = [docid1];

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
                return { documentId: rel, __type: 'api::product.product' };
              }),
            },
            myCompo: {
              compo_products_ow: { connect: oneRelation },
              compo_products_mw: { connect: manyRelations },
            },
          },
          ['myCompo']
        );

        const relationsToAdd = mode === 'docIdObject' ? [{ documentId: docid3 }] : [docid3];
        const relationsToRemove = mode === 'docIdObject' ? [{ documentId: docid1 }] : [docid1];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.documentId,
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
                return {
                  documentId: mode === 'docIdObject' ? rel.documentId : rel,
                  __type: 'api::product.product',
                };
              }),
              disconnect: relationsToRemove.map((rel) => {
                return {
                  documentId: mode === 'docIdObject' ? rel.documentId : rel,
                  __type: 'api::product.product',
                };
              }),
            },
          },
          populateShop
        );

        expect(updatedShop.data).toMatchObject({
          products_mm: [{ documentId: docid2 }, { documentId: docid3 }],
          products_mo: { documentId: docid3 },
          products_mw: [{ documentId: docid2 }, { documentId: docid3 }],
          products_morphtomany: [{ documentId: docid2 }, { documentId: docid3 }],
          products_om: [{ documentId: docid2 }, { documentId: docid3 }],
          products_oo: { documentId: docid3 },
          products_ow: { documentId: docid3 },
        });
      });

      test('Adding id3 & removing id1, id3 (should still add id3)', async () => {
        const manyRelations = [docid1, docid2];
        const oneRelation = [docid1];

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
                return { documentId: rel, __type: 'api::product.product' };
              }),
            },
            myCompo: {
              compo_products_ow: { connect: oneRelation },
              compo_products_mw: { connect: manyRelations },
            },
          },
          ['myCompo']
        );

        const relationsToAdd = mode === 'docIdObject' ? [{ documentId: docid3 }] : [docid3];
        const relationsToRemove =
          mode === 'docIdObject'
            ? [{ documentId: docid1 }, { documentId: docid3 }]
            : [docid1, docid3];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.documentId,
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
                return {
                  documentId: mode === 'docIdObject' ? rel.documentId : rel,
                  __type: 'api::product.product',
                };
              }),
              disconnect: relationsToRemove.map((rel) => {
                return {
                  documentId: mode === 'docIdObject' ? rel.documentId : rel,
                  __type: 'api::product.product',
                };
              }),
            },
          },
          populateShop
        );

        expect(updatedShop.data).toMatchObject({
          products_mm: [{ documentId: docid2 }, { documentId: docid3 }],
          products_mo: { documentId: docid3 },
          products_mw: [{ documentId: docid2 }, { documentId: docid3 }],
          products_morphtomany: [{ documentId: docid2 }, { documentId: docid3 }],
          products_om: [{ documentId: docid2 }, { documentId: docid3 }],
          products_oo: { documentId: docid3 },
          products_ow: { documentId: docid3 },
        });
      });

      test('Change relation order from id1, id2, id3 to id3, id2, id1', async () => {
        const manyRelations = [docid1, docid2, docid3];

        const createdShop = await createEntry(
          'shops',
          {
            name: 'Cazotte Shop',
            products_om: { connect: manyRelations },
            products_mm: { connect: manyRelations },
            products_mw: { connect: manyRelations },
            products_morphtomany: {
              connect: manyRelations.map((rel) => {
                return { documentId: rel, __type: 'api::product.product' };
              }),
            },
            myCompo: {
              compo_products_mw: { connect: manyRelations },
            },
          },
          ['myCompo']
        );

        const relationsToChange =
          mode === 'docIdObject'
            ? [{ documentId: docid3 }, { documentId: docid2 }, { documentId: docid1 }]
            : [docid3, docid2, docid1];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.documentId,
          {
            name: 'Cazotte Shop',
            products_om: { connect: relationsToChange },
            products_mm: { connect: relationsToChange },
            products_mw: { connect: relationsToChange },
            products_morphtomany: {
              connect: relationsToChange.map((rel) => {
                return {
                  documentId: mode === 'docIdObject' ? rel.documentId : rel,
                  __type: 'api::product.product',
                };
              }),
            },
          },
          populateShop
        );

        expect(updatedShop.data).toMatchObject({
          products_mm: [{ documentId: docid3 }, { documentId: docid2 }, { documentId: docid1 }],
          products_mw: [{ documentId: docid3 }, { documentId: docid2 }, { documentId: docid1 }],
          products_morphtomany: [
            { documentId: docid3 },
            { documentId: docid2 },
            { documentId: docid1 },
          ],
          products_om: [{ documentId: docid3 }, { documentId: docid2 }, { documentId: docid1 }],
        });
      });

      // TODO: once this works, refactor tests so that all relevant tests check with different types for polymorph
      test.skip('with other uid Change relation order from id1, id2, id3 to id3, id2, id1', async () => {
        const manyRelations = [docid1, docid2, docid3];
        const morphRelations = manyRelations.map((rel) => {
          return { documentId: rel, __type: 'api::product.product' };
        });

        morphRelations.push({ documentId: shopdocid1, __type: 'api::shop.shop' });

        console.log('morphRelations', morphRelations);

        const createdShop = await createEntry(
          'shops',
          {
            name: 'Cazotte Shop',
            products_om: { connect: manyRelations },
            products_mm: { connect: manyRelations },
            products_mw: { connect: manyRelations },
            products_morphtomany: {
              connect: morphRelations,
            },
            myCompo: {
              compo_products_mw: { connect: manyRelations },
            },
          },
          ['myCompo']
        );

        console.error('Created Shop', JSON.stringify(createdShop, undefined, 2));

        const relationsToChange =
          mode === 'docIdObject'
            ? [
                { documentId: docid3 },
                { documentId: shopdocid1 },
                { documentId: docid2 },
                { documentId: docid1 },
              ]
            : [docid3, shopdocid1, docid2, docid1];

        console.log('relations to change', JSON.stringify(relationsToChange));
        const polymorphChangeMap = relationsToChange.map((rel) => {
          return {
            ...(mode === 'docIdObject' && { documentId: rel.documentId }),
            // ...(mode === 'idObject' && { id: rel.id }),
            ...(mode === 'docId' && { documentId: rel }),
            __type:
              rel === shopdocid1 || rel.documentId === shopdocid1
                ? 'api::shop.shop'
                : 'api::product.product',
          };
        });

        console.log('polymorph change map', JSON.stringify(polymorphChangeMap));
        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.documentId,
          {
            name: 'Cazotte Shop',
            products_om: { connect: relationsToChange },
            products_mm: { connect: relationsToChange },
            products_mw: { connect: relationsToChange },
            products_morphtomany: {
              connect: polymorphChangeMap,
            },
          },
          populateShop
        );

        expect(updatedShop.data).toMatchObject({
          products_mm: [
            { documentId: docid3 },
            { documentId: shopdocid1 },
            { documentId: docid2 },
            { documentId: docid1 },
          ],
          products_mw: [
            { documentId: docid3 },
            { documentId: shopdocid1 },
            { documentId: docid2 },
            { documentId: docid1 },
          ],
          products_morphtomany: [
            { documentId: docid3 },
            { documentId: shopdocid1 },
            { documentId: docid2 },
            { documentId: docid1 },
          ],
          products_om: [
            { documentId: docid3 },
            { documentId: shopdocid1 },
            { documentId: docid2 },
            { documentId: docid1 },
          ],
        });
      });

      test('Change relation order by putting id2 at the end', async () => {
        const manyRelations = [docid1, docid2, docid3];

        const createdShop = await createEntry(
          'shops',
          {
            name: 'Cazotte Shop',
            products_om: { connect: manyRelations },
            products_mm: { connect: manyRelations },
            products_mw: { connect: manyRelations },
            products_morphtomany: {
              connect: manyRelations.map((rel) => {
                return { documentId: rel, __type: 'api::product.product' };
              }),
            },
            myCompo: {
              compo_products_mw: { connect: manyRelations },
            },
          },
          ['myCompo']
        );

        const relationsToChange = mode === 'docIdObject' ? [{ documentId: docid2 }] : [docid2];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.documentId,
          {
            name: 'Cazotte Shop',
            products_om: { connect: relationsToChange },
            products_mm: { connect: relationsToChange },
            products_mw: { connect: relationsToChange },
            products_morphtomany: {
              connect: relationsToChange.map((rel) => {
                return {
                  documentId: mode === 'docIdObject' ? rel.documentId : rel,
                  __type: 'api::product.product',
                };
              }),
            },
          },
          populateShop
        );

        expect(updatedShop.data).toMatchObject({
          products_mm: [{ documentId: docid1 }, { documentId: docid3 }, { documentId: docid2 }],
          products_mw: [{ documentId: docid1 }, { documentId: docid3 }, { documentId: docid2 }],
          products_morphtomany: [
            { documentId: docid1 },
            { documentId: docid3 },
            { documentId: docid2 },
          ],
          products_om: [{ documentId: docid1 }, { documentId: docid3 }, { documentId: docid2 }],
        });
      });

      test('Change relation order by putting id2, id1 at the end', async () => {
        const manyRelations = [docid1, docid2, docid3];

        const createdShop = await createEntry(
          'shops',
          {
            name: 'Cazotte Shop',
            products_om: { connect: manyRelations },
            products_mm: { connect: manyRelations },
            products_mw: { connect: manyRelations },
            products_morphtomany: {
              connect: manyRelations.map((rel) => {
                return { documentId: rel, __type: 'api::product.product' };
              }),
            },
            myCompo: {
              compo_products_mw: { connect: manyRelations },
            },
          },
          ['myCompo']
        );

        const relationsToChange =
          mode === 'docIdObject'
            ? [{ documentId: docid2 }, { documentId: docid1 }]
            : [docid2, docid1];

        const updatedShop = await updateEntry(
          'shops',
          createdShop.data.documentId,
          {
            name: 'Cazotte Shop',
            products_om: { connect: relationsToChange },
            products_mm: { connect: relationsToChange },
            products_mw: { connect: relationsToChange },
            products_morphtomany: {
              connect: relationsToChange.map((rel) => {
                return {
                  documentId: mode === 'docIdObject' ? rel.documentId : rel,
                  __type: 'api::product.product',
                };
              }),
            },
          },
          populateShop
        );

        expect(updatedShop.data).toMatchObject({
          products_mm: [{ documentId: docid3 }, { documentId: docid2 }, { documentId: docid1 }],
          products_mw: [{ documentId: docid3 }, { documentId: docid2 }, { documentId: docid1 }],
          products_om: [{ documentId: docid3 }, { documentId: docid2 }, { documentId: docid1 }],
        });
      });
    });
  });

  describe('Disconnect entity relations', () => {
    describe.each(testCases)('ids being %s', (name, mode) => {
      test('Remove all relations docid1, docid2, docid3', async () => {
        const manyRelations =
          mode === 'docIdObject'
            ? [{ documentId: docid1 }, { documentId: docid2 }, { documentId: docid3 }]
            : mode === 'idObject'
              ? [{ id: id1 }, { id: id2 }, { id: id3 }]
              : [docid1, docid2, docid3];
        const oneRelation =
          mode === 'docIdObject'
            ? [{ documentId: docid1 }]
            : mode === 'idObject'
              ? [{ id: id1 }]
              : [docid1];

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
                return {
                  ...(mode === 'docId' && { documentId: rel }),
                  ...(mode === 'docIdObject' && { documentId: rel.documentId }),
                  ...(mode === 'idObject' && { id: rel.id }),
                  __type: 'api::product.product',
                };
              }),
            },
            myCompo: {
              compo_products_ow: { connect: oneRelation },
              compo_products_mw: { connect: manyRelations },
            },
          },
          ['myCompo']
        );

        const relationsToDisconnectOne =
          mode === 'docIdObject'
            ? [{ documentId: docid1 }]
            : mode === 'idObject'
              ? [{ id: id1 }]
              : [docid1];
        const relationsToDisconnectMany =
          mode === 'docIdObject'
            ? [{ documentId: docid3 }, { documentId: docid2 }, { documentId: docid1 }]
            : mode === 'idObject'
              ? [{ id: id3 }, { id: id2 }, { id: id1 }]
              : [docid3, docid2, docid1];

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
            products_morphtomany: {
              disconnect: relationsToDisconnectMany.map((rel) => {
                return {
                  ...(mode === 'docId' && { documentId: rel }),
                  ...(mode === 'docIdObject' && { documentId: rel.documentId }),
                  ...(mode === 'idObject' && { id: rel.id }),
                  __type: 'api::product.product',
                };
              }),
            },
          },
          populateShop
        );

        expect(updatedShop.data).toMatchObject({
          products_ow: null,
          products_oo: null,
          products_mo: null,
          products_mm: [],
          products_mw: [],
          products_morphtomany: [],
          products_om: [],
        });
      });

      test("Remove relations that doesn't exist doesn't fail", async () => {
        const createRelation =
          mode === 'docIdObject'
            ? [{ documentId: docid1 }]
            : mode === 'idObject'
              ? [{ id: id1 }]
              : [docid1];

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
                return {
                  ...(mode === 'docId' && { documentId: rel }),
                  ...(mode === 'docIdObject' && { documentId: rel.documentId }),
                  ...(mode === 'idObject' && { id: rel.id }),
                  __type: 'api::product.product',
                };
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
          mode === 'docIdObject'
            ? [{ documentId: docid3 }, { documentId: docid2 }, { documentId: 9999 }]
            : mode === 'idObject'
              ? [{ id: id3 }, { id: id2 }, { id: 9999 }]
              : [docid3, docid2, 9999];

        if (mode === 'docIdObject') {
          const productTypes = [
            'products_ow',
            'products_oo',
            'products_mo',
            'products_om',
            'products_mm',
            'products_mw',
            'products_morphtomany',
          ];

          for (const productType of productTypes) {
            const updatePayload = {
              name: 'Cazotte Shop',
              [productType]: {
                disconnect: relationsToDisconnectMany.map((rel) => {
                  if (productType === 'products_morphtomany') {
                    return {
                      ...(mode === 'docIdObject' && { documentId: rel.documentId }),
                      __type: 'api::product.product',
                    };
                  }
                  return rel;
                }),
              },
            };

            const updatedShop = await updateEntry(
              'shops',
              createdShop.data.documentId,
              updatePayload,
              populateShop
            );

            expect(updatedShop.error).toBeDefined();
            expect(updatedShop.error.status).toBe(400);
          }
        } else if (mode === 'docId' || mode === 'idObject') {
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
            },
            populateShop
          );

          expect(updatedShop.data).toMatchObject({
            products_ow: { documentId: docid1 },
            products_oo: { documentId: docid1 },
            products_mo: { documentId: docid1 },
            products_mm: [{ documentId: docid1 }],
            products_mw: [{ documentId: docid1 }],
            products_morphtomany: [{ documentId: docid1 }],
            products_om: [{ documentId: docid1 }],
          });
        }
      });
    });
  });

  describe('Reorder entity relations', () => {
    test('Connect new relation at the start', async () => {
      const createdShop = await createShop({
        anyToManyRel: [
          { documentId: docid1, position: { start: true } },
          { documentId: docid2, position: { start: true } },
        ],
      });

      const expectedCreatedShop = shopFactory({
        anyToManyRel: [{ documentId: docid2 }, { documentId: docid1 }],
      });

      expect(createdShop.data).toMatchObject(expectedCreatedShop);
    });

    test('Connect new relation at the end', async () => {
      const createdShop = await createShop({
        anyToManyRel: [
          { documentId: docid1, position: { end: true } },
          { documentId: docid2, position: { end: true } },
        ],
      });

      const expectedCreatedShop = shopFactory({
        anyToManyRel: [{ documentId: docid1 }, { documentId: docid2 }],
      });
      expect(createdShop.data).toMatchObject(expectedCreatedShop);
    });

    test('Create relations using before and after', async () => {
      const createdShop = await createShop({
        anyToManyRel: [
          { documentId: docid1, position: { start: true } },
          { documentId: docid2, position: { start: true } },
          { documentId: docid3, position: { after: docid1 } },
        ],
      });

      const expectedShop = shopFactory({
        anyToManyRel: [{ documentId: docid2 }, { documentId: docid1 }, { documentId: docid3 }],
      });
      expect(createdShop.data).toMatchObject(expectedShop);
    });

    test("Create polymorphic relations with different types using 'before' and 'after'", async () => {
      // Create shop directly without the utility
      const shop = await createEntry(
        'shops',
        {
          name: 'Cazotte Shop',
          products_morphtomany: {
            connect: [
              {
                documentId: docid1,
                __type: 'api::product.product',
                position: 'end',
              },
              // Connect shop before product
              {
                documentId: shopdocid1,
                __type: 'api::shop.shop',
                position: {
                  before: docid1,
                  __type: 'api::product.product',
                },
              },
            ],
          },
        },
        populateShop
      );

      expect(shop.data).toMatchObject({
        products_morphtomany: [
          { documentId: shopdocid1, __type: 'api::shop.shop' },
          { documentId: docid1, __type: 'api::product.product' },
        ],
      });
    });

    test('Update relations using before and after', async () => {
      const shop = await createShop({
        anyToManyRel: [
          { documentId: docid1, position: { end: true } },
          { documentId: docid2, position: { end: true } },
        ],
      });

      const updatedShop = await updateShop(shop.data, {
        anyToManyRel: [
          { documentId: docid1, position: { before: docid2 } },
          { documentId: docid2, position: { start: true } },
          { documentId: docid3, position: { end: true } },
        ],
      });

      const expectedShop = shopFactory({
        anyToManyRel: [{ documentId: docid2 }, { documentId: docid1 }, { documentId: docid3 }],
      });
      expect(updatedShop.data).toMatchObject(expectedShop);
    });

    test('Update polymorphic relations with different types using before and after', async () => {
      const shop = await createEntry('shops', {
        name: 'Cazotte Shop',
        products_morphtomany: {
          connect: [
            { documentId: docid1, __type: 'api::product.product' },
            { documentId: shopdocid1, __type: 'api::shop.shop' },
          ],
        },
      });

      const updatedShop = await updateEntry(
        'shops',
        shop.data.documentId,
        {
          name: 'Cazotte Shop',
          products_morphtomany: {
            connect: [
              {
                documentId: docid1,
                __type: 'api::product.product',
                position: { before: shopdocid1, __type: 'api::shop.shop' },
              },
            ],
          },
        },
        populateShop
      );

      expect(updatedShop.data).toMatchObject({
        products_morphtomany: [
          { documentId: docid1, __type: 'api::product.product' },
          { documentId: shopdocid1, __type: 'api::shop.shop' },
        ],
      });
    });

    test('Update relations using the same id multiple times', async () => {
      const shop = await createShop({
        anyToManyRel: [
          { documentId: docid1, position: { end: true } },
          { documentId: docid2, position: { end: true } },
        ],
      });

      const updatedShop = await updateShop(shop.data, {
        anyToManyRel: [
          { documentId: docid1, position: { end: true } },
          { documentId: docid1, position: { start: true } },
          { documentId: docid1, position: { after: docid2 } },
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
                documentId: docid1,
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
                documentId: docid1,
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
                documentId: docid1,
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
                documentId: docid1,
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
                documentId: docid1,
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
        anyToManyRel: [{ documentId: docid1, position: { after: docid2 } }],
      });

      expect(updatedShop.error).toMatchObject({ status: 400, name: 'ValidationError' });
    });

    test('Update relations with invalid connect array in non-strict mode', async () => {
      const shop = await createShop({
        anyToManyRel: [{ documentId: docid1 }],
      });

      // Connect before an id that does not exist.
      const updatedShop = await updateShop(shop.data, {
        anyToManyRel: [{ documentId: docid2, position: { after: docid3 } }],
        strict: false,
      });

      const expectedShop = shopFactory({
        anyToManyRel: [{ documentId: docid1 }, { documentId: docid2 }],
      });

      expect(updatedShop.data).toMatchObject(expectedShop);
    });
  });
});
