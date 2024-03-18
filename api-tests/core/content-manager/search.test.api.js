'use strict';

// Test an API with all the possible filed types and simple filterings (no deep filtering, no relations)
const { omit } = require('lodash/fp');
const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const CREATOR_FIELDS = ['updatedBy', 'createdBy'];

const builder = createTestBuilder();
let strapi;
let rq;
const data = {
  beds: [],
};

const bedModel = {
  displayName: 'Bed',
  singularName: 'bed',
  pluralName: 'beds',
  kind: 'collectionType',
  draftAndPublish: true,
  options: {
    noStageAttribute: true,
  },
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
    documentId: 'fixture-a',
    name: 'Sleepy Bed',
    weight: 12.4,
    shortDescription: 'Is a good bed to sleep in.',
    description: '**Is a very good bed to sleep in.** We promise.',
    sku: 'sleepybed_0152',
    savEmail: 'sav@bed.fr',
    type: 'foam',
    serialNumber: '9999999999999999',
    peopleNumber: 6,
    fabricThickness: 1.14157,
    publishedAt: null,
  },
  {
    documentId: 'fixture-b',
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
    publishedAt: null,
  },
  {
    documentId: 'fixture-c',
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
    publishedAt: null,
  },
  {
    documentId: 'fixture-d',
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
    publishedAt: null,
  },
  {
    documentId: 'fixture-e',
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
    publishedAt: null,
  },
];

describe('Search query', () => {
  beforeAll(async () => {
    await builder.addContentType(bedModel).addFixtures(bedModel.singularName, bedFixtures).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    data.beds = await builder.sanitizedFixturesFor(bedModel.singularName, strapi);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Without filters', () => {
    // TODO V5: Search by id
    test.skip('search for "documentId"', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-manager/collection-types/api::bed.bed',
        qs: {
          _q: data.beds[2].documentId,
        },
      });

      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results.length).toBe(1);
      expect(res.body.results[0]).toMatchObject(data.beds[2]);
    });

    test.each(Object.keys(omit(['publishedAt', 'documentId'], bedFixtures[0])))(
      'search that target column %p',
      async (columnName) => {
        const res = await rq({
          method: 'GET',
          url: '/content-manager/collection-types/api::bed.bed',
          qs: {
            _q: bedFixtures[0][columnName],
          },
        });

        expect(Array.isArray(res.body.results)).toBe(true);
        expect(res.body.results.length).toBe(1);
        expect(res.body.results[0]).toMatchObject(data.beds[0]);
      }
    );

    test('search with an empty query', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-manager/collection-types/api::bed.bed',
        qs: {
          _q: '',
        },
      });

      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results.length).toBe(data.beds.length);
      // TODO V5: Filter out i18n fields if content type is not localized
      expect(res.body.results.map(omit([...CREATOR_FIELDS, 'localizations', 'status']))).toEqual(
        expect.arrayContaining(data.beds)
      );
    });

    test('search with special characters', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-manager/collection-types/api::bed.bed',
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
        url: '/content-manager/collection-types/api::bed.bed',
        qs: {
          _q: '',
          filters: {
            peopleNumber: { $gt: 0 },
          },
        },
      });

      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results.length).toBe(3);
      expect(res.body.results).toMatchObject([data.beds[0], data.beds[1], data.beds[4]]);
    });
    test('search with an empty query & peopleNumber > 1', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-manager/collection-types/api::bed.bed',
        qs: {
          _q: '',
          filters: {
            peopleNumber: { $gt: 1 },
          },
        },
      });

      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results.length).toBe(2);
      expect(res.body.results).toMatchObject([data.beds[0], data.beds[4]]);
    });

    test('search with an empty query & peopleNumber in [1, 6]', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-manager/collection-types/api::bed.bed',
        qs: {
          filters: {
            peopleNumber: [1, 6],
          },
          _q: '',
        },
      });

      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results.length).toBe(2);
      expect(res.body.results).toMatchObject(data.beds.slice(0, 2));
    });
    test('search for "Sleepy Bed" & peopleNumber < 7', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-manager/collection-types/api::bed.bed',
        qs: {
          _q: 'Sleepy Bed',
          filters: {
            peopleNumber: {
              $lt: 7,
            },
          },
        },
      });

      expect(Array.isArray(res.body.results)).toBe(true);
      expect(res.body.results.length).toBe(1);
      expect(res.body.results).toMatchObject([data.beds[0]]);
    });
  });
});
