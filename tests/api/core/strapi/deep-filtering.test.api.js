'use strict';

// Test an API with all the possible filed types and simple filterings (no deep filtering, no relations)
const _ = require('lodash');
const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');
const { createContentAPIRequest, transformToRESTResource } = require('api-tests/request');

const builder = createTestBuilder();
const data = {
  card: [],
  collector: [],
};
let rq;
let strapi;

const card = {
  displayName: 'Card',
  singularName: 'card',
  pluralName: 'cards',
  kind: 'collectionType',
  attributes: {
    name: {
      type: 'string',
    },
  },
};

const collector = {
  displayName: 'Collector',
  singularName: 'collector',
  pluralName: 'collectors',
  kind: 'collectionType',
  attributes: {
    name: {
      type: 'string',
    },
    age: {
      type: 'integer',
    },
    cards: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::card.card',
    },
    collector_friends: {
      type: 'relation',
      relation: 'oneToMany',
      target: '__self__',
    },
  },
};

const fixtures = {
  card: [{ name: 'Hugo LLORIS' }, { name: 'Samuel UMTITI' }, { name: 'Lucas HERNANDEZ' }],
  collector: ({ card }) => [
    {
      name: 'Bernard',
      age: 25,
      cards: [card[0].id, card[1].id],
    },
    (self) => ({
      name: 'Isabelle',
      age: 55,
      cards: [card[0].id],
      collector_friends: [self[0].id],
    }),
    (self) => ({
      name: 'Kenza',
      age: 25,
      cards: [],
      collector_friends: [self[0].id],
    }),
  ],
};

const pagination = {
  page: 1,
  pageSize: 25,
  pageCount: 1,
};

