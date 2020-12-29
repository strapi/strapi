'use strict';

const { createAuthRequest } = require('../../../../test/helpers/request');
const { createStrapiInstance } = require('../../../../test/helpers/strapi');
const { createTestBuilder } = require('../../../../test/helpers/builder');

let strapi;
let rq;
const builder = createTestBuilder();

let data = {
  stamps: [],
  collectors: [],
};

const stamp = {
  name: 'stamp',
  kind: 'collectionType',
  attributes: {
    name: {
      type: 'string',
    },
  },
};

const collector = {
  name: 'collector',
  kind: 'collectionType',
  attributes: {
    name: {
      type: 'string',
    },
    age: {
      type: 'integer',
    },
    stamps: {
      nature: 'manyWay',
      target: 'application::stamp.stamp',
      unique: false,
    },
    stamps_m2m: {
      nature: 'manyToMany',
      targetAttribute: 'collectors',
      target: 'application::stamp.stamp',
      unique: false,
      dominant: true,
    },
    stamps_one_many: {
      nature: 'oneToMany',
      targetAttribute: 'collector',
      target: 'application::stamp.stamp',
      unique: false,
    },
  },
};

const stampFixtures = [
  {
    name: '1946',
  },
  {
    name: '1947',
  },
  {
    name: '1948',
  },
];

const collectorFixtures = ({ stamp }) => [
  {
    name: 'Bernard',
    age: 25,
    stamps: [stamp[0].id, stamp[1].id],
    stamps_m2m: [stamp[0].id],
    stamps_one_many: [],
  },
  {
    name: 'Isabelle',
    age: 55,
    stamps: [stamp[0].id],
    stamps_m2m: [],
    stamps_one_many: [stamp[1].id, stamp[2].id],
  },
  {
    name: 'Emma',
    age: 23,
    stamps: [],
    stamps_m2m: [stamp[0].id, stamp[1].id],
    stamps_one_many: [stamp[0].id],
  },
];

const getCollectorByName = (collectors, name) => collectors.find(c => c.name === name);
const getStampByName = (stamps, name) => stamps.find(s => s.name === name);

describe('CM API - Count relations', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes([stamp, collector])
      .addFixtures(stamp.name, stampFixtures)
      .addFixtures(collector.name, collectorFixtures)
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    data.collectors = builder.sanitizedFixturesFor(collector.name, strapi);
    data.stamps = builder.sanitizedFixturesFor(stamp.name, strapi);
  }, 60000);

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  }, 60000);

  test('many-way', async () => {
    const res = await rq({
      method: 'GET',
      url: '/content-manager/collection-types/application::collector.collector',
    });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results).toHaveLength(3);
    expect(getCollectorByName(res.body.results, 'Bernard').stamps.count).toBe(2);
    expect(getCollectorByName(res.body.results, 'Isabelle').stamps.count).toBe(1);
    expect(getCollectorByName(res.body.results, 'Emma').stamps.count).toBe(0);
  });

  test('many-to-many (collector -> stamps)', async () => {
    const res = await rq({
      method: 'GET',
      url: '/content-manager/collection-types/application::collector.collector',
    });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results).toHaveLength(3);
    expect(getCollectorByName(res.body.results, 'Bernard').stamps_m2m.count).toBe(1);
    expect(getCollectorByName(res.body.results, 'Isabelle').stamps_m2m.count).toBe(0);
    expect(getCollectorByName(res.body.results, 'Emma').stamps_m2m.count).toBe(2);
  });

  test('many-to-many (stamp -> collectors)', async () => {
    const res = await rq({
      method: 'GET',
      url: '/content-manager/collection-types/application::stamp.stamp',
    });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results).toHaveLength(3);
    expect(getStampByName(res.body.results, '1946').collectors.count).toBe(2);
    expect(getStampByName(res.body.results, '1947').collectors.count).toBe(1);
    expect(getStampByName(res.body.results, '1948').collectors.count).toBe(0);
  });

  test('one-to-many', async () => {
    const res = await rq({
      method: 'GET',
      url: '/content-manager/collection-types/application::collector.collector',
    });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results).toHaveLength(3);
    expect(getCollectorByName(res.body.results, 'Bernard').stamps_one_many.count).toBe(0);
    expect(getCollectorByName(res.body.results, 'Isabelle').stamps_one_many.count).toBe(2);
    expect(getCollectorByName(res.body.results, 'Emma').stamps_one_many.count).toBe(1);
  });
});
