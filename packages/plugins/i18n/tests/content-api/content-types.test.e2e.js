'use strict';

const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../test/helpers/request');
const { createTestBuilder } = require('../../../../../test/helpers/builder');

let strapi;
let rq;

const compoModel = {
  collectionName: 'components_default_simples',
  displayName: 'simple',
  description: '',
  icon: 'ambulance',
  attributes: {
    name: {
      type: 'string',
      required: true,
    },
    test: {
      type: 'string',
    },
  },
};

const categoryModel = {
  kind: 'collectionType',
  collectionName: 'categories',
  displayName: 'Category',
  singularName: 'category',
  pluralName: 'categories',
  description: '',
  name: 'Category',
  options: {
    draftAndPublish: false,
  },
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

const dogSchema = {
  kind: 'collectionType',
  collectionName: 'dogs',
  displayName: 'Dog',
  singularName: 'dog',
  pluralName: 'dogs',
  options: {
    draftAndPublish: false,
  },
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    name: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    description: {
      type: 'string',
    },
    categories: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::category.category',
      targetAttribute: 'dogs',
    },
    myCompo: {
      type: 'component',
      repeatable: false,
      component: 'default.simple',
    },
    myDz: {
      type: 'dynamiczone',
      components: ['default.simple'],
    },
  },
};

const dogs = [
  {
    name: 'Pilou',
    description: 'A good girl',
    myCompo: { name: 'my compo' },
    myDz: [{ name: 'my compo', __component: 'default.simple' }],
  },
];

const categories = [{ name: 'Labrador' }];

const data = {};

describe('i18n - Content API', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder
      .addComponent(compoModel)
      .addContentTypes([categoryModel, dogSchema])
      .addFixtures('plugin::i18n.locale', [
        {
          name: 'French (fr)',
          code: 'fr',
        },
      ])
      .addFixtures(dogSchema.singularName, dogs)
      .addFixtures(categoryModel.singularName, categories)
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    data.dogs = await builder.sanitizedFixturesFor(dogSchema.singularName, strapi);
    data.categories = await builder.sanitizedFixturesFor(categoryModel.singularName, strapi);
    const { body } = await rq({
      method: 'PUT',
      url: `/content-manager/collection-types/api::dog.dog/${data.dogs[0].id}`,
      body: {
        categories: [data.categories[0].id],
      },
    });
    data.dogs[0] = body;
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Test content-types', () => {
    describe('getNonLocalizedAttributes', () => {
      test('Get non localized attributes (including compo and dz)', async () => {
        const res = await rq({
          method: 'POST',
          url: '/i18n/content-manager/actions/get-non-localized-fields',
          body: {
            id: data.dogs[0].id,
            locale: 'fr',
            model: 'api::dog.dog',
          },
        });

        expect(res.body).toMatchObject({
          nonLocalizedFields: {
            description: 'A good girl',
            myCompo: { name: 'my compo', test: null },
            myDz: [
              {
                __component: 'default.simple',
                name: 'my compo',
                test: null,
              },
            ],
          },
          localizations: [{ id: 1, locale: 'en' }],
        });
      });
    });
  });
});
