// Test a simple default API with no relations

const { registerAndLogin } = require('../../../test/helpers/auth');
const createModelsUtils = require('../../../test/helpers/models');
const { createAuthRequest } = require('../../../test/helpers/request');

let rq;
let modelsUtils;
let data = {
  products: [],
};

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
  ],
  connection: 'default',
  name: 'product',
  description: '',
  collectionName: '',
};

describe('Simple API', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });
    await modelsUtils.createModels([product]);
  }, 60000);

  afterAll(() => modelsUtils.deleteModels(['product']), 60000);

  test('Create Products', async () => {
    const product = {
      name: 'Product 1',
      description: 'Product description',
    };
    const res = await rq({
      method: 'POST',
      url: '/products',
      body: product,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(product);
    data.products.push(res.body);
  });

  test('Read Products', async () => {
    const res = await rq({
      method: 'GET',
      url: '/products',
    });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Product 1',
          description: 'Product description',
        }),
      ])
    );
  });

  test('Update Products', async () => {
    const product = {
      name: 'Product 1 updated',
      description: 'Updated Product description',
    };
    const res = await rq({
      method: 'PUT',
      url: `/products/${data.products[0].id}`,
      body: product,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(product);
    expect(res.body.id).toEqual(data.products[0].id);
  });

  test('Delete Products', async () => {
    const res = await rq({
      method: 'DELETE',
      url: `/products/${data.products[0].id}`,
    });

    expect(res.statusCode).toBe(200);
  });
});
