'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');
const { createContentAPIRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
const data = {
  product: [],
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
  displayName: 'product',
  singularName: 'product',
  pluralName: 'products',
  description: '',
  collectionName: '',
};

const compo = {
  displayName: 'compo',
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
    await builder.addComponent(compo).addContentType(product).build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Create product', async () => {
    const product = {
      name: 'Product 1',
      description: 'Product description',
    };
    const res = await rq({
      method: 'POST',
      url: '/products',
      body: {
        data: product,
      },
    });

    const { statusCode, body } = res;

    expect(statusCode).toBe(200);
    expect(body).toMatchObject({
      data: {
        id: expect.anything(),
        attributes: product,
      },
    });
    expect(body.data.attributes.publishedAt).toBeUndefined();

    data.product.push(body.data);
  });

  test('Read product', async () => {
    const res = await rq({
      method: 'GET',
      url: '/products',
    });

    const { statusCode, body } = res;

    expect(statusCode).toBe(200);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data).toHaveLength(1);
    expect(body.data).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: expect.anything(),
          attributes: expect.objectContaining({
            name: 'Product 1',
            description: 'Product description',
          }),
        }),
      ])
    );

    body.data.forEach((p) => {
      expect(p.attributes.publishedAt).toBeUndefined();
    });
  });

  test('Update product', async () => {
    const product = {
      name: 'Product 1 updated',
      description: 'Updated Product description',
    };
    const res = await rq({
      method: 'PUT',
      url: `/products/${data.product[0].id}`,
      body: {
        data: product,
      },
    });

    const { statusCode, body } = res;

    expect(statusCode).toBe(200);
    expect(body.data).toMatchObject({
      attributes: product,
    });

    expect(body.data.id).toEqual(data.product[0].id);
    expect(body.data.attributes.publishedAt).toBeUndefined();

    data.product[0] = res.body.data;
  });

  test('Delete product', async () => {
    const res = await rq({
      method: 'DELETE',
      url: `/products/${data.product[0].id}`,
    });

    const { statusCode, body } = res;

    expect(statusCode).toBe(200);
    expect(body.data).toMatchObject(data.product[0]);
    expect(body.data.id).toEqual(data.product[0].id);
    expect(body.data.attributes.publishedAt).toBeUndefined();
    data.product.shift();
  });
});
