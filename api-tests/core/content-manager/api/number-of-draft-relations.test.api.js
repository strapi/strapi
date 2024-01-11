'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
const categories = {
  published: [],
  draft: [],
};

const productModel = {
  displayName: 'Product',
  singularName: 'product',
  pluralName: 'products',
  description: '',
  collectionName: '',
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    name: {
      type: 'string',
      required: true,
    },
    categories: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::category.category',
      targetAttribute: 'product',
    },
    onecategory: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'api::category.category',
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

const categoryModel = {
  displayName: 'Category',
  singularName: 'category',
  pluralName: 'categories',
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
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
    categories: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::category.category',
    },
    onecategory: {
      type: 'relation',
      relation: 'oneToOne',
      target: 'api::category.category',
    },
  },
};

describe('CM API - Basic', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes([categoryModel])
      .addComponent(compoModel)
      .addContentTypes([productModel])
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const {
      body: { id: idToPublish },
    } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::category.category',
      body: { name: 'Food' },
    });

    const { body: categoryPublished } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/api::category.category/${idToPublish}/actions/publish`,
    });

    categories.published.push(categoryPublished);

    const { body: categoryDraft1 } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::category.category',
      body: { name: 'Food' },
    });

    categories.draft.push(categoryDraft1);

    const { body: categoryDraft2 } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::category.category',
      body: { name: 'Food' },
    });

    categories.draft.push(categoryDraft2);
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
      url: `/content-manager/collection-types/api::product.product/${product.id}/actions/countDraftRelations`,
    });

    expect(body.data).toBe(0);
  });

  test('Return 0 for published relations only', async () => {
    const publishedId = categories.published[0].entryId;

    const { body: product } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product.product',
      body: {
        name: 'Pizza',
        onecategory: publishedId,
        categories: [publishedId],
        compo: {
          onecategory: publishedId,
          categories: [publishedId],
        },
        comporep: [{ onecategory: publishedId, categories: [publishedId] }],
        dz: [
          {
            __component: 'default.compo',
            onecategory: publishedId,
            categories: [publishedId],
          },
        ],
      },
    });

    const { body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/api::product.product/${product.id}/actions/countDraftRelations`,
    });

    expect(body.data).toBe(0);
  });

  test('Return 8 when there are 8 drafts (1 xToOne & 1 xToMany on ct, compo, comporep, dz)', async () => {
    const draftId = categories.draft[0].entryId;

    const { body: product } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product.product',
      body: {
        name: 'Pizza',
        onecategory: draftId,
        categories: [draftId],
        compo: {
          onecategory: draftId,
          categories: [draftId],
        },
        comporep: [{ onecategory: draftId, categories: [draftId] }],
        dz: [
          {
            __component: 'default.compo',
            onecategory: draftId,
            categories: [draftId],
          },
        ],
      },
    });

    const { body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/api::product.product/${product.id}/actions/countDraftRelations`,
    });

    expect(body.data).toBe(8);
  });

  test('Return 8 when there are 8 drafts (1 xToOne & 1/2 xToMany on ct, compo, comporep, dz)', async () => {
    const publishedId = categories.published[0].entryId;
    const draftId = categories.draft[0].entryId;

    const { body: product } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product.product',
      body: {
        name: 'Pizza',
        onecategory: draftId,
        categories: [publishedId],
        categories: [draftId, publishedId],
        compo: {
          onecategory: draftId,
          categories: [publishedId],
          categories: [draftId, publishedId],
        },
        comporep: [
          {
            onecategory: draftId,
            categories: [publishedId],
            categories: [draftId, publishedId],
          },
        ],
        dz: [
          {
            onecategory: draftId,
            __component: 'default.compo',
            categories: [publishedId],
            categories: [draftId, publishedId],
          },
        ],
      },
    });

    const { body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/api::product.product/${product.id}/actions/countDraftRelations`,
    });

    expect(body.data).toBe(8);
  });

  test('Return 12 when there are 12 drafts (1 xToOne & 2 xToMany on ct, compo, comporep, dz)', async () => {
    const publishedId = categories.published[0].entryId;
    const draft1Id = categories.draft[0].entryId;
    const draft2Id = categories.draft[1].entryId;

    const { body: product } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product.product',
      body: {
        name: 'Pizza',
        onecategory: draft1Id,
        categories: [publishedId],
        categories: [draft1Id, draft2Id],
        compo: {
          onecategory: draft1Id,
          categories: [publishedId],
          categories: [draft1Id, draft2Id],
        },
        comporep: [
          {
            onecategory: draft1Id,
            categories: [publishedId],
            categories: [draft1Id, draft2Id],
          },
        ],
        dz: [
          {
            onecategory: draft1Id,
            __component: 'default.compo',
            categories: [publishedId],
            categories: [draft1Id, draft2Id],
          },
        ],
      },
    });

    const { body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/api::product.product/${product.id}/actions/countDraftRelations`,
    });

    expect(body.data).toBe(12);
  });
});
