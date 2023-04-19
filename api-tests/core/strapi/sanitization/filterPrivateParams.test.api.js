'use strict';

// Test an API with all the possible filed types and simple filterings (no deep filtering, no relations)
const _ = require('lodash');
const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');
const { createContentAPIRequest, transformToRESTResource } = require('api-tests/request');

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
  card: [
    {
      name: 'Hugo LLORIS',
    },
    {
      name: 'Samuel UMTITI',
    },
    {
      name: 'Lucas HERNANDEZ',
    },
  ],
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

describe('Sanitization - Filter private params', () => {
  const builder = createTestBuilder();

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
  test('Filter by createdBy user email', async () => {
    const res = await rq({
      method: 'GET',
      url: '/collectors',
      qs: {
        filters: {
          createdBy: {
            email: {
              $eq: 'SomeRandomText',
            },
          },
        },
      },
    });

    // The filter should be completely ignored, so we should get all the collectors
    expect(res.body.meta.pagination).toMatchObject({
      ...pagination,
      total: 3,
    });
  });
});
