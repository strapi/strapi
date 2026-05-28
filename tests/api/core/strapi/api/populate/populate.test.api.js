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

  describe('Polymorphic populate — valid queries return 200; invalid nested populate returns 400', () => {
    test('morphToMany accepts populate * at polymorphic root', async () => {
      const qs = { populate: { morph_to_many: { populate: '*' } } };
      const { status, body } = await rq.get(`/${schemas.contentTypes.shirt.pluralName}`, { qs });

      expect(status).toBe(200);
      expect(body.data).toHaveLength(3);
    });

    test('morphToMany accepts count only', async () => {
      const qs = { populate: { morph_to_many: { count: true } } };
      const { status, body } = await rq.get(`/${schemas.contentTypes.shirt.pluralName}`, { qs });

      expect(status).toBe(200);
      expect(body.data).toHaveLength(3);
    });

    test('morphToMany accepts on fragment with nested populate *', async () => {
      const qs = {
        populate: {
          morph_to_many: {
            on: {
              'api::shirt.shirt': { populate: '*' },
            },
          },
        },
      };
      const { status, body } = await rq.get(`/${schemas.contentTypes.shirt.pluralName}`, { qs });

      expect(status).toBe(200);
      expect(body.data).toHaveLength(3);
    });

    test('morphToOne accepts on fragment', async () => {
      const qs = {
        populate: {
          morph_to_one: {
            on: {
              'api::shirt.shirt': true,
            },
          },
        },
      };
      const { status, body } = await rq.get(`/${schemas.contentTypes.shirt.pluralName}`, { qs });

      expect(status).toBe(200);
      expect(body.data).toHaveLength(3);
    });

    test.each([
      ['morphToMany', ['morph_to_many']],
      ['morphToOne', ['morph_to_one']],
    ])('%s accepts dot-notation populate array (regression)', async (_label, populate) => {
      const { status, body } = await rq.get(`/${schemas.contentTypes.shirt.pluralName}`, {
        qs: { populate },
      });

      expect(status).toBe(200);
      expect(body.data).toHaveLength(3);
    });

    test('non-polymorphic relation still accepts nested populate object (regression)', async () => {
      const qs = {
        populate: {
          variantOf: {
            populate: {
              variants: true,
            },
          },
        },
      };
      const { status, body } = await rq.get(`/${schemas.contentTypes.shirt.pluralName}`, { qs });

      expect(status).toBe(200);
      expect(body.data).toHaveLength(3);
      const shirtB = body.data.find((item) => item.name === 'Shirt B');
      expect(shirtB.variantOf).toStrictEqual(
        expect.objectContaining({ shirtId: 'A', name: 'Shirt A' })
      );
    });

    test('morphToMany rejects invalid nested populate string with 400', async () => {
      const qs = { populate: { morph_to_many: { populate: 'deep' } } };
      const { status, body } = await rq.get(`/${schemas.contentTypes.shirt.pluralName}`, { qs });

      expect(status).toBe(400);
      expect(body.error?.name).toBe('ValidationError');
    });

    test('morphToMany rejects invalid nested object populate with 400', async () => {
      const qs = {
        populate: {
          morph_to_many: { populate: { morph_one: true } },
        },
      };
      const { status, body } = await rq.get(`/${schemas.contentTypes.shirt.pluralName}`, { qs });

      expect(status).toBe(400);
      expect(body.error?.name).toBe('ValidationError');
    });

    test('morphToOne rejects invalid nested populate string with 400', async () => {
      const qs = { populate: { morph_to_one: { populate: 'deep' } } };
      const { status, body } = await rq.get(`/${schemas.contentTypes.shirt.pluralName}`, { qs });

      expect(status).toBe(400);
      expect(body.error?.name).toBe('ValidationError');
    });
  });
});
