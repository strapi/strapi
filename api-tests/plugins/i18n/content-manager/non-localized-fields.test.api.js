'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const { createTestBuilder } = require('api-tests/builder');
const { set } = require('lodash/fp');

const modelsUtils = require('api-tests/models');

let strapi;
let rq;

const categoryModel = {
  kind: 'collectionType',
  collectionName: 'categories',
  displayName: 'Category',
  singularName: 'category',
  pluralName: 'categories',
  description: '',
  name: 'Category',
  draftAndPublish: true,
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    name: {
      type: 'string',
      unique: true,
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
    nonLocalized: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
    nonLocalizedCompo: {
      type: 'component',
      repeatable: false,
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
      component: 'default.compo',
    },
  },
};

const compo = (withRelations = false) => ({
  displayName: 'compo',
  category: 'default',
  attributes: {
    name: {
      type: 'string',
    },
    ...(!withRelations
      ? {}
      : {
          tag: {
            type: 'relation',
            relation: 'oneToOne',
            target: 'api::tag.tag',
          },
        }),
  },
});

const tagModel = {
  kind: 'collectionType',
  collectionName: 'tags',
  displayName: 'Tag',
  singularName: 'tag',
  pluralName: 'tags',
  description: '',
  options: {
    reviewWorkflows: false,
    draftAndPublish: true,
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
    nonLocalized: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
  },
};

const data = {
  tags: [],
};

const allLocales = [
  { code: 'ko', name: 'Korean' },
  { code: 'it', name: 'Italian' },
  { code: 'fr', name: 'French' },
  { code: 'es-AR', name: 'Spanish (Argentina)' },
];
const allLocaleCodes = allLocales.map((locale) => locale.code);

