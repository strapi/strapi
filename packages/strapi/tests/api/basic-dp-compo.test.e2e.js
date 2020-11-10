'use strict';

const _ = require('lodash');

const { createStrapiInstance } = require('../../../../test/helpers/strapi');
const modelsUtils = require('../../../../test/helpers/models');
const { createAuthRequest } = require('../../../../test/helpers/request');

let strapi;
let rq;
let data = {
  productsWithCompoAndDP: [],
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
      minLength: 3,
      maxLength: 10,
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
    compo: {
      type: 'component',
      component: 'default.compo',
      required: true,
    },
  },
  connection: 'default',
  draftAndPublish: true,
  name: 'product-with-compo-and-dp',
  description: '',
  collectionName: '',
};

describe('Core API - Basic + compo + draftAndPublish', () => {
  beforeAll(async () => {
    await modelsUtils.createComponent(compo);
    await modelsUtils.createContentTypes([productWithCompoAndDP]);

    strapi = await createStrapiInstance({ ensureSuperAdmin: true });
    rq = await createAuthRequest({ strapi });
  }, 60000);

  afterAll(async () => {
    await strapi.destroy();
    await modelsUtils.cleanupModel(productWithCompoAndDP.name);
    await modelsUtils.deleteContentType(productWithCompoAndDP.name);
    await modelsUtils.deleteComponent(`default.${compo.name}`);
  }, 60000);

  test('Create product with compo', async () => {
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
      url: '/product-with-compo-and-dps',
      body: product,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(product);
    expect(res.body.published_at).toBeISODate();
    data.productsWithCompoAndDP.push(res.body);
  });

  test('Read product with compo', async () => {
    const res = await rq({
      method: 'GET',
      url: '/product-with-compo-and-dps',
    });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject(data.productsWithCompoAndDP[0]);
    res.body.forEach(p => {
      expect(p.published_at).toBeISODate();
    });
  });

  test('Update product with compo', async () => {
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
      url: `/product-with-compo-and-dps/${data.productsWithCompoAndDP[0].id}`,
      body: product,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(product);
    expect(res.body.id).toEqual(data.productsWithCompoAndDP[0].id);
    expect(res.body.published_at).toBeISODate();
    data.productsWithCompoAndDP[0] = res.body;
  });

  test('Delete product with compo', async () => {
    const res = await rq({
      method: 'DELETE',
      url: `/product-with-compo-and-dps/${data.productsWithCompoAndDP[0].id}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(data.productsWithCompoAndDP[0]);
    expect(res.body.id).toEqual(data.productsWithCompoAndDP[0].id);
    expect(res.body.published_at).toBeISODate();
    data.productsWithCompoAndDP.shift();
  });

  describe('validation', () => {
    test('Cannot create product with compo - compo required', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
      };
      const res = await rq({
        method: 'POST',
        url: '/product-with-compo-and-dps',
        body: product,
      });

      expect(res.statusCode).toBe(400);
      expect(_.get(res, 'body.data.errors.compo.0')).toBe('compo must be defined.');
    });

    test('Cannot create product with compo - minLength', async () => {
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
        url: '/product-with-compo-and-dps',
        body: product,
      });

      expect(res.statusCode).toBe(400);
      expect(_.get(res.body.data, ['errors', 'compo.description', '0'])).toBe(
        'compo.description must be at least 3 characters'
      );
    });

    test('Cannot create product with compo - maxLength', async () => {
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
        url: '/product-with-compo-and-dps',
        body: product,
      });

      expect(res.statusCode).toBe(400);
      expect(_.get(res.body.data, ['errors', 'compo.description', '0'])).toBe(
        'compo.description must be at most 10 characters'
      );
    });

    test('Cannot create product with compo - required', async () => {
      const product = {
        name: 'Product 1',
        description: 'Product description',
        compo: {
          description: 'short',
        },
      };
      const res = await rq({
        method: 'POST',
        url: '/product-with-compo-and-dps',
        body: product,
      });

      expect(res.statusCode).toBe(400);
      expect(_.get(res.body.data, ['errors', 'compo.name', '0'])).toBe(
        'compo.name must be defined.'
      );
    });
  });
});
