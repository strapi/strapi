const _ = require('lodash');

const { registerAndLogin } = require('../../../../test/helpers/auth');
const createModelsUtils = require('../../../../test/helpers/models');
const { createAuthRequest } = require('../../../../test/helpers/request');

let rq;
let modelsUtils;
let data = {
  productsWithCompo: [],
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

const productWithCompo = {
  attributes: {
    name: {
      type: 'string',
    },
    description: {
      type: 'text',
    },
    compo: {
      component: 'default.compo',
      type: 'component',
      required: true,
    },
  },
  connection: 'default',
  name: 'product with compo',
  description: '',
  collectionName: '',
};

describe('CM API - Basic + compo', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);

    modelsUtils = createModelsUtils({ rq });
    await modelsUtils.createComponent(compo);
    await modelsUtils.createContentTypes([productWithCompo]);
  }, 60000);

  afterAll(async () => {
    await modelsUtils.deleteContentTypes(['product-with-compo']);
    await modelsUtils.deleteComponent('default.compo');
  }, 60000);

  test('Create Products with compo', async () => {
    const product = {
      name: 'Product 1',
      description: 'Product description',
      compo: {
        name: 'compo name',
        description: 'short',
      },
    };
    const res = await rq({
      method: 'POST',
      url: '/content-manager/explorer/application::product-with-compo.product-with-compo',
      body: product,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(product);
    expect(res.body.published_at).toBeUndefined();
    data.productsWithCompo.push(res.body);
  });

  test('Read Products with compo', async () => {
    const res = await rq({
      method: 'GET',
      url: '/content-manager/explorer/application::product-with-compo.product-with-compo',
    });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0]).toMatchObject(data.productsWithCompo[0]);
    res.body.forEach(p => expect(p.published_at).toBeUndefined());
  });

  test('Update Products with compo', async () => {
    const product = {
      name: 'Product 1 updated',
      description: 'Updated Product description',
      compo: {
        name: 'compo name updated',
        description: 'update',
      },
    };
    const res = await rq({
      method: 'PUT',
      url: `/content-manager/explorer/application::product-with-compo.product-with-compo/${data.productsWithCompo[0].id}`,
      body: product,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(product);
    expect(res.body.id).toEqual(data.productsWithCompo[0].id);
    expect(res.body.published_at).toBeUndefined();
    data.productsWithCompo[0] = res.body;
  });

  test('Delete Products with compo', async () => {
    const res = await rq({
      method: 'DELETE',
      url: `/content-manager/explorer/application::product-with-compo.product-with-compo/${data.productsWithCompo[0].id}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(data.productsWithCompo[0]);
    expect(res.body.id).toEqual(data.productsWithCompo[0].id);
    expect(res.body.published_at).toBeUndefined();
    data.productsWithCompo.shift();
  });

  describe('validation', () => {
    test('Cannot create Products with compo - compo required', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
      };
      const res = await rq({
        method: 'POST',
        url: '/content-manager/explorer/application::product-with-compo.product-with-compo',
        body: product,
      });

      expect(res.statusCode).toBe(400);
      expect(_.get(res, 'body.data.0.errors.compo.0')).toBe('compo must be defined.');
    });

    test('Cannot create Products with compo - minLength', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
        compo: {
          name: 'compo name',
          description: '',
        },
      };
      const res = await rq({
        method: 'POST',
        url: '/content-manager/explorer/application::product-with-compo.product-with-compo',
        body: product,
      });

      expect(res.statusCode).toBe(400);
      expect(_.get(res.body.data, ['0', 'errors', 'compo.description', '0'])).toBe(
        'compo.description must be at least 4 characters'
      );
    });

    test('Cannot create Products with compo - maxLength', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
        compo: {
          name: 'compo name',
          description: 'A very long description that exceed the min length.',
        },
      };
      const res = await rq({
        method: 'POST',
        url: '/content-manager/explorer/application::product-with-compo.product-with-compo',
        body: product,
      });

      expect(res.statusCode).toBe(400);
      expect(_.get(res.body.data, ['0', 'errors', 'compo.description', '0'])).toBe(
        'compo.description must be at most 30 characters'
      );
    });

    test('Cannot create Products with compo - required', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
        compo: {
          description: 'short',
        },
      };
      const res = await rq({
        method: 'POST',
        url: '/content-manager/explorer/application::product-with-compo.product-with-compo',
        body: product,
      });

      expect(res.statusCode).toBe(400);
      expect(_.get(res.body.data, ['0', 'errors', 'compo.name', '0'])).toBe(
        'compo.name must be defined.'
      );
    });
  });
});
