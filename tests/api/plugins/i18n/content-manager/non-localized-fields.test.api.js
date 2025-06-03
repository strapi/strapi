'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const { createTestBuilder } = require('api-tests/builder');
const { set } = require('lodash/fp');

const modelsUtils = require('api-tests/models');
const { cloneDeep } = require('lodash');

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
      component: 'default.compo',
      type: 'component',
      repeatable: false,
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
    nonLocalizedRepeatableCompo: {
      component: 'default.compo',
      type: 'component',
      repeatable: true,
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
  },
};

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

// Make the tags available in all locales except one so we can test relation cases
// when the locale relation does not exist
const tagsAvailableIn = allLocaleCodes.slice(1);

const transformConnectToDisconnect = (data) => {
  const transformObject = (obj) => {
    if (obj.tag && obj.tag.connect) {
      obj.tag.disconnect = obj.tag.connect;
      delete obj.tag.connect;
    }
  };

  if (Array.isArray(data)) {
    data.forEach((item) => transformObject(item));
  } else if (typeof data === 'object' && data !== null) {
    transformObject(data);
  }

  return data;
};

const create = async (uid, payload) => {
  return rq({
    method: 'POST',
    url: `/content-manager/collection-types/${uid}`,
    body: payload,
  });
};

const update = async (uid, documentId, payload) => {
  return rq({
    method: 'PUT',
    url: `/content-manager/collection-types/${uid}/${documentId}`,
    body: payload,
  });
};

const publish = async (uid, documentId, payload) => {
  return rq({
    method: 'POST',
    url: `/content-manager/collection-types/${uid}/${documentId}/actions/publish`,
    body: payload,
  });
};

