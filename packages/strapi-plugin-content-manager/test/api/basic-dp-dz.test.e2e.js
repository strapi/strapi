// Test a simple default API with no relations

const _ = require('lodash');

const { registerAndLogin } = require('../../../../test/helpers/auth');
const createModelsUtils = require('../../../../test/helpers/models');
const { createAuthRequest } = require('../../../../test/helpers/request');

let rq;
let modelsUtils;
let data = {
  productsWithDzAndDP: [],
};

const compo = {
  name: 'compo',
  attributes: {
    name: {
      type: 'string',
      required: true,
    },
    description: {
      type: 'text',
      minLength: 4,
      maxLength: 30,
    },
  },
};

const productWithCompoAndDP = {
  attributes: {
    name: {
      type: 'string',
    },
    description: {
      type: 'text',
    },
    dz: {
      components: ['default.compo'],
      type: 'dynamiczone',
      required: true,
    },
  },
  connection: 'default',
  draftAndPublish: true,
  name: 'product with dz and DP',
  description: '',
  collectionName: '',
};

describe('CM API - Basic + dz + draftAndPublish', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });
    await modelsUtils.createComponent(compo);
    await modelsUtils.createContentTypes([productWithCompoAndDP]);
  }, 60000);

  afterAll(async () => {
    // clean database
    const queryString = data.productsWithDzAndDP.map((p, i) => `${i}=${p.id}`).join('&');
    await rq({
      method: 'DELETE',
      url: `/content-manager/explorer/deleteAll/application::product-with-dz-and-dp.product-with-dz-and-dp?${queryString}`,
    });

    await modelsUtils.deleteContentTypes(['product-with-dz-and-dp']);
    await modelsUtils.deleteComponent('default.compo');
  }, 60000);

  test('Create Products with compo', async () => {
    const product = {
      name: 'Product 1',
      description: 'Product description',
      dz: [
        {
          __component: 'default.compo',
          name: 'compo name',
          description: 'short',
        },
      ],
    };
    const res = await rq({
      method: 'POST',
      url: '/content-manager/explorer/application::product-with-dz-and-dp.product-with-dz-and-dp',
      body: product,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(product);
    expect(res.body.published_at).toBeNull();
    data.productsWithDzAndDP.push(res.body);
  });

  test('Read Products with compo', async () => {
    const res = await rq({
      method: 'GET',
      url: '/content-manager/explorer/application::product-with-dz-and-dp.product-with-dz-and-dp',
    });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toMatchObject(data.productsWithDzAndDP[0]);
    res.body.forEach(p => {
      expect(p.published_at).toBeNull();
    });
  });

  test('Update Products with compo', async () => {
    const product = {
      name: 'Product 1 updated',
      description: 'Updated Product description',
      dz: [
        {
          __component: 'default.compo',
          name: 'compo name updated',
          description: 'update',
        },
      ],
    };
    const res = await rq({
      method: 'PUT',
      url: `/content-manager/explorer/application::product-with-dz-and-dp.product-with-dz-and-dp/${data.productsWithDzAndDP[0].id}`,
      body: product,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(product);
    expect(res.body.id).toEqual(data.productsWithDzAndDP[0].id);
    expect(res.body.published_at).toBeNull();
    data.productsWithDzAndDP[0] = res.body;
  });

  test('Delete Products with compo', async () => {
    const res = await rq({
      method: 'DELETE',
      url: `/content-manager/explorer/application::product-with-dz-and-dp.product-with-dz-and-dp/${data.productsWithDzAndDP[0].id}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(data.productsWithDzAndDP[0]);
    expect(res.body.id).toEqual(data.productsWithDzAndDP[0].id);
    expect(res.body.published_at).toBeNull();
    data.productsWithDzAndDP.shift();
  });

  describe('validation', () => {
    describe.each(['create', 'update'])('%p', method => {
      test(`Can ${method} Products with compo - compo required - []`, async () => {
        const product = {
          name: 'Product 1',
          description: 'Product description',
          dz: [],
        };
        const res = await rq({
          method: method === 'create' ? 'POST' : 'PUT',
          url: `/content-manager/explorer/application::product-with-dz-and-dp.product-with-dz-and-dp/${
            method === 'update' ? data.productsWithDzAndDP[0].id : ''
          }`,
          body: product,
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject(product);
        data.productsWithDzAndDP.push(res.body);
      });

      test(`Can ${method} Products with compo - compo required - undefined`, async () => {
        const product = {
          name: 'Product 1',
          description: 'Product description',
        };
        const res = await rq({
          method: method === 'create' ? 'POST' : 'PUT',
          url: `/content-manager/explorer/application::product-with-dz-and-dp.product-with-dz-and-dp/${
            method === 'update' ? data.productsWithDzAndDP[0].id : ''
          }`,
          body: product,
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject(product);
        data.productsWithDzAndDP.push(res.body);
      });

      test(`Can ${method} Products with compo - minLength`, async () => {
        const product = {
          name: 'Product 1',
          description: 'Product description',
          dz: [
            {
              __component: 'default.compo',
              name: 'compo name',
              description: 'k',
            },
          ],
        };
        const res = await rq({
          method: method === 'create' ? 'POST' : 'PUT',
          url: `/content-manager/explorer/application::product-with-dz-and-dp.product-with-dz-and-dp/${
            method === 'update' ? data.productsWithDzAndDP[0].id : ''
          }`,
          body: product,
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject(product);
        data.productsWithDzAndDP.push(res.body);
      });

      test(`Cannot ${method} Products with compo - maxLength`, async () => {
        const product = {
          name: 'Product 1',
          description: 'Product description',
          dz: [
            {
              __component: 'default.compo',
              name: 'compo name',
              description: 'A very long description that exceed the min length.',
            },
          ],
        };
        const res = await rq({
          method: method === 'create' ? 'POST' : 'PUT',
          url: `/content-manager/explorer/application::product-with-dz-and-dp.product-with-dz-and-dp/${
            method === 'update' ? data.productsWithDzAndDP[0].id : ''
          }`,
          body: product,
        });

        expect(res.statusCode).toBe(400);
        expect(_.get(res.body.data, ['errors', 'dz[0].description', '0'])).toBe(
          'dz[0].description must be at most 30 characters'
        );
      });

      test(`Can ${method} Products with compo - required`, async () => {
        const product = {
          name: 'Product 1',
          description: 'Product description',
          dz: [
            {
              __component: 'default.compo',
              description: 'short',
            },
          ],
        };
        const res = await rq({
          method: method === 'create' ? 'POST' : 'PUT',
          url: `/content-manager/explorer/application::product-with-dz-and-dp.product-with-dz-and-dp/${
            method === 'update' ? data.productsWithDzAndDP[0].id : ''
          }`,
          body: product,
        });

        expect(res.statusCode).toBe(200);
        expect(res.body).toMatchObject(product);
        data.productsWithDzAndDP.push(res.body);
      });

      test(`Cannot ${method} Products with compo - missing __component`, async () => {
        const product = {
          name: 'Product 1',
          description: 'Product description',
          dz: [
            {
              name: 'Product 1',
              description: 'short',
            },
          ],
        };
        const res = await rq({
          method: method === 'create' ? 'POST' : 'PUT',
          url: `/content-manager/explorer/application::product-with-dz-and-dp.product-with-dz-and-dp/${
            method === 'update' ? data.productsWithDzAndDP[0].id : ''
          }`,
          body: product,
        });

        expect(res.statusCode).toBe(400);
        expect(_.get(res.body.data, ['errors', 'dz[0].__component', '0'])).toBe(
          'dz[0].__component is a required field'
        );
      });
    });
  });
});
