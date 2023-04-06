'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
const data = {
  categories: [],
  categoriesdp: {
    published: [],
    draft: [],
  },
};

const productModel = {
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
    onecategorydp: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'api::categorydp.categorydp',
      targetAttribute: 'oneproduct',
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
      repeatable: true,
    },
    dz: {
      components: ['default.compo'],
      type: 'dynamiczone',
    },
  },
};

const categoryDPModel = {
  displayName: 'Category Draft & Publish',
  singularName: 'categorydp',
  pluralName: 'categoriesdp',
  draftAndPublish: true,
  attributes: {
    name: {
      type: 'string',
    },
  },
};

const categoryModel = {
  displayName: 'Category',
  singularName: 'category',
  pluralName: 'categories',
  attributes: {
    name: {
      type: 'string',
    },
  },
};

const compoModel = {
  displayName: 'compo',
  attributes: {
    name: {
      type: 'string',
    },
    categoriesdp: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::categorydp.categorydp',
    },
    categories: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::category.category',
    },
    onecategorydp: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'api::categorydp.categorydp',
    },
  },
};

describe('CM API - Basic', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes([categoryDPModel, categoryModel])
      .addComponent(compoModel)
      .addContentTypes([productModel])
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const { body: category } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::category.category',
      body: { name: 'Food' },
    });
    data.categories.push(category);

    const { body: categoryPublished } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::categorydp.categorydp',
      body: { name: 'Food' },
    });
    await rq({
      method: 'POST',
      url: `/content-manager/collection-types/api::categorydp.categorydp/${categoryPublished.id}/actions/publish`,
    });
    data.categoriesdp.published.push(categoryPublished);

    const { body: categoryDraft1 } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::categorydp.categorydp',
      body: { name: 'Food' },
    });
    data.categoriesdp.draft.push(categoryDraft1);

    const { body: categoryDraft2 } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::categorydp.categorydp',
      body: { name: 'Food' },
    });
    data.categoriesdp.draft.push(categoryDraft2);
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Return 0 when no relations are set', async () => {
    const { body: product } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product.product',
      body: { name: 'Pizza' },
    });

    const { body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/api::product.product/${product.id}/actions/numberOfDraftRelations`,
    });

    expect(body.data).toBe(0);
  });

  test('Return 0 when only relations without d&p are set', async () => {
    const { body: product } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product.product',
      body: {
        name: 'Pizza',
        onecategorydp: data.categories[0].id,
        categories: [data.categories[0].id],
        compo: {
          onecategorydp: data.categories[0].id,
          categories: [data.categories[0].id],
        },
        comporep: [{ categories: [data.categories[0].id], onecategorydp: data.categories[0].id }],
        dz: [
          {
            __component: 'default.compo',
            categories: [data.categories[0].id],
            onecategorydp: data.categories[0].id,
          },
        ],
      },
    });

    const { body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/api::product.product/${product.id}/actions/numberOfDraftRelations`,
    });

    expect(body.data).toBe(0);
  });

  test('Return 0 when relations without d&p are set & published relations only', async () => {
    const categoryId = data.categories[0].id;
    const publishedId = data.categoriesdp.published[0].id;

    const { body: product } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product.product',
      body: {
        name: 'Pizza',
        onecategorydp: publishedId,
        categories: [categoryId],
        categoriesdp: [publishedId],
        compo: {
          onecategorydp: publishedId,
          categories: [categoryId],
          categoriesdp: [publishedId],
        },
        comporep: [
          { onecategorydp: publishedId, categories: [categoryId], categoriesdp: [publishedId] },
        ],
        dz: [
          {
            __component: 'default.compo',
            onecategorydp: publishedId,
            categories: [categoryId],
            categoriesdp: [publishedId],
          },
        ],
      },
    });

    const { body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/api::product.product/${product.id}/actions/numberOfDraftRelations`,
    });

    expect(body.data).toBe(0);
  });

  test('Return 8 when there are 8 drafts (1 xToOne & 1 xToMany on ct, compo, comporep, dz)', async () => {
    const categoryId = data.categories[0].id;
    const draftId = data.categoriesdp.draft[0].id;

    const { body: product } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product.product',
      body: {
        name: 'Pizza',
        onecategorydp: draftId,
        categories: [categoryId],
        categoriesdp: [draftId],
        compo: {
          onecategorydp: draftId,
          categories: [categoryId],
          categoriesdp: [draftId],
        },
        comporep: [{ onecategorydp: draftId, categories: [categoryId], categoriesdp: [draftId] }],
        dz: [
          {
            __component: 'default.compo',
            onecategorydp: draftId,
            categories: [categoryId],
            categoriesdp: [draftId],
          },
        ],
      },
    });

    const { body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/api::product.product/${product.id}/actions/numberOfDraftRelations`,
    });

    expect(body.data).toBe(8);
  });

  test('Return 8 when there are 8 drafts (1 xToOne & 1/2 xToMany on ct, compo, comporep, dz)', async () => {
    const categoryId = data.categories[0].id;
    const draftId = data.categoriesdp.draft[0].id;

    const { body: product } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product.product',
      body: {
        name: 'Pizza',
        onecategorydp: draftId,
        categories: [categoryId],
        categoriesdp: [draftId, categoryId],
        compo: {
          onecategorydp: draftId,
          categories: [categoryId],
          categoriesdp: [draftId, categoryId],
        },
        comporep: [
          { onecategorydp: draftId, categories: [categoryId], categoriesdp: [draftId, categoryId] },
        ],
        dz: [
          {
            onecategorydp: draftId,
            __component: 'default.compo',
            categories: [categoryId],
            categoriesdp: [draftId, categoryId],
          },
        ],
      },
    });

    const { body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/api::product.product/${product.id}/actions/numberOfDraftRelations`,
    });

    expect(body.data).toBe(8);
  });

  test('Return 12 when there are 12 drafts (1 xToOne & 2 xToMany on ct, compo, comporep, dz)', async () => {
    const categoryId = data.categories[0].id;
    const draft1Id = data.categoriesdp.draft[0].id;
    const draft2Id = data.categoriesdp.draft[1].id;

    const { body: product } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product.product',
      body: {
        name: 'Pizza',
        onecategorydp: draft1Id,
        categories: [categoryId],
        categoriesdp: [draft1Id, draft2Id],
        compo: {
          onecategorydp: draft1Id,
          categories: [categoryId],
          categoriesdp: [draft1Id, draft2Id],
        },
        comporep: [
          { onecategorydp: draft1Id, categories: [categoryId], categoriesdp: [draft1Id, draft2Id] },
        ],
        dz: [
          {
            onecategorydp: draft1Id,
            __component: 'default.compo',
            categories: [categoryId],
            categoriesdp: [draft1Id, draft2Id],
          },
        ],
      },
    });

    const { body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/api::product.product/${product.id}/actions/numberOfDraftRelations`,
    });

    expect(body.data).toBe(12);
  });
});
