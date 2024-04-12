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
  draftAndPublish: true,
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
  draftAndPublish: true,
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

describe('CM API - Number of draft relations', () => {
  const locale = 'fr';

  beforeAll(async () => {
    await builder
      .addContentTypes([categoryModel])
      .addComponent(compoModel)
      .addContentTypes([productModel])
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const {
      body: {
        data: { documentId: idToPublish },
      },
    } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::category.category',
      body: { name: 'Food' },
    });

    const {
      body: { data: categoryPublished },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/api::category.category/${idToPublish}/actions/publish`,
    });

    categories.published.push(categoryPublished);

    const {
      body: { data: categoryDraft1 },
    } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::category.category',
      body: { name: 'Food' },
    });

    categories.draft.push(categoryDraft1);

    const {
      body: { data: categoryDraft2 },
    } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::category.category',
      body: { name: 'Food' },
    });

    categories.draft.push(categoryDraft2);

    // Create a non default locale
    await rq({
      method: 'POST',
      url: '/i18n/locales',
      body: {
        code: locale,
        name: `French (${locale})`,
        isDefault: false,
      },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Return 0 when no relations are set', async () => {
    const {
      body: { data: product },
    } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product.product',
      body: { name: 'Pizza' },
    });

    const { body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/api::product.product/${product.documentId}/actions/countDraftRelations`,
    });

    expect(body.data).toBe(0);
  });

  test('Return 0 for published relations only', async () => {
    const publishedId = categories.published[0].id;

    const {
      body: { data: product },
    } = await rq({
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
      url: `/content-manager/collection-types/api::product.product/${product.documentId}/actions/countDraftRelations`,
    });

    expect(body.data).toBe(0);
  });

  test('Return 8 when there are 8 drafts (1 xToOne & 1 xToMany on ct, compo, comporep, dz)', async () => {
    const draftId = categories.draft[0].id;

    const {
      body: { data: product },
    } = await rq({
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
      url: `/content-manager/collection-types/api::product.product/${product.documentId}/actions/countDraftRelations`,
    });

    expect(body.data).toBe(8);
  });

  test('Return 8 when there are 8 drafts (1 xToOne & 1/2 xToMany on ct, compo, comporep, dz)', async () => {
    const publishedId = categories.published[0].id;
    const draftId = categories.draft[0].id;

    const {
      body: { data: product },
    } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product.product',
      body: {
        name: 'Pizza',
        onecategory: draftId,
        categories: [draftId, publishedId],
        compo: {
          onecategory: draftId,
          categories: [draftId, publishedId],
        },
        comporep: [
          {
            onecategory: draftId,
            categories: [draftId, publishedId],
          },
        ],
        dz: [
          {
            onecategory: draftId,
            __component: 'default.compo',
            categories: [draftId, publishedId],
          },
        ],
      },
    });

    const { body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/api::product.product/${product.documentId}/actions/countDraftRelations`,
    });

    expect(body.data).toBe(8);
  });

  test('Return 12 when there are 12 drafts (1 xToOne & 2 xToMany on ct, compo, comporep, dz)', async () => {
    const publishedId = categories.published[0].id;
    const draft1Id = categories.draft[0].id;
    const draft2Id = categories.draft[1].id;

    const {
      body: { data: product },
    } = await rq({
      method: 'POST',
      url: '/content-manager/collection-types/api::product.product',
      body: {
        name: 'Pizza',
        onecategory: draft1Id,
        categories: [draft1Id, draft2Id, publishedId],
        compo: {
          onecategory: draft1Id,
          categories: [draft1Id, draft2Id],
        },
        comporep: [
          {
            onecategory: draft1Id,
            categories: [draft1Id, draft2Id],
          },
        ],
        dz: [
          {
            onecategory: draft1Id,
            __component: 'default.compo',
            categories: [draft1Id, draft2Id],
          },
        ],
      },
    });

    const { body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/api::product.product/${product.documentId}/actions/countDraftRelations`,
    });

    expect(body.data).toBe(12);
  });

  test('Return 8 when there are 8 drafts in a non default locale', async () => {
    const localeQuery = `plugins[i18n][locale]=${locale}`;

    // Create categories in a non default locale
    const {
      body: {
        data: { documentId: idToPublish },
      },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/api::category.category?${localeQuery}`,
      body: { name: 'Nourriture' },
    });

    const {
      body: { data: categoryPublished },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/api::category.category/${idToPublish}/actions/publish`,
      qs: { locale },
    });

    const {
      body: { data: categoryDraft },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/api::category.category`,
      body: { name: 'Nourriture' },
      qs: { locale },
    });

    const publishedId = categoryPublished.id;
    const draftId = categoryDraft.id;

    // Create a product in a non default locale
    const {
      body: { data: localisedProduct },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/api::product.product`,
      qs: { locale },
      body: {
        name: 'PizzaFR',
        onecategory: draftId,
        categories: [draftId, publishedId],
        compo: {
          onecategory: draftId,
          categories: [draftId, publishedId],
        },
        comporep: [
          {
            onecategory: draftId,
            categories: [draftId, publishedId],
          },
        ],
        dz: [
          {
            onecategory: draftId,
            __component: 'default.compo',
            categories: [draftId, publishedId],
          },
        ],
      },
    });

    // Ensure we can count the number of draft relations when the entry is in a non default locale
    const { body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/api::product.product/${localisedProduct.documentId}/actions/countDraftRelations`,
      qs: { locale },
    });

    expect(body.data).toBe(8);
  });
});
