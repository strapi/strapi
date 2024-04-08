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
      { name: 'Shirt B', shirtId: 'B', variantOf: fixtures.shirt[0].id },
      { name: 'Shirt C', shirtId: 'C', variantOf: fixtures.shirt[0].id },
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

  test('Populate with attribute named {content_type}_id in parent', async () => {
    const qs = {
      filters: {
        name: 'Shirt A',
      },
      populate: {
        variants: true,
        variantOf: true,
      },
    };
    const { status, body } = await rq.get(`/${schemas.contentTypes.shirt.pluralName}`, { qs });

    expect(status).toBe(200);
    expect(body.data).toHaveLength(1);
    const shirtA = body.data[0];

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
  });
});
