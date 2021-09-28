'use strict';

const { createStrapiInstance } = require('../../../../test/helpers/strapi');
const { createContentAPIRequest } = require('../../../../test/helpers/request');
const { createTestBuilder } = require('../../../../test/helpers/builder');

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

const pluralizedModels = {
  product: 'products',
  country: 'countries',
  category: 'categories',
};

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
    name: 'product',
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
    name: 'country',
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
    name: 'category',
    description: '',
    collectionName: '',
  },
};

const components = {
  comp: {
    name: 'comp',
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
  return fixtures[name].filter(item => {
    if (['live', 'default'].includes(mode)) {
      return item.publishedAt instanceof Date;
    }
    return true;
  });
};

const lengthFor = (name, { mode = 'live' } = {}) => {
  return filterBy(name, { mode }).length;
};

const getQueryFromMode = mode => {
  if (['live', 'preview'].includes(mode)) {
    return `?publicationState=${mode}`;
  }

  return '';
};

describe('Publication State', () => {
  beforeAll(async () => {
    await builder
      .addContentType(contentTypes.country)
      .addComponent(components.comp)
      .addContentTypes([contentTypes.category, contentTypes.product])
      .addFixtures(contentTypes.country.name, fixtures.country)
      .addFixtures(contentTypes.category.name, fixtures.category)
      .addFixtures(contentTypes.product.name, f =>
        fixtures.product.map(product => ({
          name: product.name,
          categories: product.categories.map(name => f.category.find(cat => cat.name === name).id),
          comp: {
            countries: product.comp.countries.map(
              name => f.country.find(country => country.name === name).id
            ),
          },
          publishedAt: product.publishedAt,
        }))
      )
      .build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });

    Object.assign(data, builder.sanitizedFixtures(strapi));
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe.each(['default', 'live', 'preview'])('Mode: "%s"', mode => {
    describe.each(['country', 'category', 'product'])('For %s', modelName => {
      const baseUrl = `/${pluralizedModels[modelName]}`;
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
      const pluralizedModelName = pluralizedModels[contentTypes.product.name];

      beforeEach(async () => {
        const res = await rq({
          method: 'GET',
          url: `/${pluralizedModelName}?publicationState=live`,
          qs: {
            populate: ['categories', 'comp.countries'],
          },
        });

        products = res.body.data.map(res => ({ id: res.id, ...res.attributes }));
      });

      test('Payload integrity', () => {
        expect(products).toHaveLength(lengthFor(contentTypes.product.name));
      });

      test('Root level', () => {
        products.forEach(product => {
          expect(product.publishedAt).toBeISODate();
        });
      });

      // const getApiRef = id => data.product.find(product => product.id === id);

      test.todo('First level (categories)');

      //   products.forEach(({ id, categories }) => {
      //     const length = getApiRef(id).categories.filter(c => c.publishedAt !== null).length;
      //     expect(categories).toHaveLength(length);

      //     categories.forEach(category => {
      //       expect(category.publishedAt).toBeISODate();
      //     });
      //   });
      // });

      test.todo('Second level through component (countries)');

      //   products.forEach(({ id, comp: { countries } }) => {
      //     const length = getApiRef(id).comp.countries.filter(c => c.publishedAt !== null).length;
      //     expect(countries).toHaveLength(length);

      //     countries.forEach(country => {
      //       expect(country.publishedAt).toBeISODate();
      //     });
      //   });
      // });
    });
  });
});
