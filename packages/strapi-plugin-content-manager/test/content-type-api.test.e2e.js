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
      required: true,
    },
    description: {
      type: 'text',
      minLength: 3,
      maxLength: 30,
    },
  },
  connection: 'default',
  draftAndPublish: true,
  name: 'product with DP',
  description: '',
  collectionName: '',
};

describe('Content-Type API', () => {
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
        url: '/content-manager/explorer/application::product.product',
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
        url: '/content-manager/explorer/application::product.product',
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
        url: `/content-manager/explorer/application::product.product/${data.products[0].id}`,
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
        url: `/content-manager/explorer/application::product.product/${data.products[0].id}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(data.products[0]);
      expect(res.body.id).toEqual(data.products[0].id);
      expect(res.body.published_at).toBeUndefined();
    });
  });

  describe('Basic + draftAndPublish', () => {
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
        url: '/content-manager/explorer/application::product-with-dp.product-with-dp',
        body: product,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(product);
      expect(res.body.published_at).toBeNull();
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
        url: '/content-manager/explorer/application::product-with-dp.product-with-dp',
        body: product,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(_.omit(product, 'published_at'));
      expect(res.body.published_at).toBeNull();
      data.products.push(res.body);
    });

    test('Read all products', async () => {
      const res = await rq({
        method: 'GET',
        url: '/content-manager/explorer/application::product-with-dp.product-with-dp',
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
        expect(p.published_at).toBeNull();
      });
    });

    test('Update a draft', async () => {
      const product = {
        name: 'Product 1 updated',
        description: 'Updated Product description',
      };
      const res = await rq({
        method: 'PUT',
        url: `/content-manager/explorer/application::product-with-dp.product-with-dp/${data.products[0].id}`,
        body: product,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(_.omit(product, 'published_at'));
      expect(res.body.id).toEqual(data.products[0].id);
      expect(res.body.published_at).toBeNull();
      data.products[0] = res.body;
    });

    test('Update Products + cannot overwrite published_at', async () => {
      const product = {
        name: 'Product 1 updated',
        description: 'Updated Product description',
      };
      const res = await rq({
        method: 'PUT',
        url: `/content-manager/explorer/application::product-with-dp.product-with-dp/${data.products[0].id}`,
        body: product,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(product);
      expect(res.body.id).toEqual(data.products[0].id);
      expect(res.body.published_at).toBeNull();
      data.products[0] = res.body;
    });

    test('Delete a draft', async () => {
      const res = await rq({
        method: 'DELETE',
        url: `/content-manager/explorer/application::product-with-dp.product-with-dp/${data.products[0].id}`,
      });

      expect(res.statusCode).toBe(200);
      expect(res.body).toMatchObject(data.products[0]);
      expect(res.body.id).toEqual(data.products[0].id);
      expect(res.body.published_at).toBeNull();
    });

    describe('validators', () => {
      test('Can create a product - minLength', async () => {
        const product = {
          name: 'Product 1',
          description: '',
        };
        const res = await rq({
          method: 'POST',
          url: '/content-manager/explorer/application::product-with-dp.product-with-dp',
          body: product,
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject(product);
      });

      test('Can create a product - required', async () => {
        const product = {
          description: 'Product description',
        };
        const res = await rq({
          method: 'POST',
          url: '/content-manager/explorer/application::product-with-dp.product-with-dp',
          body: product,
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject({
          ...product,
          name: null,
        });
      });

      test('Cannot create a product - maxLength', async () => {
        const product = {
          name: 'Product 1',
          description: "I'm a product description that is very long. At least thirty characters.",
        };
        const res = await rq({
          method: 'POST',
          url: '/content-manager/explorer/application::product-with-dp.product-with-dp',
          body: product,
        });

        expect(res.statusCode).toBe(400);
        expect(_.get(res, 'body.data.0.errors.description.0')).toBe(
          'description must be at most 30 characters'
        );
      });
    });
  });
});
