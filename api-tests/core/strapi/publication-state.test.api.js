'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createContentAPIRequest } = require('api-tests/request');
const { createTestBuilder } = require('api-tests/builder');

const builder = createTestBuilder();
let strapi;
let rq;

const fixtures = {
  product: [
    {
      name: 'Bamboo Desk',
      categories: ['Home'],
      comp: { countries: ['France'] },
      publishedAt: null,
    },
    {
      name: 'Computer',
      categories: ['Home', 'Tech'],
      comp: { countries: ['France', 'Italy', 'Spain'] },
      publishedAt: new Date(),
    },
    {
      name: 'Burger Drone',
      categories: ['Tech', 'Food'],
      comp: { countries: ['Italy', 'Spain'] },
      publishedAt: new Date(),
    },
  ],
  category: [
    { name: 'Home', publishedAt: null },
    { name: 'Food', publishedAt: new Date() },
    { name: 'Tech', publishedAt: new Date() },
  ],
  country: [
    { name: 'France', publishedAt: new Date() },
    { name: 'Italy', publishedAt: null },
    { name: 'Spain', publishedAt: new Date() },
  ],
};

const data = { product: [], category: [], country: [] };

const contentTypes = {
  product: {
    attributes: {
      name: {
        type: 'string',
      },
      categories: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::category.category',
      },
      comp: {
        component: 'default.comp',
        type: 'component',
        required: true,
      },
    },
    draftAndPublish: true,
    displayName: 'Product',
    singularName: 'product',
    pluralName: 'products',
    description: '',
    collectionName: '',
  },
  country: {
    attributes: {
      name: {
        type: 'string',
      },
    },
    draftAndPublish: true,
    displayName: 'Country',
    singularName: 'country',
    pluralName: 'countries',
    description: '',
    collectionName: '',
  },
  category: {
    attributes: {
      name: {
        type: 'string',
      },
    },
    draftAndPublish: true,
    displayName: 'Category',
    singularName: 'category',
    pluralName: 'categories',
    description: '',
    collectionName: '',
  },
};

const components = {
  comp: {
    displayName: 'comp',
    attributes: {
      countries: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::country.country',
      },
    },
  },
};

const filterBy = (name, { mode = 'live' } = {}) => {
  return fixtures[name].filter((item) => {
    if (['live', 'default'].includes(mode)) {
      return item.publishedAt instanceof Date;
    }
    return true;
  });
};

const lengthFor = (name, { mode = 'live' } = {}) => {
  return filterBy(name, { mode }).length;
};

const getQueryFromMode = (mode) => {
  if (['live', 'preview'].includes(mode)) {
    return `?publicationState=${mode}`;
  }

  return '';
};

// TODO V5: Test new status param
describe.skip('Publication State', () => {
  beforeAll(async () => {
    await builder
      .addContentType(contentTypes.country)
      .addComponent(components.comp)
      .addContentTypes([contentTypes.category, contentTypes.product])
      .addFixtures(contentTypes.country.singularName, fixtures.country)
      .addFixtures(contentTypes.category.singularName, fixtures.category)
      .addFixtures(contentTypes.product.singularName, (f) =>
        fixtures.product.map((product) => ({
          name: product.name,
          categories: product.categories.map(
            (name) => f.category.find((cat) => cat.name === name).id
          ),
          comp: {
            countries: product.comp.countries.map(
              (name) => f.country.find((country) => country.name === name).id
            ),
          },
          publishedAt: product.publishedAt,
        }))
      )
      .build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });

    Object.assign(data, await builder.sanitizedFixtures(strapi));
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe.each(['default', 'live', 'preview'])('Mode: "%s"', (mode) => {
    describe.each(['country', 'category', 'product'])('For %s', (modelName) => {
      const baseUrl = `/${contentTypes[modelName].pluralName}`;
      const query = getQueryFromMode(mode);

      test('Can get entries', async () => {
        const res = await rq({ method: 'GET', url: `${baseUrl}${query}` });

        expect(res.body.data).toHaveLength(lengthFor(modelName, { mode }));

        expect(res.body.meta.pagination.total).toBe(lengthFor(modelName, { mode }));
      });
    });
  });

  describe('Advanced checks', () => {
    describe('Nested level of relations (live mode)', () => {
      let products;

      beforeEach(async () => {
        const res = await rq({
          method: 'GET',
          url: `/${contentTypes.product.pluralName}?publicationState=live`,
          qs: {
            populate: ['categories', 'comp.countries'],
          },
        });

        products = res.body.data;
      });

      test('Payload integrity', () => {
        expect(products).toHaveLength(lengthFor(contentTypes.product.singularName));
      });

      test('Root level', () => {
        products.forEach((product) => {
          expect(product.attributes.publishedAt).toBeISODate();
        });
      });

      test('First level (categories) to be published only', () => {
        products.forEach(({ attributes }) => {
          const categories = attributes.categories.data;

          categories.forEach((category) => {
            expect(category.attributes.publishedAt).toBeISODate();
          });
        });
      });

      test('Second level through component (countries) to be published only', () => {
        products.forEach(({ attributes }) => {
          const countries = attributes.comp.countries.data;

          countries.forEach((country) => {
            expect(country.attributes.publishedAt).toBeISODate();
          });
        });
      });
    });
  });
});
