'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest } = require('api-tests/request');

const builder = createTestBuilder();

let strapi;
let data;
let rq;

const schemas = {
  contentTypes: {
    shirt: {
      attributes: {
        name: {
          type: 'string',
        },
        shirtId: {
          type: 'string',
        },
        variants: {
          type: 'relation',
          relation: 'oneToMany',
          target: 'api::shirt.shirt',
          mappedBy: 'variantOf',
        },
        variantOf: {
          type: 'relation',
          relation: 'manyToOne',
          target: 'api::shirt.shirt',
          inversedBy: 'variants',
        },
        similar: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::shirt.shirt',
          mappedBy: 'similarMap',
        },
        similarMap: {
          type: 'relation',
          relation: 'manyToMany',
          target: 'api::shirt.shirt',
          inversedBy: 'similar',
        },
        morph_to_one: {
          type: 'relation',
          relation: 'morphToOne',
        },
        morph_one: {
          type: 'relation',
          relation: 'morphOne',
          target: 'api::shirt.shirt',
          morphBy: 'morph_to_one',
        },
        morph_to_many: {
          type: 'relation',
          relation: 'morphToMany',
        },
        morph_many: {
          type: 'relation',
          relation: 'morphMany',
          target: 'api::shirt.shirt',
          morphBy: 'morph_to_many',
        },
      },
      displayName: 'Shirt',
      singularName: 'shirt',
      pluralName: 'shirts',
      description: '',
      collectionName: '',
    },
  },
};

const fixtures = {
  shirtA: [
    {
      name: 'Shirt A',
      shirtId: 'A',
    },
  ],
  shirtRelations: (fixtures) => {
    const shirtA = fixtures.shirt[0];
    return [
      {
        name: 'Shirt B',
        shirtId: 'B',
        variantOf: shirtA.id,
        similar: [shirtA.id],
        morph_many: [{ __type: 'api::shirt.shirt', id: shirtA.id }],
      },
      {
        name: 'Shirt C',
        shirtId: 'C',
        variantOf: shirtA.id,
        similar: [shirtA.id],
        morph_one: [{ __type: 'api::shirt.shirt', id: shirtA.id }],
      },
    ];
  },
};

describe('Populate', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes(Object.values(schemas.contentTypes))
      .addFixtures(schemas.contentTypes.shirt.singularName, fixtures.shirtA)
      .addFixtures(schemas.contentTypes.shirt.singularName, fixtures.shirtRelations)
      .build();

    strapi = await createStrapiInstance();
    rq = createContentAPIRequest({ strapi });
    data = await builder.sanitizedFixtures(strapi);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  // the relation types below (eg, XtoOne) reference the type of join(s) being performed, not the relation type of the attribute
  test('Populate with attribute named {content_type}_id in parent with oneToMany/XtoOne relation', async () => {
    const qs = {
      populate: {
        variants: true,
        variantOf: true,
      },
    };
    const { status, body } = await rq.get(`/${schemas.contentTypes.shirt.pluralName}`, { qs });

    expect(status).toBe(200);
    expect(body.data).toHaveLength(3);

    expect(body.meta.pagination).toMatchObject({
      pageCount: 1,
      page: 1,
      pageSize: 25,
      total: 3,
    });

    const shirtA = body.data.find((item) => item.name === 'Shirt A');
    const shirtB = body.data.find((item) => item.name === 'Shirt B');

    // Check that shirtA contains shirtB and shirtC as variants
    expect(shirtA.variants).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({ shirtId: 'B', name: 'Shirt B' }),
        expect.objectContaining({ shirtId: 'C', name: 'Shirt C' }),
      ])
    );

    // Check that shirtB contains shirtA as variantOf
    expect(shirtB.variantOf).toStrictEqual(
      expect.objectContaining({ shirtId: 'A', name: 'Shirt A' })
    );
  });

  test('Populate with attribute named {content_type}_id in parent with manyToMany relation', async () => {
    const qs = {
      populate: {
        similar: true,
        similarMap: true,
      },
    };
    const { status, body } = await rq.get(`/${schemas.contentTypes.shirt.pluralName}`, { qs });

    expect(status).toBe(200);
    expect(body.data).toHaveLength(3);

    expect(body.meta.pagination).toMatchObject({
      pageCount: 1,
      page: 1,
      pageSize: 25,
      total: 3,
    });

    const shirtA = body.data.find((item) => item.name === 'Shirt A');
    const shirtB = body.data.find((item) => item.name === 'Shirt B');

    // Check that shirtA contains shirtB and shirtC as variants
    expect(shirtA.similarMap).toStrictEqual(
      expect.arrayContaining([
        expect.objectContaining({ shirtId: 'B', name: 'Shirt B' }),
        expect.objectContaining({ shirtId: 'C', name: 'Shirt C' }),
      ])
    );

    // Check that shirtB contains shirtA shirtId
    expect(shirtB.similar).toStrictEqual(
      expect.arrayContaining([expect.objectContaining({ shirtId: 'A', name: 'Shirt A' })])
    );
  });

  test('Populate with attribute named {content_type}_id in parent with morphOne relation', async () => {
    const qs = { populate: { morph_one: true } };
    const { status, body } = await rq.get(`/${schemas.contentTypes.shirt.pluralName}`, { qs });

    expect(status).toBe(200);
    expect(body.data).toHaveLength(3);

    expect(body.meta.pagination).toMatchObject({
      pageCount: 1,
      page: 1,
      pageSize: 25,
      total: 3,
    });

    const shirtC = body.data.find((item) => item.name === 'Shirt C');

    // TODO: test the morph_to_one side on shirtA

    // Check that shirtC contains shirtA as shirtId
    expect(shirtC.morph_one).toStrictEqual(
      expect.objectContaining({ shirtId: 'A', name: 'Shirt A' })
    );
  });

  test('Populate with attribute named {content_type}_id in parent with morphMany/morphToMany relation', async () => {
    const qs = {
      populate: {
        morph_many: true,
        morph_to_many: { on: { 'api::shirt.shirt': true } },
      },
    };
    const { status, body } = await rq.get(`/${schemas.contentTypes.shirt.pluralName}`, { qs });

    expect(status).toBe(200);
    expect(body.data).toHaveLength(3);

    const shirtA = body.data.find((item) => item.name === 'Shirt A');
    const shirtB = body.data.find((item) => item.name === 'Shirt B');

    expect(body.meta.pagination).toMatchObject({
      pageCount: 1,
      page: 1,
      pageSize: 25,
      total: 3,
    });

    // Check that shirtA contains shirtB with shirtId
    // TODO v6: standardize the returned data from morph relationships. morph_to_many returns `[{ ...attributes }]` instead of `data: [{ attributes }]`
    expect(shirtA.morph_to_many).toStrictEqual(
      expect.arrayContaining([expect.objectContaining({ shirtId: 'B', name: 'Shirt B' })])
    );

    // Check that shirtB contains shirtA with shirtId
    expect(shirtB.morph_many).toStrictEqual(
      expect.arrayContaining([expect.objectContaining({ shirtId: 'A', name: 'Shirt A' })])
    );
  });
});
