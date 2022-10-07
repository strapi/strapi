'use strict';

const { createStrapiInstance } = require('../../../../../../test/helpers/strapi');
const { createTestBuilder } = require('../../../../../../test/helpers/builder');
const { createAuthRequest } = require('../../../../../../test/helpers/request');

const builder = createTestBuilder();
let strapi;
let rq;

const product = {
  displayName: 'Product',
  singularName: 'product',
  pluralName: 'products',
  description: '',
  collectionName: '',
  attributes: {
    name: {
      type: 'string',
      required: true,
    },
    categoriesdp: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::categorydp.categorydp',
      targetAttribute: 'product',
    },
    categories: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::category.category',
      targetAttribute: 'product',
    },
    compo: {
      component: 'default.compo',
      type: 'component',
    },
    comporep: {
      component: 'default.compo',
      type: 'component',
    },
    dz: {
      components: ['default.compo'],
      type: 'dynamiczone',
    },
  },
};

const categoryDP = {
  displayName: 'Category Draft & Publish',
  singularName: 'categorydp',
  pluralName: 'categoriesdp',
  draftAndPublish: true,
  attributes: {
    name: {
      type: 'string',
      unique: true,
    },
  },
};

const category = {
  displayName: 'Category',
  singularName: 'category',
  pluralName: 'categories',
  attributes: {
    name: {
      type: 'string',
      unique: true,
    },
  },
};

const compo = {
  displayName: 'compo',
  attributes: {
    name: {
      type: 'string',
      required: true,
    },
    categoriesdp: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::categorydp.categorydp',
      targetAttribute: 'product',
    },
    categories: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::category.category',
      targetAttribute: 'product',
    },
  },
};

describe('CM API - Basic', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes([categoryDP, category])
      .addComponent(compo)
      .addContentTypes([product])
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Return 0 when no relations are set', async () => {
    const { body: product } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product.product',
      body: {
        name: 'Pizza',
      },
    });

    const { body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/api::product.product/${product.id}/actions/numberOfDraftRelations`,
    });

    expect(body.data).toBe(0);
  });
});
