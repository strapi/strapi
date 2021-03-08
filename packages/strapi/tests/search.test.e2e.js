'use strict';

// Test an API with all the possible filed types and simple filtering (no deep filtering, no relations)
const { createStrapiInstance } = require('../../../test/helpers/strapi');
const { createTestBuilder } = require('../../../test/helpers/builder');
const { createAuthRequest } = require('../../../test/helpers/request');

const builder = createTestBuilder();
let rq;
let strapi;
let data = {
  bed: [],
};

const bedModel = {
  name: 'bed',
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
    await builder
      .addContentType(bedModel)
      .addFixtures(bedModel.name, bedFixtures)
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    data.bed = builder.sanitizedFixturesFor(bedModel.name, strapi);
  }, 60000);

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  }, 60000);

  describe('Without filters', () => {
    test('search for "id"', async () => {
      const res = await rq({
        method: 'GET',
        url: '/beds',
        qs: {
          _q: data.bed[2].id,
        },
      });

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0]).toMatchObject(data.bed[2]);
    });

    test.each(Object.keys(bedFixtures[0]))('search that target column %p', async columnName => {
      const res = await rq({
        method: 'GET',
        url: '/beds',
        qs: {
          _q: bedFixtures[0][columnName],
        },
      });

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0]).toMatchObject(data.bed[0]);
    });

    test('search with an empty query', async () => {
      const res = await rq({
        method: 'GET',
        url: '/beds',
        qs: {
          _q: '',
        },
      });

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(5);
      expect(res.body).toEqual(expect.arrayContaining(data.bed));
    });

    test('search with special characters', async () => {
      const res = await rq({
        method: 'GET',
        url: '/beds',
        qs: {
          _q: data.bed[3].name,
        },
      });

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0]).toMatchObject(data.bed[3]);
    });
  });

  describe('With filters', () => {
    test('search with an empty query & peopleNumber > 0', async () => {
      const res = await rq({
        method: 'GET',
        url: '/beds',
        qs: {
          _q: '',
          peopleNumber_gt: 0,
        },
      });

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(3);
      expect(res.body).toEqual(expect.arrayContaining([data.bed[0], data.bed[1], data.bed[4]]));
    });
    test('search with an empty query & peopleNumber > 1', async () => {
      const res = await rq({
        method: 'GET',
        url: '/beds',
        qs: {
          _q: '',
          peopleNumber_gt: 1,
        },
      });

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body).toEqual(expect.arrayContaining([data.bed[0], data.bed[4]]));
    });
    test('search with an empty query & peopleNumber in [1, 6]', async () => {
      const res = await rq({
        method: 'GET',
        url: '/beds?peopleNumber=1&peopleNumber=6&_q=',
      });

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
      expect(res.body).toEqual(expect.arrayContaining(data.bed.slice(0, 2)));
    });
    test('search for "Sleepy Bed" & peopleNumber < 7', async () => {
      const res = await rq({
        method: 'GET',
        url: '/beds',
        qs: {
          _q: 'Sleepy Bed',
          peopleNumber_lt: 7,
        },
      });

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0]).toMatchObject(data.bed[0]);
    });
  });
});
