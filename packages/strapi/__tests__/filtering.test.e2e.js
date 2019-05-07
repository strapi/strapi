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
    describe('Filter equals', () => {
      test('Should be the default filter', async () => {
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

      test('Should be usable with equal suffix', async () => {
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

      test('Should return an empty array when no match', async () => {
        const res = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            name_eq: 'Product non existant',
          },
        });

        expect(res.body).toEqual([]);
      });
    });

    describe('Filter not equals', () => {
      test('Should return an array with matching entities', async () => {
        const res = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            name_ne: 'Non existent product ',
          },
        });

        expect(res.body).toEqual(
          expect.arrayContaining(
            data.products.map(o => expect.objectContaining(o))
          )
        );
      });

      test('Should return an empty array when no match', async () => {
        const res = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            name_ne: 'Product 1',
          },
        });

        expect(res.body).toEqual(
          expect.not.arrayContaining([
            expect.objectContaining(data.products[0]),
          ])
        );
      });
    });

    describe('Filter contains insensitive', () => {
      test('Should match with insensitive case', async () => {
        const res1 = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            name_contains: 'product',
          },
        });

        expect(res1.body).toEqual(
          expect.arrayContaining(
            data.products.map(o => expect.objectContaining(o))
          )
        );

        const res2 = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            name_contains: 'PrOdUct',
          },
        });

        expect(res1.body).toEqual(res2.body);
      });

      test('Should return an empty array on no insensitive case match', async () => {
        const res = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            name_contains: 'production',
          },
        });

        expect(res.body).toEqual([]);

        const res2 = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            name_contains: 'ProdUctIon',
          },
        });

        expect(res2.body).toEqual(res.body);
      });
    });

    describe('Filter not contains insensitive', () => {
      test('Should return an array of entities on match', async () => {
        const res = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            name_ncontains: 'production',
          },
        });

        expect(res.body).toEqual(
          expect.arrayContaining(
            data.products.map(o => expect.objectContaining(o))
          )
        );

        const res2 = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            name_ncontains: 'ProdUctIon',
          },
        });

        expect(res2.body).toEqual(res.body);
      });

      test('Should return an empty array when no match', async () => {
        const res = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            name_ncontains: 'product',
          },
        });

        expect(res.body).toEqual([]);

        const res2 = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            name_ncontains: 'ProDuCt',
          },
        });

        expect(res2.body).toEqual(res.body);
      });
    });

    // FIXME: Not working on sqlite due to https://www.sqlite.org/draft/pragma.html#pragma_case_sensitive_like
    describe('Filter contains sensitive', () => {
      test.skip('Should return empty if the case does not match', async () => {
        const res = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            name_containss: 'product',
          },
        });

        expect(res.body).toEqual([]);
      });

      test('Should return the entities if the case matches', async () => {
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
    });

    // FIXME: Not working on sqlite due to https://www.sqlite.org/draft/pragma.html#pragma_case_sensitive_like
    describe('Filter not contains sensitive', () => {
      test.skip('Should return the entities if the case does not match', async () => {
        const res = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            name_ncontainss: 'product',
          },
        });

        expect(res.body).toEqual(
          expect.arrayContaining([expect.objectContaining(data.products[0])])
        );
      });

      test('Should return an empty array if the case matches', async () => {
        const res = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            name_ncontainss: 'Product',
          },
        });

        expect(res.body).toEqual([]);
      });
    });

    describe('Filter in', () => {
      test('Should return the Product with a single value', async () => {
        const res = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            rank_in: 42,
          },
        });

        expect(res.body).toEqual(
          expect.arrayContaining([expect.objectContaining(data.products[0])])
        );
      });

      test('Should return the Product with an array of values', async () => {
        const res = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            rank_in: [42, 12],
          },
        });

        expect(res.body).toEqual(
          expect.arrayContaining([expect.objectContaining(data.products[0])])
        );
      });

      test('Should return a, empty array if no values are matching', async () => {
        const res = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            rank_in: [43, 12],
          },
        });

        expect(res.body).toEqual([]);
      });
    });

    describe('Filter not in', () => {
      test('Should return an array without the values matching when a single value is provided', async () => {
        const res = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            rank_nin: 42,
          },
        });

        expect(res.body).toEqual(
          expect.not.arrayContaining([
            expect.objectContaining(data.products[0]),
          ])
        );
      });

      test('Should return an array without the values matching when an array of values is provided', async () => {
        const res = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            rank_nin: [42, 12],
          },
        });

        expect(res.body).toEqual(
          expect.not.arrayContaining([
            expect.objectContaining(data.products[0]),
          ])
        );
      });

      test('Should return an array with values that do not match the filter', async () => {
        const res = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            rank_nin: [43, 12],
          },
        });

        expect(res.body).toEqual(
          expect.arrayContaining([expect.objectContaining(data.products[0])])
        );
      });
    });

    describe('Filter greater than', () => {
      test('Should match values only greater than', async () => {
        const res = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            rank_gt: 42,
          },
        });

        expect(res.body).toEqual(
          expect.not.arrayContaining([
            expect.objectContaining(data.products[0]),
          ])
        );

        const res2 = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            rank_gt: 40,
          },
        });

        expect(res2.body).toEqual(
          expect.arrayContaining([expect.objectContaining(data.products[0])])
        );
      });

      test('Should work with integers', async () => {
        const res = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            rank_gt: 40,
          },
        });

        expect(res.body).toEqual(
          expect.arrayContaining([expect.objectContaining(data.products[0])])
        );
      });

      test('Should work with float', async () => {
        const res = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            price_gt: 9.3,
          },
        });

        expect(res.body).toEqual(
          expect.arrayContaining([expect.objectContaining(data.products[0])])
        );
      });

      test('Should work with decimal', async () => {
        const res = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            decimal_field_gt: 1.23,
          },
        });

        expect(res.body).toEqual(
          expect.arrayContaining([expect.objectContaining(data.products[0])])
        );
      });

      test('Should work with bigintegers', async () => {
        const res = await rq({
          method: 'GET',
          url: '/products',
          qs: {
            big_rank_gt: 34567891298,
          },
        });

        expect(res.body).toEqual(
          expect.arrayContaining([expect.objectContaining(data.products[0])])
        );
      });
    });

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