describe('i18n', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder
      .addComponent(compo(false))
      .addContentTypes([tagModel, categoryModel])
      .addFixtures('plugin::i18n.locale', [
        { name: 'Korean', code: 'ko' },
        { name: 'Italian', code: 'it' },
        { name: 'French', code: 'fr' },
        { name: 'Spanish (Argentina)', code: 'es-AR' },
      ])
      .build();

    await modelsUtils.modifyComponent(compo(true));

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    // Delete all locales that have been created
    await strapi.db.query('plugin::i18n.locale').deleteMany({ code: { $ne: 'en' } });

    await strapi.destroy();
    await builder.cleanup();
  });

  describe('Non localized fields', () => {
    let documentId = '';

    beforeAll(async () => {
      // Create a document with an entry in every locale with the localized
      // field filled in. This field can be different across locales
      const res = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/api::category.category`,
        body: {
          name: `Test`,
        },
      });
      documentId = res.body.data.documentId;

      for (const locale of allLocaleCodes) {
        await rq({
          method: 'PUT',
          url: `/content-manager/collection-types/api::category.category/${documentId}`,
          body: {
            locale,
            name: `Test ${locale}`,
          },
        });
      }

      const tagRes = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/api::tag.tag`,
        body: {
          name: `Test tag`,
        },
      });
      data.tags.push(tagRes.body.data);

      for (const locale of allLocaleCodes) {
        const localeTagRes = await rq({
          method: 'PUT',
          url: `/content-manager/collection-types/api::tag.tag/${tagRes.body.data.documentId}`,
          body: {
            locale,
            name: `Test tag ${locale}`,
          },
        });

        data.tags.push(localeTagRes.body.data);
      }
    });

    describe.each([
      [
        {
          // Test that when you update a non localized field all
          // other locales are updated accordingly
          description: 'Modify a top level non localized field',
          key: 'nonLocalized',
          action: {
            update: 'Update Test',
          },
        },
      ],
      [
        {
          // Test that when you change a field in a non localized compo, all
          // others are updated accordingly
          description: 'Modify a field within a non localized component',
          key: 'nonLocalizedCompo',
          action: {
            updateAt: [{ key: 'name', value: 'Compo Name' }],
          },
        },
      ],
      [
        {
          // Test when you change a relation to a localized CT within a non localized component, other
          // locales should not have the equivalent relation associated to them
          description: 'Connect a relation to a non localized component',
          key: 'nonLocalizedCompo',
          action: {
            connectRelationAt: 'tag',
          },
        },
      ],
    ])('', (params) => {
      describe.each([['publish'], ['unpublish + discard'], ['update']])('', (method) => {
        test(`${params.description} - Key ${params.key} - Method ${method}`, async () => {
          const isPublish = method === 'publish';
          const isUnpublish = method.includes('unpublish');

          const { key, action } = params;

          let updatedValue;
          if (action?.connectRelationAt) {
            // Connect a relation to the specified component key
            updatedValue = {
              [action.connectRelationAt]: {
                connect: [data.tags.find((tag) => tag.locale === 'en')],
              },
            };
          } else if (action?.updateAt) {
            // Update all specified keys in the related component
            updatedValue = action?.updateAt.reduce((acc, { key, value }) => {
              return set(key, `${key}::${value}::${method}`, acc);
            }, {});
          } else {
            // Update the non localized field
            updatedValue = `${key}::${action.update}::${method}`;
          }

          let res;
          if (isPublish) {
            // Publish the default locale entry
            res = await rq({
              method: 'POST',
              url: `/content-manager/collection-types/api::category.category/${documentId}/actions/publish`,
              body: {
                [key]: updatedValue,
              },
            });
          } else if (isUnpublish) {
            // Publish the default locale entry
            await rq({
              method: 'POST',
              url: `/content-manager/collection-types/api::category.category/${documentId}/actions/publish`,
              body: {
                [key]: updatedValue,
              },
            });

            let randomData;
            if (typeof updatedValue === 'string') {
              randomData = 'random';
            } else if (typeof updatedValue === 'object') {
              randomData = {};
              Object.entries(updatedValue).forEach(([key, value]) => {
                if (typeof value === 'string') {
                  randomData[key] = 'random';
                } else {
                  randomData[key] = value;
                }
              });
            }

            // Update the default locale draft entry with random data
            await rq({
              method: 'PUT',
              url: `/content-manager/collection-types/api::category.category/${documentId}`,
              body: {
                [key]: randomData,
              },
            });

            // Unpublish the default locale entry
            res = await rq({
              method: 'POST',
              url: `/content-manager/collection-types/api::category.category/${documentId}/actions/unpublish`,
              body: {
                discardDraft: true,
              },
            });
          } else {
            res = await rq({
              method: 'PUT',
              url: `/content-manager/collection-types/api::category.category/${documentId}`,
              body: {
                [key]: updatedValue,
              },
            });
          }

          if (action?.connectRelationAt) {
            // If we have connected a relation, we should expect the count to
            // equal the number of relations we have connected

            // TODO repeatables
            expect(res.body.data[key][action.connectRelationAt].count).toEqual(
              data.tags.filter((tag) => tag.locale === 'en').length
            );
          }

          for (const locale of allLocaleCodes) {
            const localeRes = await rq({
              method: 'GET',
              url: `/content-manager/collection-types/api::category.category/${documentId}?locale=${locale}`,
            });

            if (action?.connectRelationAt) {
              // Connecting a relation to the default locale should not affect
              // other locales
              expect(localeRes.body.data[key][action.connectRelationAt].count).toEqual(0);
            } else if (action?.updateAt) {
              // We have updated the default locale at a non localized
              // component field.
              // Make sure other locales have been updated in the same way. Use a fuzzy
              // match as each component will also contain ids etc.
              expect(localeRes.body.data[key]).toEqual(expect.objectContaining(updatedValue));
            } else {
              // We have updated a top level non localized field.
              // The locale should now have the same value as the default locale.
              expect(localeRes.body.data[key]).toEqual(updatedValue);
            }
          }
        });
      });
    });
  });
});
