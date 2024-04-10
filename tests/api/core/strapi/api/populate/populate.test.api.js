'use strict';

const { propEq, omit } = require('lodash/fp');

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
    return [
      {
        name: 'Shirt B',
        shirtId: 'B',
        variantOf: fixtures.shirt[0].id,
        similar: [fixtures.shirt[0].id],
      },
      {
        name: 'Shirt C',
        shirtId: 'C',
        variantOf: fixtures.shirt[0].id,
        similar: [fixtures.shirt[0].id],
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
    const shirtA = body.data.find((item) => item.attributes.name === 'Shirt A');
    const shirtB = body.data.find((item) => item.attributes.name === 'Shirt B');

    // Check that shirtA contains shirtB and shirtC as variants
    expect(shirtA.attributes.variants.data).toMatchObject(
      expect.arrayContaining([
        expect.objectContaining({
          attributes: expect.objectContaining({ shirtId: 'B', name: 'Shirt B' }),
        }),
        expect.objectContaining({
          attributes: expect.objectContaining({ shirtId: 'C', name: 'Shirt C' }),
        }),
      ])
    );

    // Check that shirtB contains shirtA as variantOf
    expect(shirtB.attributes.variantOf.data).toMatchObject(
      expect.objectContaining({
        attributes: expect.objectContaining({ shirtId: 'A', name: 'Shirt A' }),
      })
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
    console.log('result', JSON.stringify(body, undefined, 2));
    const shirtA = body.data.find((item) => item.attributes.name === 'Shirt A');
    const shirtB = body.data.find((item) => item.attributes.name === 'Shirt B');

    // Check that shirtA contains shirtB and shirtC as variants
    expect(shirtA.attributes.similarMap.data).toMatchObject(
      expect.arrayContaining([
        expect.objectContaining({
          attributes: expect.objectContaining({ shirtId: 'B', name: 'Shirt B' }),
        }),
        expect.objectContaining({
          attributes: expect.objectContaining({ shirtId: 'C', name: 'Shirt C' }),
        }),
      ])
    );

    // Check that shirtB contains shirtA as variantOf
    expect(shirtB.attributes.similar.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          attributes: expect.objectContaining({ shirtId: 'A', name: 'Shirt A' }),
        }),
      ])
    );
  });

  test.todo('morphX, morphyToMany, morphToOne');
});
