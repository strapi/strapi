'use strict';

const { registerAndLogin } = require('../../../../test/helpers/auth');
const createModelsUtils = require('../../../../test/helpers/models');
const { createAuthRequest } = require('../../../../test/helpers/request');

let rq;
let modelsUtils;
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

async function createFixtures() {
  for (let stamp of stampFixtures) {
    const res = await rq({
      method: 'POST',
      url: '/stamps',
      body: stamp,
    });

    data.stamps.push(res.body);
  }

  const collectors = [
    {
      name: 'Bernard',
      age: 25,
      stamps: [data.stamps[0].id, data.stamps[1].id],
      stamps_m2m: [data.stamps[0].id],
      stamps_one_many: [],
    },
    {
      name: 'Isabelle',
      age: 55,
      stamps: [data.stamps[0].id],
      stamps_m2m: [],
      stamps_one_many: [data.stamps[1].id, data.stamps[2].id],
    },
    {
      name: 'Emma',
      age: 23,
      stamps: [],
      stamps_m2m: [data.stamps[0].id, data.stamps[1].id],
      stamps_one_many: [data.stamps[0].id],
    },
  ];
  for (const collector of collectors) {
    const res = await rq({
      method: 'POST',
      url: '/collectors',
      body: collector,
    });
    data.collectors.push(res.body);
  }
}

async function deleteFixtures() {
  for (let stamp of data.stamps) {
    await rq({
      method: 'DELETE',
      url: `/stamps/${stamp.id}`,
    });
  }
  for (let collector of data.collectors) {
    await rq({
      method: 'DELETE',
      url: `/collectors/${collector.id}`,
    });
  }
}

const getCollectorByName = (collectors, name) => collectors.find(c => c.name === name);
const getStampByName = (stamps, name) => stamps.find(s => s.name === name);

describe('CM API - Count relations', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });
    await modelsUtils.createContentTypes([stamp, collector]);
    await createFixtures();
  }, 60000);

  afterAll(async () => {
    await deleteFixtures();
    await modelsUtils.deleteContentTypes(['collector', 'stamp']);
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
