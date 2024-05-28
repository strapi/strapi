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
          __component: 'default.foo',
          number: 3,
          field: 'long string',
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
        expect(entity).toHaveProperty('fooRef');
        expect(entity).not.toHaveProperty('barRefs');
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
        expect(entity).toHaveProperty('fooRef');
        expect(entity).toHaveProperty('barRefs');
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
        expect(entity).toHaveProperty('second');
        expect(entity).toHaveProperty('third');

        expect(Array.isArray(entity.third)).toBe(true);

        entity.third.forEach((thirdItem) => {
          const expected = data.a.find(propEq('id', thirdItem.id));

          expect(thirdItem).toMatchObject(omit('id', expected));
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

      expect(firstItem.second).toBeNull();
      expect(secondItem.second).not.toBeNull();

      expect(secondItem.second).toMatchObject({
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

      expect(firstItem.third[0].fooRef).not.toBeNull();
      expect(secondItem.third[0].fooRef).not.toBeNull();
      expect(secondItem.third[1].fooRef).toBeNull();
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

      expect(body.data[0].third[0].fooRef).toBeUndefined();
    });

    test("Don't populate with object and 'f'", async () => {
      const qs = {
        populate: {
          third: 'f',
        },
      };
      const { status, body } = await rq.get(`/${schemas.contentTypes.c.pluralName}`, { qs });

      expect(status).toBe(200);
      expect(body.data).toHaveLength(2);

      expect(body.data[0].third).toBeUndefined();
    });
  });

  describe('Populate a dynamic zone', () => {
    test('Populate every component in the dynamic zone', async () => {
      const qs = {
        populate: {
          dz: {
            on: {
              'default.foo': true,
              'default.bar': true,
            },
          },
        },
      };

      const { status, body } = await rq.get(`/${schemas.contentTypes.b.pluralName}`, { qs });

      expect(status).toBe(200);
      expect(body.data).toHaveLength(2);

      fixtures.b.forEach((fixture, i) => {
        const res = body.data[i];
        const { dz } = res;

        expect(dz).toHaveLength(fixture.dz.length);
        expect(dz).toMatchObject(
          fixture.dz.map((component) => ({
            ...omit('field', component),
            id: expect.any(Number),
          }))
        );
      });
    });

    test('Populate only one component type using fragment', async () => {
      const qs = {
        populate: {
          dz: {
            on: {
              'default.foo': true,
            },
          },
        },
      };

      const { status, body } = await rq.get(`/${schemas.contentTypes.b.pluralName}`, { qs });

      expect(status).toBe(200);
      expect(body.data).toHaveLength(2);

      expect(body.data[0].dz).toHaveLength(3);
      expect(body.data[1].dz).toHaveLength(0);

      const expected = fixtures.b[0].dz
        .filter(({ __component }) => __component === 'default.foo')
        .map((component) => ({
          ...component,
          id: expect.any(Number),
        }));

      expect(body.data[0].dz).toMatchObject(expected);
    });

    test('Populate the dynamic zone with filters in fragments', async () => {
      const qs = {
        populate: {
          dz: {
            on: {
              'default.foo': {
                filters: { number: { $lt: 3 } },
              },
              'default.bar': {
                filters: { title: { $contains: 'another' } },
              },
            },
          },
        },
      };

      const { status, body } = await rq.get(`/${schemas.contentTypes.b.pluralName}`, { qs });

      expect(status).toBe(200);
      expect(body.data).toHaveLength(2);
      expect(body.data[0].dz).toHaveLength(2);
      expect(body.data[1].dz).toHaveLength(1);

      const filter = (data = []) =>
        data
          .filter(({ __component, number, title }) => {
            if (__component === 'default.foo') return number < 3;
            if (__component === 'default.bar') return title.includes('another');
            return false;
          })
          .map((component) => ({
            ...(component.__component === 'default.foo' ? component : omit('field', component)),
            id: expect.any(Number),
          }));

      expect(body.data[0].dz).toMatchObject(filter(fixtures.b[0].dz));
      expect(body.data[1].dz).toMatchObject(filter(fixtures.b[1].dz));
    });
  });
});
