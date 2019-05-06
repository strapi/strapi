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

describe('Filtering API', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });
    await modelsUtils.createModels([product]);
  }, 60000);

  afterAll(() => modelsUtils.deleteModels(['product']), 60000);

  test('Create Fixture Products', async () => {
    for (let product of productFixtures) {
      const res = await rq({
        method: 'POST',
        url: '/products',
        body: product,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(product);
      data.products.push(res.body);
    }
  });

  describe('Basic filters', () => {
    test.todo('Filter equals');

    test.todo('Filter not equals');

    test.todo('Filter contains insensitive');

    test.todo('Filter not contains insensitive');

    test.todo('Filter contains sensitive');

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

  describe('Sorting', () => {
    test.todo('Simple sorting');
    test.todo('Multi column sorting');
  });

  describe('Limit and offset', () => {
    test.todo('Limit');
    test.todo('Offset');
  });
});
