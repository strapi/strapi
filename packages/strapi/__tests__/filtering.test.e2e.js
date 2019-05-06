// Test an API with all the possible filed types and simple filterings (no deep filtering, no relations)

const { registerAndLogin } = require('../../../test/helpers/auth');
const createModelsUtils = require('../../../test/helpers/models');
const { createAuthRequest } = require('../../../test/helpers/request');

let rq;
let modelsUtils;
let data = {
  products: [],
};

// complete list of existing fields and tests
const product = {
  attributes: [
    {
      name: 'name',
      params: {
        type: 'string',
      },
    },
    {
      name: 'description',
      params: {
        type: 'text',
      },
    },
    {
      name: 'price',
      params: {
        type: 'float',
      },
    },
    {
      name: 'decimal_field',
      params: {
        type: 'decimal',
      },
    },
    {
      name: 'rank',
      params: {
        type: 'integer',
      },
    },
    {
      name: 'big_rank',
      params: {
        type: 'biginteger',
      },
    },
  ],
  connection: 'default',
  name: 'product',
  description: '',
  collectionName: '',
};

const productFixtures = [
  {
    name: 'Product 1',
    description: 'Product description',
    price: 10.99,
    decimal_field: 42.43,
    rank: 42,
    big_rank: 345678912983,
  },
];

async function createFixtures() {
  for (let product of productFixtures) {
    const res = await rq({
      method: 'POST',
      url: '/products',
      body: product,
    });

    data.products.push(res.body);
  }
}

async function deleteFixtures() {
  for (let product of data.products) {
    await rq({
      method: 'DELETE',
      url: `/products/${product.id}`,
    });
  }
}

describe('Filtering API', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });
    await modelsUtils.createModels([product]);
    await createFixtures();
  }, 60000);

  afterAll(async () => {
    await deleteFixtures();
    await modelsUtils.deleteModels(['product']);
  }, 60000);

  describe('Basic filters', () => {
    test('Filter equals with suffix', async () => {
      const res = await rq({
        method: 'GET',
        url: '/products',
        qs: {
          name_eq: 'Product 1',
        },
      });

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0]).toMatchObject(data.products[0]);
    });

    test('Filter equals without suffix', async () => {
      const res = await rq({
        method: 'GET',
        url: '/products',
        qs: {
          name: 'Product 1',
        },
      });

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);
      expect(res.body[0]).toMatchObject(data.products[0]);
    });

    test('Filter not equals', async () => {
      const res = await rq({
        method: 'GET',
        url: '/products',
        qs: {
          name_ne: 'Product 1',
        },
      });

      expect(res.body).toEqual(
        expect.not.arrayContaining([expect.objectContaining(data.products[0])])
      );
    });

    test('Filter contains insensitive', async () => {
      const res = await rq({
        method: 'GET',
        url: '/products',
        qs: {
          name_contains: 'product',
        },
      });

      expect(res.body).toEqual(
        expect.arrayContaining([expect.objectContaining(data.products[0])])
      );
    });

    test('Filter not contains insensitive', async () => {
      const res = await rq({
        method: 'GET',
        url: '/products',
        qs: {
          name_ncontains: 'product',
        },
      });

      expect(res.body).toEqual([]);
    });

    // FIXME: Not working on sqlite due to https://www.sqlite.org/draft/pragma.html#pragma_case_sensitive_like
    test.skip('Filter contains sensitive should return empty if case does not match', async () => {
      const res = await rq({
        method: 'GET',
        url: '/products',
        qs: {
          name_containss: 'product',
        },
      });

      expect(res.body).toEqual([]);
    });

    test('Filter contains sensitive should return the entities if case matches', async () => {
      const res = await rq({
        method: 'GET',
        url: '/products',
        qs: {
          name_containss: 'Product',
        },
      });

      expect(res.body).toEqual(
        expect.arrayContaining([expect.objectContaining(data.products[0])])
      );
    });

    test.todo('Filter not contains sensitive');

    test.todo('Filter in');

    test.todo('Filter not in');

    test.todo('Filter greater than ');

    test.todo('Filter greater than or equal ');

    test.todo('Filter less than ');

    test.todo('Filter less than or equal ');
  });

  describe('Or filtering', () => {
    test.todo('Filter equals');

    test.todo('Filter not equals');

    test.todo('Filter contains insensitive');

    test.todo('Filter not contains insensitive');

    test.todo('Filter contains sensitive');

    test.todo('Filter not contains sensitive');

    test.todo('Filter greater than');

    test.todo('Filter greater than or equal');

    test.todo('Filter less than');

    test.todo('Filter less than or equal');
  });

  describe('Complexe filtering', () => {
    test.todo('Multiple time the same column');
    test.todo('Different columns');
    test.todo('Different columns with some multiple time');
  });

  describe('Sorting', () => {
    test.todo('Simple sorting');
    test.todo('Multi column sorting');
  });

  describe('Limit and offset', () => {
    test.todo('Limit');
    test.todo('Offset');
  });
});