const unpublish = async (uid, documentId, payload) => {
  return rq({
    method: 'POST',
    url: `/content-manager/collection-types/${uid}/${documentId}/actions/unpublish`,
    body: payload,
  });
};

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
      const res = await create('api::category.category', { name: `Test` });
      documentId = res.body.data.documentId;

      for (const locale of allLocaleCodes) {
        await update('api::category.category', documentId, {
          locale,
          name: `Test ${locale}`,
        });
      }

      // Create 2 tags in the default locale
      const [tag1, tag2] = await Promise.all([
        create('api::tag.tag', { name: `Test tag` }),
        create('api::tag.tag', { name: `Test tag 2` }),
      ]);
      data.tags.push(tag1.body.data);
      data.tags.push(tag2.body.data);

      for (const locale of tagsAvailableIn) {
        // Create 2 tags for every other locale that supports tags
        const [localeTag1, localeTag2] = await Promise.all([
          update('api::tag.tag', tag1.body.data.documentId, {
            locale,
            name: `Test tag ${locale}`,
          }),
          update('api::tag.tag', tag2.body.data.documentId, {
            locale,
            name: `Test tag ${locale} 2`,
          }),
        ]);

        data.tags.push(localeTag1.body.data);
        data.tags.push(localeTag2.body.data);
      }
    });

    // Test non localized behaviour across these actions
    const actionsToTest = [['publish'], ['unpublish + discard'], ['update']];

    describe('Scalar non localized fields', () => {
      const attribute = 'nonLocalized';

      test('Modify a scalar non localized field - Publish', async () => {
        const res = await publish('api::category.category', documentId, { [attribute]: 'publish' });

        expect(res.statusCode).toBe(200);

        // Expect all locales to be updates, both draft and published versions
        for (const locale of allLocaleCodes) {
          const localeRes = await strapi.db.query('api::category.category').findOne({
            where: {
              documentId,
              publishedAt: null,
              locale: { $eq: locale },
            },
          });

          // The locale should now have the same value as the default locale.
          expect(localeRes[attribute]).toEqual('publish');
        }
      });

      test('Modify a scalar non localized field - Unpublish + Discard', async () => {
        // Publish the default locale entry
        let res = await publish('api::category.category', documentId, { [attribute]: 'unpublish' });
        expect(res.statusCode).toBe(200);

        // Update the default locale draft entry with random data
        const randomData = 'random';
        res = await update('api::category.category', documentId, { [attribute]: randomData });
        expect(res.statusCode).toBe(200);

        // Unpublish the default locale entry
        res = await unpublish('api::category.category', documentId, { discardDraft: true });

        expect(res.statusCode).toBe(200);

        // Expect all locales to be updates, both draft and published versions
        for (const locale of allLocaleCodes) {
          const localeRes = await strapi.db.query('api::category.category').findOne({
            where: {
              documentId,
              publishedAt: null,
              locale: { $eq: locale },
            },
          });

          // The locale should now have the same value as the default locale.
          expect(localeRes[attribute]).toEqual('unpublish');
        }
      });

      test('Modify a scalar non localized field - Update', async () => {
        const updatedValue = 'update';

        const res = await update('api::category.category', documentId, {
          [attribute]: updatedValue,
        });

        expect(res.statusCode).toBe(200);

        // Expect all locales to be updates, both draft and published versions
        for (const locale of allLocaleCodes) {
          const localeRes = await strapi.db.query('api::category.category').findOne({
            where: {
              documentId,
              publishedAt: null,
              locale: { $eq: locale },
            },
          });

          // The locale should now have the same value as the default locale.
          expect(localeRes[attribute]).toEqual(updatedValue);
        }
      });
    });

    describe('Scalar field within a non localized component', () => {
      describe.each(actionsToTest)('', (method) => {
        test(`Modify a scalar field within a non localized component - Method ${method}`, async () => {
          const isPublish = method === 'publish';
          const isUnpublish = method.includes('unpublish');

          const key = 'nonLocalizedCompo';
          const updateAt = [{ key: 'name', value: 'Compo Name' }];

          const updatedValue = updateAt.reduce((acc, { key, value }) => {
            return set(key, `${key}::${value}::${method}`, acc);
          }, {});

          if (isPublish) {
            // Publish the default locale entry
            await rq({
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

            let randomData = {};
            Object.entries(updatedValue).forEach(([key, value]) => {
              if (typeof value === 'string') {
                randomData[key] = 'random';
              } else {
                randomData[key] = value;
              }
            });

            // Update the default locale draft entry with random data
            await rq({
              method: 'PUT',
              url: `/content-manager/collection-types/api::category.category/${documentId}`,
              body: {
                [key]: randomData,
              },
            });

            // Unpublish the default locale entry
            await rq({
              method: 'POST',
              url: `/content-manager/collection-types/api::category.category/${documentId}/actions/unpublish`,
              body: {
                discardDraft: true,
              },
            });
          } else {
            await rq({
              method: 'PUT',
              url: `/content-manager/collection-types/api::category.category/${documentId}`,
              body: {
                [key]: updatedValue,
              },
            });
          }

          for (const locale of allLocaleCodes) {
            const localeRes = await strapi.db.query('api::category.category').findOne({
              where: {
                documentId,
                publishedAt: null,
                locale: { $eq: locale },
              },
              populate: [key],
            });

            // Make sure non localized component fields in other locales have been updated in the same way.
            expect(localeRes[key]).toEqual(expect.objectContaining(updatedValue));
          }
        });
      });
    });

    describe.each([false, true])('', (isRepeatable) => {
      describe('Relation within a non localized component', () => {
        describe.each(actionsToTest)('', (method) => {
          test(`Modify a relation within a non localized component - Method ${method} - Repeatable ${isRepeatable}`, async () => {
            const isPublish = method === 'publish';
            const isUnpublish = method.includes('unpublish');

            const key = isRepeatable ? 'nonLocalizedRepeatableCompo' : 'nonLocalizedCompo';
            const connectRelationAt = 'tag';

            let updatedValue;
            if (isRepeatable) {
              const localeTags = data.tags.filter((tag) => tag.locale === 'en');

              updatedValue = [
                {
                  [connectRelationAt]: {
                    connect: [localeTags[0]],
                  },
                },
                {
                  [connectRelationAt]: {
                    connect: [localeTags[1]],
                  },
                },
              ];
            } else {
              updatedValue = {
                [connectRelationAt]: {
                  connect: [data.tags.find((tag) => tag.locale === 'en')],
                },
              };
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

              // Update the default locale draft entry to remove any connected tags
              await rq({
                method: 'PUT',
                url: `/content-manager/collection-types/api::category.category/${documentId}`,
                body: {
                  [key]: transformConnectToDisconnect(cloneDeep(updatedValue)),
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

            // If we have connected a relation, we should expect the count to
            // equal the number of relations we have connected
            const fieldData = res.body.data[key];
            if (Array.isArray(fieldData)) {
              fieldData.forEach((item, index) => {
                expect(item[connectRelationAt].count).toEqual(
                  Array.isArray(updatedValue)
                    ? updatedValue[index][connectRelationAt].connect.length
                    : updatedValue[connectRelationAt].connect.length
                );
              });
            }

            for (const locale of allLocaleCodes) {
              const localeRes = await strapi.db.query('api::category.category').findOne({
                where: {
                  documentId,
                  publishedAt: null,
                  locale: { $eq: locale },
                },
                populate: [`${key}.${connectRelationAt}`],
              });

              // Connecting a relation to the default locale should add the
              // equivalent locale relation if it exists to the other locales
              (Array.isArray(localeRes[key]) ? localeRes[key] : [localeRes[key]]).forEach(
                (item, index) => {
                  if (!tagsAvailableIn.includes(locale)) {
                    expect(item[connectRelationAt]).toBeNull();
                  } else {
                    expect(item[connectRelationAt]).toEqual(
                      expect.objectContaining({
                        locale,
                        documentId: (Array.isArray(updatedValue) ? updatedValue : [updatedValue])[
                          index
                        ][connectRelationAt].connect[0].documentId,
                      })
                    );
                  }
                }
              );
            }
          });
        });
      });
    });
  });
});
