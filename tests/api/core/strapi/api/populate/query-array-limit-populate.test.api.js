'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest } = require('api-tests/request');

// Default qs arrayLimit in strapi::query is 100; more indexed keys yield a non-array populate value.
const INDEXED_POPULATE_COUNT = 105;

const leafContentType = {
  kind: 'collectionType',
  displayName: 'Populate array limit leaf',
  singularName: 'pop-array-limit-leaf',
  pluralName: 'pop-array-limit-leaves',
  attributes: {
    name: { type: 'string' },
  },
};

const hubAttributes = {};
for (let i = 0; i < INDEXED_POPULATE_COUNT; i += 1) {
  hubAttributes[`r${i}`] = {
    type: 'relation',
    relation: 'oneToOne',
    target: 'api::pop-array-limit-leaf.pop-array-limit-leaf',
  };
}

const hubContentType = {
  kind: 'collectionType',
  displayName: 'Populate array limit hub',
  singularName: 'pop-array-limit-hub',
  pluralName: 'pop-array-limit-hubs',
  attributes: {
    title: { type: 'string' },
    ...hubAttributes,
  },
};

function buildIndexedPopulateQuery(count) {
  const parts = [];
  for (let i = 0; i < count; i += 1) {
    parts.push(`populate[${i}]=${encodeURIComponent(`r${i}`)}`);
  }
  return parts.join('&');
}

function setQueryArrayLimit(strapi, arrayLimit) {
  const middlewares = strapi.config.get('middlewares');
  strapi.config.set(
    'middlewares',
    middlewares.map((m) => {
      if (m === 'strapi::query') {
        return { name: 'strapi::query', config: { arrayLimit } };
      }
      if (typeof m === 'object' && m && m.name === 'strapi::query') {
        return { ...m, config: { ...(m.config || {}), arrayLimit } };
      }
      return m;
    })
  );
}

const LEAF_NAME = 'populated-leaf';

async function setupBuilder() {
  const builder = createTestBuilder();
  await builder
    .addContentType(leafContentType)
    .addContentType(hubContentType)
    .addFixtures(leafContentType.singularName, [{ name: LEAF_NAME }])
    .addFixtures(hubContentType.singularName, (fixtures) => {
      const leaf = fixtures[leafContentType.singularName][0];
      return [{ title: 'hub-row', r0: leaf.id }];
    })
    .build();
  return builder;
}

describe('Content API | populate (qs arrayLimit)', () => {
  describe('strapi::query with higher arrayLimit', () => {
    let strapi;
    let rq;
    let builder;

    beforeAll(async () => {
      builder = await setupBuilder();
      strapi = await createStrapiInstance({
        register: async ({ strapi: s }) => {
          setQueryArrayLimit(s, INDEXED_POPULATE_COUNT + 50);
        },
      });
      rq = createContentAPIRequest({ strapi });
    });

    afterAll(async () => {
      if (strapi) await strapi.destroy();
      if (builder) await builder.cleanup();
    });

    test('returns populated relations when the request has more than 100 indexed populate keys', async () => {
      const res = await rq({
        method: 'GET',
        url: `/pop-array-limit-hubs?${buildIndexedPopulateQuery(INDEXED_POPULATE_COUNT)}`,
      });

      expect(res.statusCode).toBe(200);
      const hub = res.body.data.find((row) => row.title === 'hub-row');
      expect(hub).toBeDefined();
      expect(hub.r0).toEqual(expect.objectContaining({ name: LEAF_NAME }));
      expect(hub.r1).toBeNull();
    });
  });

  describe('default strapi::query', () => {
    let strapi;
    let rq;
    let builder;

    beforeAll(async () => {
      builder = await setupBuilder();
      strapi = await createStrapiInstance();
      rq = createContentAPIRequest({ strapi });
    });

    afterAll(async () => {
      if (strapi) await strapi.destroy();
      if (builder) await builder.cleanup();
    });

    test('does not return 200 when the request has more than 100 indexed populate keys', async () => {
      const res = await rq({
        method: 'GET',
        url: `/pop-array-limit-hubs?${buildIndexedPopulateQuery(INDEXED_POPULATE_COUNT)}`,
      });

      expect(res.statusCode).not.toBe(200);
    });
  });
});
