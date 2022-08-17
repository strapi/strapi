'use strict';

const { propEq, omit } = require('lodash/fp');

const { createTestBuilder } = require('../../../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../../../test/helpers/strapi');
const { createContentAPIRequest } = require('../../../../../../../test/helpers/request');

const builder = createTestBuilder();

let strapi;
let data;
let rq;

const schemas = {
  components: {
    foo: {
      displayName: 'foo',
      attributes: {
        number: { type: 'integer' },
        field: { type: 'string' },
      },
    },
    bar: {
      displayName: 'bar',
      attributes: {
        title: { type: 'string' },
        field: { type: 'password' },
      },
    },
  },
  contentTypes: {
    a: {
      kind: 'collectionType',
      displayName: 'a',
      singularName: 'a',
      pluralName: 'as',
      attributes: {
        name: { type: 'string' },
        pass: { type: 'password' },
        fooRef: { type: 'component', component: 'default.foo', repeatable: false },
        barRefs: { type: 'component', component: 'default.bar', repeatable: true },
      },
    },
    b: {
      kind: 'collectionType',
      displayName: 'b',
      singularName: 'b',
      pluralName: 'bs',
      attributes: {
        title: { type: 'string' },
        dz: { type: 'dynamiczone', components: ['default.foo', 'default.bar'] },
      },
    },
    c: {
      kind: 'collectionType',
      displayName: 'c',
      singularName: 'c',
      pluralName: 'cs',
      attributes: {
        first: { type: 'string' },
        second: { type: 'component', component: 'default.foo', repeatable: false },
        third: { type: 'relation', target: 'api::a.a', relation: 'oneToMany' },
      },
    },
  },
};

const fixtures = {
  a: [
    {
      name: 'first',
      pass: 'strong_password',
      fooRef: {
        number: 4,
        field: 'text',
      },
      barRefs: [
        { title: 'john doe', field: '1234' },
        { title: 'jane doe', field: '5678' },
      ],
    },
    {
      name: 'second',
      pass: 'another_strong_password',
      fooRef: {
        number: 12,
        field: 'text field',
      },
      barRefs: [
        { title: 'foo', field: '1997' },
        { title: 'bar', field: '2005' },
        { title: 'foobar', field: '2022' },
      ],
    },
  ],
  b: [
    {
      title: 'something',
      dz: [
        {
          __component: 'default.foo',
          number: 1,
          field: 'short text',
        },
        {
          __component: 'default.foo',
          number: 2,
          field: 'short string',
        },
        {
          __component: 'default.bar',
          title: 'this is a title',
          field: 'password',
        },
      ],
    },
    {
      title: 'something else',
      dz: [
        {
          __component: 'default.bar',
          title: 'this is a another title',
          field: 'password text',
        },
      ],
    },
  ],
  c: (fixtures) => [
    {
      first: 'hello',
      second: {
        number: 16,
        field: 'a simple string',
      },
      third: fixtures.a.map((entity) => entity.id).slice(0, 1),
    },
    {
      first: 'world',
      second: {
        number: 14,
        field: 'a simple string',
      },
      third: fixtures.a.map((entity) => entity.id).slice(0, 2),
    },
  ],
};

describe('Populate filters', () => {
  beforeAll(async () => {
    await builder
      .addComponent(schemas.components.foo)
      .addComponent(schemas.components.bar)
      .addContentTypes(Object.values(schemas.contentTypes))
      .addFixtures(schemas.contentTypes.a.singularName, fixtures.a)
      .addFixtures(schemas.contentTypes.b.singularName, fixtures.b)
      .addFixtures(schemas.contentTypes.c.singularName, fixtures.c)
      .build();

    strapi = await createStrapiInstance();
    rq = createContentAPIRequest({ strapi });
    data = await builder.sanitizedFixtures(strapi);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Populate simple relation', () => {
    test('No filters & no populate', async () => {
      const { status, body } = await rq.get(`/${schemas.contentTypes.a.pluralName}`);

      expect(status).toBe(200);
      expect(body.data).toHaveLength(fixtures.a.length);

      body.data.forEach((entity) => {
        expect(entity).not.toHaveProperty('fooRef');
        expect(entity).not.toHaveProperty('barRefs');
      });
    });

    test('No filters & specific populate', async () => {
      const qs = {
        populate: 'fooRef',
      };

      const { status, body } = await rq.get(`/${schemas.contentTypes.a.pluralName}`, { qs });

      expect(status).toBe(200);
      expect(body.data).toHaveLength(fixtures.a.length);

      body.data.forEach((entity) => {
        expect(entity.attributes).toHaveProperty('fooRef');
        expect(entity.attributes).not.toHaveProperty('barRefs');
      });
    });

    test('No filters & populate all', async () => {
      const qs = {
        populate: '*',
      };

      const { status, body } = await rq.get(`/${schemas.contentTypes.a.pluralName}`, { qs });

      expect(status).toBe(200);
      expect(body.data).toHaveLength(fixtures.a.length);

      body.data.forEach((entity) => {
        expect(entity.attributes).toHaveProperty('fooRef');
        expect(entity.attributes).toHaveProperty('barRefs');
      });
    });

    test('No filters & deep populate', async () => {
      const qs = {
        populate: ['second', 'third.fooRef'],
      };
      const { status, body } = await rq.get(`/${schemas.contentTypes.c.pluralName}`, { qs });

      expect(status).toBe(200);
      expect(body.data).toHaveLength(2);

      body.data.forEach((entity) => {
        expect(entity.attributes).toHaveProperty('second');
        expect(entity.attributes).toHaveProperty('third');

        expect(Array.isArray(entity.attributes.third.data)).toBe(true);

        entity.attributes.third.data.forEach((thirdItem) => {
          const expected = data.a.find(propEq('id', thirdItem.id));

          expect(thirdItem.attributes).toMatchObject(omit('id', expected));
        });
      });
    });

    test('Simple filters & populate', async () => {
      const qs = {
        populate: {
          second: {
            filters: {
              number: {
                $lt: 15,
              },
            },
          },
        },
      };
      const { status, body } = await rq.get(`/${schemas.contentTypes.c.pluralName}`, { qs });

      expect(status).toBe(200);
      expect(body.data).toHaveLength(2);

      const [firstItem, secondItem] = body.data;

      expect(firstItem.attributes.second).toBeNull();
      expect(secondItem.attributes.second).not.toBeNull();

      expect(secondItem.attributes.second).toMatchObject({
        number: 14,
        field: 'a simple string',
      });
    });

    test('Simple filters & deep populate', async () => {
      const qs = {
        populate: {
          third: {
            populate: {
              fooRef: {
                filters: { field: { $eq: 'text' } },
              },
            },
          },
        },
      };
      const { status, body } = await rq.get(`/${schemas.contentTypes.c.pluralName}`, { qs });

      expect(status).toBe(200);
      expect(body.data).toHaveLength(2);

      const [firstItem, secondItem] = body.data;

      expect(firstItem.attributes.third.data[0].attributes.fooRef).not.toBeNull();
      expect(secondItem.attributes.third.data[0].attributes.fooRef).not.toBeNull();
      expect(secondItem.attributes.third.data[1].attributes.fooRef).toBeNull();
    });

    test("Populate with object and 't'", async () => {
      const qs = {
        populate: {
          third: 't',
        },
      };
      const { status, body } = await rq.get(`/${schemas.contentTypes.c.pluralName}`, { qs });

      expect(status).toBe(200);
      expect(body.data).toHaveLength(2);

      expect(body.data[0].attributes.third.data[0].attributes.fooRef).toBeUndefined();
    });
  });
});
