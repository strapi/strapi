'use strict';

// Test an API with all the possible filed types and simple filterings (no deep filtering, no relations)
const { omit } = require('lodash/fp');
const { createTestBuilder } = require('../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../test/helpers/request');

const CREATOR_FIELDS = ['updated_by', 'created_by'];

const builder = createTestBuilder();
let strapi;
let rq;
let data = {
  beds: [],
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
    name: 'Sleepy Bed',
    weight: 12.4,
    shortDescription: 'Is a good bed to sleep in.',
    description: '**Is a very good bed to sleep in.** We promise.',
    sku: 'sleepybed_0152',
    savEmail: 'sav@bed.fr',
    type: 'foam',
    serialNumber: 9999999999999999,
    peopleNumber: 6,
    fabricThickness: 1.14157,
  },
  {
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

    data.beds = builder.sanitizedFixturesFor(bedModel.name, strapi);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Without filters', () => {
    test('search for "id"', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-manager/collection-types/application::bed.bed',
        qs: {
          _q: data.beds[2].id,
        },
      });

      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results.length).toBe(1);
      expect(res.body.results[0]).toMatchObject(data.beds[2]);
    });

    test.each(Object.keys(bedFixtures[0]))('search that target column %p', async columnName => {
      const res = await rq({
        method: 'GET',
        url: '/content-manager/collection-types/application::bed.bed',
        qs: {
          _q: bedFixtures[0][columnName],
        },
      });

      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results.length).toBe(1);
      expect(res.body.results[0]).toMatchObject(data.beds[0]);
    });

    test('search with an empty query', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-manager/collection-types/application::bed.bed',
        qs: {
          _q: '',
        },
      });

      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results.length).toBe(data.beds.length);
      expect(res.body.results.map(omit(CREATOR_FIELDS))).toEqual(expect.arrayContaining(data.beds));
    });

    test('search with special characters', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-manager/collection-types/application::bed.bed',
        qs: {
          _q: data.beds[3].name,
        },
      });

      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results.length).toBe(1);
      expect(res.body.results[0]).toMatchObject(data.beds[3]);
    });
  });

  describe('With filters', () => {
    test('search with an empty query & peopleNumber > 0', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-manager/collection-types/application::bed.bed',
        qs: {
          _q: '',
          peopleNumber_gt: 0,
        },
      });

      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results.length).toBe(3);
      expect(res.body.results).toMatchObject([data.beds[0], data.beds[1], data.beds[4]]);
    });
    test('search with an empty query & peopleNumber > 1', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-manager/collection-types/application::bed.bed',
        qs: {
          _q: '',
          peopleNumber_gt: 1,
        },
      });

      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results.length).toBe(2);
      expect(res.body.results).toMatchObject([data.beds[0], data.beds[4]]);
    });
    test('search with an empty query & peopleNumber in [1, 6]', async () => {
      const res = await rq({
        method: 'GET',
        url:
          '/content-manager/collection-types/application::bed.bed?peopleNumber=1&peopleNumber=6&_q=',
      });

      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results.length).toBe(2);
      expect(res.body.results).toMatchObject(data.beds.slice(0, 2));
    });
    test('search for "Sleepy Bed" & peopleNumber < 7', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-manager/collection-types/application::bed.bed',
        qs: {
          _q: 'Sleepy Bed',
          peopleNumber_lt: 7,
        },
      });

      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results.length).toBe(1);
      expect(res.body.results).toMatchObject([data.beds[0]]);
    });
  });
});
