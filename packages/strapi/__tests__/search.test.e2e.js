// Test an API with all the possible filed types and simple filterings (no deep filtering, no relations)
const { registerAndLogin } = require('../../../test/helpers/auth');
const createModelsUtils = require('../../../test/helpers/models');
const { createAuthRequest } = require('../../../test/helpers/request');

const databaseName = process.argv
  .find(arg => arg.startsWith('--database='))
  .replace('--database=', '');

let rq;
let modelsUtils;
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
    editPassword: {
      type: 'password',
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
    serialNumber: 2908199405091998,
    peopleNumber: 5,
    fabricThickness: 1.54567,
    editPassword: 'secretpassword',
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
    editPassword: 'subtileandhiddenpassword',
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
    editPassword: null,
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
    editPassword: null,
  },
];

async function createFixtures() {
  for (let bedFixture of bedFixtures) {
    const res = await rq({
      method: 'POST',
      url: '/beds',
      body: bedFixture,
    });

    data.beds.push(res.body);
  }
}

async function deleteFixtures() {
  for (let bed of data.beds) {
    await rq({
      method: 'DELETE',
      url: `/beds/${bed.id}`,
    });
  }
}

describe('Search query', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });
    await modelsUtils.createContentTypes([bedModel]);
    await createFixtures();
  }, 60000);

  afterAll(async () => {
    await deleteFixtures();
    await modelsUtils.deleteContentTypes(['bed']);
  }, 60000);

  test('search for "id"', async () => {
    if (databaseName === 'mongo') return; // functionnality not available for mongo, we skip test

    const res = await rq({
      method: 'GET',
      url: '/content-manager/explorer/application::bed.bed',
      qs: {
        _q: 3,
      },
    });

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toMatchObject(data.beds[2]);
  });

  test.each(Object.keys(bedFixtures[0]))('search that target column %p', async columnName => {
    const res = await rq({
      method: 'GET',
      url: '/content-manager/explorer/application::bed.bed',
      qs: {
        _q: bedFixtures[0][columnName],
      },
    });

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toMatchObject(data.beds[0]);
  });

  test('search with an empty query', async () => {
    const res = await rq({
      method: 'GET',
      url: '/content-manager/explorer/application::bed.bed',
      qs: {
        _q: '',
      },
    });

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(4);
    expect(res.body).toEqual(expect.arrayContaining(data.beds));
  });

  test('search with special characters', async () => {
    const res = await rq({
      method: 'GET',
      url: '/content-manager/explorer/application::bed.bed',
      qs: {
        _q: data.beds[3].name,
      },
    });

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toMatchObject(data.beds[3]);
  });
});