describe('Deep Filtering API', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes([card, collector])
      .addFixtures(card.singularName, fixtures.card)
      .addFixtures(collector.singularName, fixtures.collector)
      .build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });

    Object.assign(
      data,
      _.mapValues(await builder.sanitizedFixtures(strapi), (value) =>
        transformToRESTResource(value)
      )
    );
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Without search', () => {
    describe('Filter on a manyWay relation', () => {
      test('Should return 2 results', async () => {
        const res = await rq({
          method: 'GET',
          url: '/collectors',
          qs: {
            filters: { cards: { name: data.card[0].name } },
          },
        });
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.meta.pagination).toMatchObject({
          ...pagination,
          total: 2,
        });
        expect(res.body.data.length).toBe(2);
        expect(res.body.data[0]).toMatchObject(data.collector[0]);
        expect(res.body.data[1]).toMatchObject(data.collector[1]);
      });

      test('Should return 1 result', async () => {
        const res = await rq({
          method: 'GET',
          url: '/collectors',
          qs: {
            filters: { cards: { name: data.card[1].name } },
          },
        });

        expect(res.body.meta.pagination).toMatchObject({
          ...pagination,
          total: 1,
        });
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0]).toMatchObject(data.collector[0]);
      });

      test('should return 2 results when deep filtering with nested $or', async () => {
        const res = await rq({
          method: 'GET',
          url: '/collectors',
          qs: {
            filters: {
              cards: {
                $or: [
                  {
                    name: data.card[0].name,
                  },
                  {
                    name: data.card[1].name,
                  },
                ],
              },
            },
          },
        });

        expect(res.body.meta.pagination).toMatchObject({
          ...pagination,
          total: 2,
        });
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(2);
        expect(res.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining(data.collector[0]),
            expect.objectContaining(data.collector[1]),
          ])
        );
      });

      test('should return 2 results when deep filtering with $or', async () => {
        const res = await rq({
          method: 'GET',
          url: '/collectors',
          qs: {
            filters: {
              $or: [
                {
                  cards: {
                    name: data.card[0].name,
                  },
                },
                {
                  cards: {
                    name: data.card[1].name,
                  },
                },
              ],
            },
          },
        });

        expect(res.body.meta.pagination).toMatchObject({
          ...pagination,
          total: 2,
        });
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(2);
        expect(res.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining(data.collector[0]),
            expect.objectContaining(data.collector[1]),
          ])
        );
      });

      test('should return a result when deep filtering with nested $and', async () => {
        const res = await rq({
          method: 'GET',
          url: '/collectors',
          qs: {
            filters: {
              cards: {
                $and: [
                  {
                    name: {
                      $containsi: 'HUGO',
                    },
                  },
                  {
                    name: {
                      $containsi: 'LLORIS',
                    },
                  },
                ],
              },
            },
          },
        });

        expect(res.body.meta.pagination).toMatchObject({
          ...pagination,
          total: 2,
        });
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(2);
        expect(res.body.data).toEqual(
          expect.arrayContaining([
            expect.objectContaining(data.collector[0]),
            expect.objectContaining(data.collector[1]),
          ])
        );
      });

      test('should return no result when deep filtering with nested $and', async () => {
        const res = await rq({
          method: 'GET',
          url: '/collectors',
          qs: {
            filters: {
              cards: {
                $and: [
                  {
                    name: {
                      $contains: 'HUGO',
                    },
                  },
                  {
                    name: {
                      $contains: 'UMTITI',
                    },
                  },
                ],
              },
            },
          },
        });

        expect(res.body.meta.pagination).toMatchObject({
          ...pagination,
          pageCount: 0,
          total: 0,
        });
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(0);
      });
    });

    describe('Filter on a self manyWay relation', () => {
      test('Should return 2 results', async () => {
        const res = await rq({
          method: 'GET',
          url: '/collectors',
          qs: {
            filters: { collector_friends: { name: data.collector[0].name } },
          },
        });
        expect(res.body.meta.pagination).toMatchObject({
          ...pagination,
          total: 2,
        });
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(2);
        expect(res.body.data).toEqual(expect.arrayContaining(data.collector.slice(1, 3)));
      });
    });
  });

  describe('With search', () => {
    describe('Filter on a manyWay relation', () => {
      test('cards.name + empty search', async () => {
        const res = await rq({
          method: 'GET',
          url: '/collectors',
          qs: {
            filters: {
              cards: {
                name: data.card[0].name,
              },
            },
            _q: '',
          },
        });
        expect(res.body.meta.pagination).toMatchObject({
          ...pagination,
          total: 2,
        });
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(2);
        expect(res.body.data).toEqual(expect.arrayContaining(data.collector.slice(0, 2)));
      });

      // Searching by short strings could randomnly match with the document id
      test('cards.name + _q=Bernard', async () => {
        const res = await rq({
          method: 'GET',
          url: '/collectors',
          qs: {
            filters: {
              cards: {
                name: data.card[0].name,
              },
            },
            _q: 'Bernard',
          },
        });

        expect(res.body.meta.pagination).toMatchObject({
          ...pagination,
          total: 1,
        });
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0]).toMatchObject(data.collector[0]);
      });
    });

    describe('Filter on a self manyWay relation', () => {
      test('collector_friends.name + empty search', async () => {
        const res = await rq({
          method: 'GET',
          url: '/collectors',
          qs: {
            filters: {
              collector_friends: {
                name: data.collector[0].name,
              },
            },
            _q: '',
          },
        });

        expect(res.body.meta.pagination).toMatchObject({
          ...pagination,
          total: 2,
        });
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(2);
        expect(res.body.data).toEqual(expect.arrayContaining(data.collector.slice(1, 3)));
      });

      test('collector_friends.name + search isa', async () => {
        const res = await rq({
          method: 'GET',
          url: '/collectors',
          qs: {
            filters: {
              collector_friends: {
                name: data.collector[0].name,
              },
            },
            _q: 'isa',
          },
        });

        expect(res.body.meta.pagination).toMatchObject({
          ...pagination,
          total: 1,
        });
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.data.length).toBe(1);
        expect(res.body.data[0]).toMatchObject(data.collector[1]);
      });
    });
  });
});
