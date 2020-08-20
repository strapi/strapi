// Test a simple default API with no relations

const _ = require('lodash');

const { registerAndLogin } = require('../../../test/helpers/auth');
const createModelsUtils = require('../../../test/helpers/models');
const { createAuthRequest } = require('../../../test/helpers/request');

let rq;
let modelsUtils;
let data = {
  products: [],
};

const product = {
  attributes: {
    name: {
      type: 'string',
    },
    description: {
      type: 'text',
    },
  },
  connection: 'default',
  name: 'product',
  description: '',
  collectionName: '',
};

const productWithDP = {
  attributes: {
    name: {
      type: 'string',
    },
    description: {
      type: 'text',
    },
  },
  connection: 'default',
  draftAndPublish: true,
  name: 'product with DP',
  description: '',
  collectionName: '',
};

describe('Core API', () => {
  describe('Basic', () => {
    beforeAll(async () => {
      const token = await registerAndLogin();
      rq = createAuthRequest(token);

      modelsUtils = createModelsUtils({ rq });
      await modelsUtils.createContentTypes([product]);
    }, 60000);

    afterAll(() => modelsUtils.deleteContentTypes(['product']), 60000);

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
      expect(res.body.published_at).toBeUndefined();
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
      res.body.forEach(p => expect(p.published_at).toBeUndefined());
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
      expect(res.body.published_at).toBeUndefined();
      data.products[0] = res.body;
    });

    test('Delete Products', async () => {
      const res = await rq({
        method: 'DELETE',
        url: `/products/${data.products[0].id}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(data.products[0]);
      expect(res.body.id).toEqual(data.products[0].id);
      expect(res.body.published_at).toBeUndefined();
    });
  });

  describe('basic + draftAndPublish', () => {
    beforeAll(async () => {
      const token = await registerAndLogin();
      rq = createAuthRequest(token);

      modelsUtils = createModelsUtils({ rq });
      await modelsUtils.createContentTypes([productWithDP]);
    }, 60000);

    afterAll(() => modelsUtils.deleteContentTypes(['productWithDP']), 60000);

    test('Create a product', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
      };
      const res = await rq({
        method: 'POST',
        url: '/product-with-dps',
        body: product,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(product);
      expect(res.body.published_at).not.toBeNull();
      expect(isNaN(new Date(res.body.published_at).valueOf())).toBe(false);
      data.products.push(res.body);
    });

    test('Create a product + cannot overwrite published_at', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
        published_at: '2020-08-20T10:27:55.866Z',
      };
      const res = await rq({
        method: 'POST',
        url: '/product-with-dps',
        body: product,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(_.omit(product, 'published_at'));
      expect(res.body.published_at).not.toBeNull();
      expect(res.body.published_at).not.toBe(product.published_at);
      expect(isNaN(new Date(res.body.published_at).valueOf())).toBe(false);
      data.products.push(res.body);
    });

    test('Read Products', async () => {
      const res = await rq({
        method: 'GET',
        url: '/product-with-dps',
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
      res.body.forEach(p => {
        expect(p.published_at).not.toBeNull();
        expect(isNaN(new Date(p.published_at).valueOf())).toBe(false);
      });
    });

    test('Update Products', async () => {
      const product = {
        name: 'Product 1 updated',
        description: 'Updated Product description',
      };
      const res = await rq({
        method: 'PUT',
        url: `/product-with-dps/${data.products[0].id}`,
        body: product,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(_.omit(product, 'published_at'));
      expect(res.body.id).toEqual(data.products[0].id);
      expect(res.body.published_at).not.toBe(product.published_at);
      expect(res.body.published_at).not.toBeNull();
      expect(isNaN(new Date(res.body.published_at).valueOf())).toBe(false);
      data.products[0] = res.body;
    });

    test('Update Products + cannot overwrite published_at', async () => {
      const product = {
        name: 'Product 1 updated',
        description: 'Updated Product description',
      };
      const res = await rq({
        method: 'PUT',
        url: `/product-with-dps/${data.products[0].id}`,
        body: product,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(product);
      expect(res.body.id).toEqual(data.products[0].id);
      expect(res.body.published_at).not.toBe(product.published_at);
      expect(res.body.published_at).not.toBeNull();
      expect(isNaN(new Date(res.body.published_at).valueOf())).toBe(false);
      data.products[0] = res.body;
    });

    test('Delete Products', async () => {
      const res = await rq({
        method: 'DELETE',
        url: `/product-with-dps/${data.products[0].id}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(data.products[0]);
      expect(res.body.id).toEqual(data.products[0].id);
      expect(res.body.published_at).not.toBeNull();
      expect(isNaN(new Date(res.body.published_at).valueOf())).toBe(false);
    });
  });
});
