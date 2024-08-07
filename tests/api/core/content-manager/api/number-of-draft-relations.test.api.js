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

const UID_PRODUCT = 'api::product.product';
const UID_CATEGORY = 'api::category.category';

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
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    categories: {
      type: 'relation',
      relation: 'oneToMany',
      target: UID_CATEGORY,
      targetAttribute: 'product',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    onecategory: {
      type: 'relation',
      relation: 'oneToOne',
      target: UID_CATEGORY,
      targetAttribute: 'oneproduct',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    compo: {
      component: 'default.compo',
      type: 'component',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    comporep: {
      component: 'default.compo',
      type: 'component',
      repeatable: true,
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    dz: {
      components: ['default.compo'],
      type: 'dynamiczone',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
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
      target: UID_CATEGORY,
    },
    onecategory: {
      type: 'relation',
      relation: 'oneToOne',
      target: UID_CATEGORY,
    },
  },
};

describe('CM API - Number of draft relations', () => {
  const nonDefaultLocale = 'fr';

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
      url: `/content-manager/collection-types/${UID_CATEGORY}`,
      body: { name: 'Food' },
    });

    const {
      body: { data: categoryPublished },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_CATEGORY}/${idToPublish}/actions/publish`,
    });

    categories.published.push(categoryPublished);

    const {
      body: { data: categoryDraft1 },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_CATEGORY}`,
      body: { name: 'Food' },
    });

    categories.draft.push(categoryDraft1);

    const {
      body: { data: categoryDraft2 },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_CATEGORY}`,
      body: { name: 'Food' },
    });

    categories.draft.push(categoryDraft2);

    // Create a non default locale
    await rq({
      method: 'POST',
      url: '/i18n/locales',
      body: {
        code: nonDefaultLocale,
        name: `French (${nonDefaultLocale})`,
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
      url: `/content-manager/collection-types/${UID_PRODUCT}`,
      body: { name: 'Pizza' },
    });

    const { body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/${UID_PRODUCT}/${product.documentId}/actions/countDraftRelations`,
    });

    expect(body.data).toBe(0);
  });

  test('Return 0 for published relations only', async () => {
    const publishedId = categories.published[0].id;

    const {
      body: { data: product },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_PRODUCT}`,
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
      url: `/content-manager/collection-types/${UID_PRODUCT}/${product.documentId}/actions/countDraftRelations`,
    });

    expect(body.data).toBe(0);
  });

  test('Return 8 when there are 8 drafts (1 xToOne & 1 xToMany on ct, compo, comporep, dz)', async () => {
    const draftId = categories.draft[0].id;

    const {
      body: { data: product },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_PRODUCT}`,
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
      url: `/content-manager/collection-types/${UID_PRODUCT}/${product.documentId}/actions/countDraftRelations`,
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
      url: `/content-manager/collection-types/${UID_PRODUCT}`,
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
      url: `/content-manager/collection-types/${UID_PRODUCT}/${product.documentId}/actions/countDraftRelations`,
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
      url: `/content-manager/collection-types/${UID_PRODUCT}`,
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
      url: `/content-manager/collection-types/${UID_PRODUCT}/${product.documentId}/actions/countDraftRelations`,
    });

    expect(body.data).toBe(12);
  });

  test('Return 8 when there are 8 drafts in a non default locale', async () => {
    // Create categories in a non default locale
    const {
      body: {
        data: { documentId: idToPublish },
      },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_CATEGORY}`,
      body: { name: 'Nourriture' },
      qs: { locale: nonDefaultLocale },
    });

    const {
      body: { data: categoryPublished },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_CATEGORY}/${idToPublish}/actions/publish`,
      qs: { locale: nonDefaultLocale },
    });

    const {
      body: { data: categoryDraft },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_CATEGORY}`,
      body: { name: 'Nourriture' },
      qs: { locale: nonDefaultLocale },
    });

    const publishedId = categoryPublished.id;
    const draftId = categoryDraft.id;

    // Create a product in a non default locale
    const {
      body: { data: localisedProduct },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_PRODUCT}`,
      qs: { locale: nonDefaultLocale },
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
      url: `/content-manager/collection-types/${UID_PRODUCT}/${localisedProduct.documentId}/actions/countDraftRelations`,
      qs: { locale: nonDefaultLocale },
    });

    expect(body.data).toBe(8);
  });

  test('Correctly count the number of draft relations across multiple locales and document IDs', async () => {
    // Reset the database and create new data for this test
    await strapi.query(UID_PRODUCT).deleteMany({});
    await strapi.query(UID_CATEGORY).deleteMany({});

    // Create multiple new categories and products
    const categories = await Promise.all([
      rq({
        method: 'POST',
        url: `/content-manager/collection-types/${UID_CATEGORY}`,
        body: { name: 'New Draft Category 1' },
      }),
      rq({
        method: 'POST',
        url: `/content-manager/collection-types/${UID_CATEGORY}`,
        body: { name: 'New Draft Category 2' },
      }),
      rq({
        method: 'POST',
        url: `/content-manager/collection-types/${UID_CATEGORY}`,
        body: { name: 'New Draft Category 3' },
      }),
    ]);

    const categoryIds = categories.map(({ body: { data } }) => data.id);

    const p1 = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_PRODUCT}`,
      body: {
        name: 'New Product 1',
        categories: [categoryIds[0]],
      },
    });

    // Given products have a oneToMany relation with categories, adding categoryIds[0] here // steals the relation from p1. Hence why we are expecting totalDraftRelations to equal 3 below

    const p2 = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_PRODUCT}`,
      body: {
        name: 'New Product 2',
        categories: [categoryIds[1], categoryIds[0]],
      },
    });

    const p3 = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID_PRODUCT}`,
      body: {
        name: 'New Product 3',
        categories: [categoryIds[2]],
      },
    });

    const products = [p1, p2, p3];

    const productIds = products.map(({ body: { data } }) => data.documentId);

    // Count draft relations for each new product
    const counts = await Promise.all(
      productIds.map((documentId) =>
        rq({
          method: 'GET',
          url: `/content-manager/collection-types/${UID_PRODUCT}/${documentId}/actions/countDraftRelations`,
        })
      )
    );

    const totalDraftRelations = counts.reduce((acc, { body }) => acc + body.data, 0);

    expect(totalDraftRelations).toBe(3);
  });
});
