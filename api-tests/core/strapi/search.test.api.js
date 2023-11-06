'use strict';

// Test an API with all the possible filed types and simple filtering (no deep filtering, no relations)
const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');
const { createContentAPIRequest, transformToRESTResource } = require('api-tests/request');

const builder = createTestBuilder();
let rq;
let strapi;
const data = {
  bed: [],
};

const bedModel = {
  displayName: 'Bed',
  singularName: 'bed',
  pluralName: 'beds',
  kind: 'collectionType',
  attributes: {
    name: {
      type: 'string',
    },
    weight: {
      type: 'decimal',
    },
    shortDescription: {
      type: 'text',
    },
    description: {
      type: 'richtext',
    },
    sku: {
      type: 'uid',
    },
    savEmail: {
      type: 'email',
    },
    type: {
      enum: ['spring', 'foam', 'feather'],
      type: 'enumeration',
    },
    serialNumber: {
      type: 'biginteger',
    },
    peopleNumber: {
      type: 'integer',
    },
    fabricThickness: {
      type: 'float',
    },
  },
};

const bedFixtures = [
  {
    // will have id=1
    name: 'Sleepy Bed',
    weight: 12.4,
    shortDescription: 'Is a good bed to sleep in.',
    description: '**Is a very good bed to sleep in.** We promise.',
    sku: 'sleepybed_0152',
    savEmail: 'sav@bed.fr',
    type: 'foam',
    serialNumber: 999999999999999,
    peopleNumber: 6,
    fabricThickness: 1.14157,
  },
  {
    // will have id=2
    name: 'Tired Bed',
    weight: 11.1,
    shortDescription: 'You will never wake up again.',
    description: '**You will never wake up again.** Never.',
    sku: 'tiredbed_0001',
    savEmail: 'sav@sleep.fr',
    type: 'feather',
    serialNumber: 1111111111111111,
    peopleNumber: 1,
    fabricThickness: 1.0001,
  },
  {
    // will have id=3
    // other beds don't contain any 3 in order to find only Zombie Bed when searching 3
    name: 'Zombie Bed',
    weight: null,
    shortDescription: null,
    description: null,
    sku: null,
    savEmail: null,
    type: null,
    serialNumber: null,
    peopleNumber: null,
    fabricThickness: null,
  },
  {
    // will have id=4
    name: 'a*b_c%d\\e+f',
    weight: null,
    shortDescription: null,
    description: null,
    sku: null,
    savEmail: null,
    type: null,
    serialNumber: null,
    peopleNumber: null,
    fabricThickness: null,
  },
  {
    // will have id=5
    name: 'Tired Bed',
    weight: null,
    shortDescription: null,
    description: null,
    sku: null,
    savEmail: null,
    type: null,
    serialNumber: null,
    peopleNumber: 7,
    fabricThickness: null,
  },
];

describe('Search query', () => {
  beforeAll(async () => {
    await builder.addContentType(bedModel).addFixtures(bedModel.singularName, bedFixtures).build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });

    data.bed = await builder.sanitizedFixturesFor(bedModel.singularName, strapi);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Without filters', () => {
    test('search for "id"', async () => {
      const res = await rq({
        method: 'GET',
        url: '/beds',
        qs: {
          _q: data.bed[2].id,
        },
      });

      expect(res.body.data.length).toBe(1);

      expect(res.body.data[0]).toMatchObject(transformToRESTResource(data.bed[2]));
    });

    test.each(Object.keys(bedFixtures[0]))('search that target column %p', async (columnName) => {
      const res = await rq({
        method: 'GET',
        url: '/beds',
        qs: {
          _q: bedFixtures[0][columnName],
        },
      });

      expect(res.body.data.length).toBe(1);

      expect(res.body.data[0]).toMatchObject(transformToRESTResource(data.bed[0]));
    });

    test('search with an empty query', async () => {
      const res = await rq({
        method: 'GET',
        url: '/beds',
        qs: {
          _q: '',
        },
      });

      expect(res.body.data.length).toBe(5);
      expect(res.body.data).toEqual(
        expect.arrayContaining(data.bed.map((bed) => transformToRESTResource(bed)))
      );
      expect(res.body.meta).toMatchObject({
        pagination: {
          page: 1,
          pageSize: 25,
          pageCount: 1,
          total: 5,
        },
      });
    });

    test('search with special characters', async () => {
      const res = await rq({
        method: 'GET',
        url: '/beds',
        qs: {
          _q: data.bed[3].name,
        },
      });

      expect(res.body.data.length).toBe(1);

      expect(res.body.data[0]).toMatchObject(transformToRESTResource(data.bed[3]));
    });
  });

  describe('With filters', () => {
    test('search with an empty query & peopleNumber > 0', async () => {
      const res = await rq({
        method: 'GET',
        url: '/beds',
        qs: {
          _q: '',
          filters: {
            peopleNumber: { $gt: 0 },
          },
        },
      });

      expect(res.body.data.length).toBe(3);

      const expected = [data.bed[0], data.bed[1], data.bed[4]].map((bed) =>
        transformToRESTResource(bed)
      );

      expect(res.body.data).toEqual(expect.arrayContaining(expected));

      expect(res.body.meta).toMatchObject({
        pagination: {
          page: 1,
          pageSize: 25,
          pageCount: 1,
          total: 3,
        },
      });
    });

    test('search with an empty query & peopleNumber > 1', async () => {
      const res = await rq({
        method: 'GET',
        url: '/beds',
        qs: {
          _q: '',
          filters: {
            peopleNumber: { $gt: 1 },
          },
        },
      });

      expect(res.body.data.length).toBe(2);

      const expected = [data.bed[0], data.bed[4]].map((bed) => transformToRESTResource(bed));
      expect(res.body.data).toEqual(expect.arrayContaining(expected));
    });

    test('search with an empty query & peopleNumber in [1, 6]', async () => {
      const res = await rq({
        method: 'GET',
        url: '/beds',
        qs: {
          _q: '',
          filters: {
            peopleNumber: [1, 6],
          },
        },
      });

      expect(res.body.data.length).toBe(2);

      const expected = data.bed.slice(0, 2).map((bed) => transformToRESTResource(bed));
      expect(res.body.data).toEqual(expect.arrayContaining(expected));
    });

    test('search for "Sleepy Bed" & peopleNumber < 7', async () => {
      const res = await rq({
        method: 'GET',
        url: '/beds',
        qs: {
          _q: 'Sleepy Bed',
          filters: {
            peopleNumber: {
              $lt: 7,
            },
          },
        },
      });

      expect(res.body.data.length).toBe(1);
      expect(res.body.data[0]).toMatchObject(transformToRESTResource(data.bed[0]));
    });

    test('search with a backslash', async () => {
      const res = await rq({
        method: 'GET',
        url: '/beds',
        qs: {
          _q: 'Sleepy Bed',
          filters: {
            name: {
              $contains: 'test\\',
            },
          },
        },
      });

      expect(res.body.data.length).toBe(0);
    });
  });
});
