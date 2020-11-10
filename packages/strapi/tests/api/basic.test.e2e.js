'use strict';

const { createStrapiInstance } = require('../../../../test/helpers/strapi');
const modelsUtils = require('../../../../test/helpers/models');
const { createAuthRequest } = require('../../../../test/helpers/request');

let strapi;
let rq;
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

describe('Core API - Basic', () => {
  beforeAll(async () => {
    await modelsUtils.createComponent(compo);
    await modelsUtils.createContentTypes([product]);

    strapi = await createStrapiInstance({ ensureSuperAdmin: true });
    rq = await createAuthRequest({ strapi });
  }, 60000);

  afterAll(async () => {
    await strapi.destroy();
    await modelsUtils.cleanupModel(product.name);
    await modelsUtils.deleteContentType(product.name);
    await modelsUtils.deleteComponent(`default.${compo.name}`);
  }, 60000);

  test('Create product', async () => {
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

  test('Read product', async () => {
    const res = await rq({
      method: 'GET',
      url: '/products',
    });

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(1);
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

  test('Update product', async () => {
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

  test('Delete product', async () => {
    const res = await rq({
      method: 'DELETE',
      url: `/products/${data.products[0].id}`,
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject(data.products[0]);
    expect(res.body.id).toEqual(data.products[0].id);
    expect(res.body.published_at).toBeUndefined();
    data.products.shift();
  });
});
