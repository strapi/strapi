'use strict';

const { registerAndLogin } = require('../../../test/helpers/auth');
const createModelsUtils = require('../../../test/helpers/models');
const { createAuthRequest } = require('../../../test/helpers/request');

let rq;
let modelsUtils;
let data = {
  raw: {
    products: [
      {
        name: 'Bamboo Desk',
        categories: ['Home'],
        comp: { countries: ['France'] },
        published: false,
      },
      {
        name: 'Computer',
        categories: ['Home', 'Tech'],
        comp: { countries: ['France', 'Italy', 'Spain'] },
        published: true,
      },
      {
        name: 'Burger Drone',
        categories: ['Tech', 'Food'],
        comp: { countries: ['Italy', 'Spain'] },
        published: true,
      },
    ],
    categories: [
      { name: 'Home', published: false },
      { name: 'Food', published: true },
      { name: 'Tech', published: true },
    ],
    countries: [
      { name: 'France', published: true },
      { name: 'Italy', published: false },
      { name: 'Spain', published: true },
    ],
  },
  api: {
    products: [],
    categories: [],
    countries: [],
  },
};

const product = {
  attributes: {
    name: {
      type: 'string',
    },
    categories: {
      nature: 'manyWay',
      target: 'application::category.category',
      unique: false,
    },
    comp: {
      component: 'default.comp',
      type: 'component',
      required: true,
    },
  },
  draftAndPublish: true,
  connection: 'default',
  name: 'product',
  description: '',
  collectionName: '',
};

const category = {
  attributes: {
    name: {
      type: 'string',
    },
  },
  draftAndPublish: true,
  connection: 'default',
  name: 'category',
  description: '',
  collectionName: '',
};

const country = {
  attributes: {
    name: {
      type: 'string',
    },
  },
  draftAndPublish: true,
  connection: 'default',
  name: 'country',
  description: '',
  collectionName: '',
};

const comp = {
  name: 'comp',
  attributes: {
    countries: {
      nature: 'manyWay',
      target: 'application::country.country',
    },
  },
};

const filterBy = (name, { mode = 'live' } = {}) => {
  return data.raw[name].filter(item => {
    if (['live', 'default'].includes(mode)) {
      return item.published;
    }

    return true;
  });
};

const lengthFor = (name, { mode = 'live' } = {}) => {
  return filterBy(name, { mode }).length;
};

const getQueryFromMode = mode => {
  if (['live', 'preview'].includes(mode)) {
    return `?_publicationState=${mode}`;
  }

  return '';
};

const transformRawToBody = (name, raw) =>
  ({
    countries: country => ({ name: country.name }),
    categories: category => ({ name: category.name }),
    products: product => ({
      name: product.name,
      categories: product.categories.map(
        name => data.api.categories.find(cat => cat.name === name).id
      ),
      comp: {
        countries: product.comp.countries.map(
          name => data.api.countries.find(country => country.name === name).id
        ),
      },
    }),
  }[name](raw));

const createFixtures = async () => {
  for (const [name, singular] of [
    ['countries', 'country'],
    ['categories', 'category'],
    ['products', 'product'],
  ]) {
    for (const rawItem of data.raw[name]) {
      const body = transformRawToBody(name, rawItem);
      let res = await rq({ method: 'POST', url: `/${name}`, body });

      if (!rawItem.published) {
        await rq({
          method: 'POST',
          url: `/content-manager/explorer/application::${singular}.${singular}/unpublish/${res.body.id}`,
        });
      }

      data.api[name].push(res.body);
    }
  }
};

describe('Publication State', () => {
  beforeAll(async () => {
    const token = await registerAndLogin();
    rq = createAuthRequest(token);
    modelsUtils = createModelsUtils({ rq });

    await modelsUtils.createContentType(country);
    await modelsUtils.createComponent(comp);
    await modelsUtils.createContentTypes([category, product]);
    await modelsUtils.cleanupContentTypes(['product', 'category', 'country']);

    await createFixtures();
  }, 60000);

  afterAll(async () => {
    await modelsUtils.cleanupContentTypes(['product', 'category', 'country']);
    await modelsUtils.deleteComponent('comp');
    await modelsUtils.deleteContentTypes(['product', 'category', 'country']);
  }, 60000);

  describe.each(['default', 'live', 'preview'])('Mode: "%s"', mode => {
    test.each(['countries', 'categories', 'products'])('For %s', async name => {
      const url = `/${name}${getQueryFromMode(mode)}`;
      const res = await rq({ method: 'GET', url });

      expect(res.body).toHaveLength(lengthFor(name, { mode }));
    });
  });

  describe('Advanced checks', () => {
    describe('Nested level of relations (live mode)', () => {
      let products;

      beforeEach(async () => {
        const res = await rq({ method: 'GET', url: '/products?_publicationState=live' });
        products = res.body;
      });

      const getApiRef = id => data.api.products.find(product => product.id === id);

      test('Payload integrity', () => {
        expect(products).toHaveLength(lengthFor('products'));
      });

      test('Root level', () => {
        products.forEach(product => {
          expect(product.published_at).toBeISODate();
        });
      });

      test('First level (categories)', () => {
        products.forEach(({ id, categories }) => {
          const length = getApiRef(id).categories.filter(c => c.published_at !== null).length;
          expect(categories).toHaveLength(length);

          categories.forEach(category => {
            expect(category.published_at).toBeISODate();
          });
        });
      });

      test('Second level through component (countries)', () => {
        products.forEach(({ id, comp: { countries } }) => {
          const length = getApiRef(id).comp.countries.filter(c => c.published_at !== null).length;
          expect(countries).toHaveLength(length);

          countries.forEach(country => {
            expect(country.published_at).toBeISODate();
          });
        });
      });
    });
  });
});
