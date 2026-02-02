'use strict';

// Test an API with all the possible filed types and simple filtering (no deep filtering, no relations)
const _ = require('lodash');
const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');
const { createContentAPIRequest, transformToRESTResource } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
const data = { product: [] };

const getProductDataFields = (fields) => {
  return data.product.map((product) => {
    return {
      id: product.id,
      documentId: product.documentId,
      ...(fields.length > 0 ? _.pick(product, fields) : product),
    };
  });
};

const getProductAPI = async (fields) => {
  return rq({
    method: 'GET',
    url: '/products',
    qs: {
      fields,
    },
  });
};

const product = {
  attributes: {
    name: {
      type: 'string',
    },
    description: {
      type: 'text',
    },
    price: {
      type: 'float',
    },
    decimal_field: {
      type: 'decimal',
    },
    rank: {
      type: 'integer',
    },
    big_rank: {
      type: 'biginteger',
    },
    isChecked: {
      type: 'boolean',
    },
    password: {
      type: 'password',
    },
    privateField: {
      type: 'string',
      private: true,
    },
  },
  displayName: 'Product',
  singularName: 'product',
  pluralName: 'products',
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
    big_rank: '345678912983',
    isChecked: true,
    password: 'password',
    privateField: 'private',
  },
  {
    name: 'Product 2',
    description: 'Product description 2',
    price: 28.31,
    decimal_field: 91.22,
    rank: 82,
    big_rank: '926371623421',
    isChecked: false,
    password: 'password',
    privateField: 'private',
  },
];

describe('Field selection API', () => {
  beforeAll(async () => {
    await builder
      .addContentType(product)
      .addFixtures(product.singularName, productFixtures)
      .build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });

    const sanitizedFixtures = await builder.sanitizedFixtures(strapi);

    Object.assign(data, sanitizedFixtures);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Selecting fields', () => {
    describe('Selecting one field', () => {
      test('Field that exist', async () => {
        const { body } = await getProductAPI('name');
        expect(body.data).toEqual(getProductDataFields(['name']));
      });

      test('Non existing fields throw error', async () => {
        const { statusCode } = await getProductAPI('fakeField');
        expect(statusCode).toEqual(400);
      });

      test('Private fields throw error', async () => {
        const { statusCode } = await getProductAPI('privateField');
        expect(statusCode).toEqual(400);
      });

      test('Password fields throw error', async () => {
        const { statusCode } = await getProductAPI('password');
        expect(statusCode).toEqual(400);
      });
    });

    describe('Select multiple', () => {
      test('Select all fields', async () => {
        // You can select all fields by passing * or an empty fields array
        const waysToSelectAll = [[], '*'];

        for (const way of waysToSelectAll) {
          const { body } = await getProductAPI(way);
          expect(body.data).toEqual(data.product);
        }
      });

      test('Select multiple fields', async () => {
        const { body } = await getProductAPI(['name', 'description']);
        expect(body.data).toEqual(getProductDataFields(['name', 'description']));
      });
    });
  });
});
