'use strict';

const { createTestBuilder } = require('../../../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../../test/helpers/request');

const builder = createTestBuilder();
let strapi;
let rq;
const data = {
  productsWithDz: [],
  categories: [],
};

const compo1 = {
  displayName: 'compo1',
  attributes: {
    title: {
      type: 'string',
    },
    category: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'api::category.category',
    },
  },
};

const compo2 = {
  displayName: 'compo2',
  attributes: {
    name: {
      type: 'string',
    },
    category: {
      // same field name as in compo1 but different type
      type: 'string',
    },
    category_diff: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'api::category.category',
    },
  },
};

const compoA = {
  displayName: 'compoA',
  attributes: {
    items: {
      type: 'component',
      repeatable: false,
      component: 'default.compo1',
    },
  },
};

const compoB = {
  displayName: 'compoB',
  attributes: {
    items: {
      type: 'component',
      repeatable: false,
      component: 'default.compo2',
    },
  },
};

const category = {
  attributes: {
    name: {
      type: 'string',
    },
  },
  displayName: 'Category',
  singularName: 'category',
  pluralName: 'categories',
  description: '',
  collectionName: '',
};

const productWithDz = {
  attributes: {
    name: {
      type: 'string',
    },
    dz: {
      components: ['default.compo-a', 'default.compo-b'],
      type: 'dynamiczone',
      required: true,
    },
  },
  displayName: 'Product with dz',
  singularName: 'product-with-dz',
  pluralName: 'product-with-dzs',
  description: '',
  collectionName: '',
};

describe('CM API - Populate dz', () => {
  beforeAll(async () => {
    await builder
      .addContentType(category)
      .addComponent(compo1)
      .addComponent(compo2)
      .addComponent(compoA)
      .addComponent(compoB)
      .addContentType(productWithDz)
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Populate works in dz even with same names in different components', async () => {
    const categoryRes = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::category.category',
      body: { name: 'name' },
    });

    expect(categoryRes.status).toBe(200);

    data.categories.push(categoryRes.body);

    const productRes = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product-with-dz.product-with-dz',
      body: {
        name: 'name',
        dz: [
          {
            __component: 'default.compo-a',
            items: { id: 2, title: 'AAAA', category: data.categories[0].id },
          },
          {
            __component: 'default.compo-b',
            items: { id: 2, name: 'BBBB', category_diff: data.categories[0].id, category: 'smthg' },
          },
        ],
      },
    });

    expect(productRes.status).toBe(200);

    data.productsWithDz.push(productRes.body);

    expect(productRes.body).toMatchObject({
      name: 'name',
      dz: [
        {
          __component: 'default.compo-a',
          items: {
            title: 'AAAA',
          },
        },
        {
          __component: 'default.compo-b',
          items: {
            name: 'BBBB',
            category: 'smthg',
          },
        },
      ],
    });
  });
});
