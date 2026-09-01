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
    nestedProfile: {
      component: 'default.outer',
      type: 'component',
      repeatable: false,
      pluginOptions: {
        i18n: {
          localized: false,
        },
      },
    },
    nonLocalizedDz: {
      type: 'dynamiczone',
      components: ['default.compo', 'default.outer'],
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

const innerCompo = {
  displayName: 'inner',
  category: 'default',
  attributes: {
    label: {
      type: 'string',
    },
  },
};

const midCompo = {
  displayName: 'mid',
  category: 'default',
  attributes: {
    heading: {
      type: 'string',
    },
    inners: {
      type: 'component',
      component: 'default.inner',
      repeatable: true,
    },
  },
};

const outerCompo = {
  displayName: 'outer',
  category: 'default',
  attributes: {
    name: {
      type: 'string',
    },
    mid: {
      type: 'component',
      component: 'default.mid',
      repeatable: false,
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
      .addComponent(innerCompo)
      .addComponent(midCompo)
      .addComponent(outerCompo)
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

    /**
     * Regression for https://github.com/strapi/strapi/issues/27182
     *
     * Admin create-locale forms initialize required repeatable non-localized
     * components as `[]` (see createDefaultForm). fillNonLocalizedAttributes
     * must treat empty arrays as unset so sibling data is inherited instead of
     * syncing `[]` to every locale.
     */
    describe('Creating a locale with empty non-localized repeatable component (GH#27182)', () => {
      test('preserves default-locale component data when the new locale is saved with an empty array', async () => {
        const createRes = await create('api::category.category', {
          name: 'GH27182 default',
          nonLocalizedRepeatableCompo: [{ name: 'keep-me' }],
        });
        expect(createRes.statusCode).toBe(201);

        const { documentId: docId } = createRes.body.data;

        // Simulate the admin EditView payload when opening a missing locale:
        // required repeatable non-localized components default to [].
        const frRes = await update('api::category.category', docId, {
          locale: 'fr',
          name: 'GH27182 french',
          nonLocalizedRepeatableCompo: [],
        });
        expect(frRes.statusCode).toBe(200);

        const enEntry = await strapi.db.query('api::category.category').findOne({
          where: {
            documentId: docId,
            publishedAt: null,
            locale: 'en',
          },
          populate: ['nonLocalizedRepeatableCompo'],
        });

        expect(enEntry.nonLocalizedRepeatableCompo).toEqual([
          expect.objectContaining({ name: 'keep-me' }),
        ]);
      });

      test('copies sibling component data when the new-locale payload omits the non-localized component', async () => {
        const createRes = await create('api::category.category', {
          name: 'GH27182 omit default',
          nonLocalizedRepeatableCompo: [{ name: 'from-sibling' }],
        });
        expect(createRes.statusCode).toBe(201);

        const { documentId: docId } = createRes.body.data;

        const frRes = await update('api::category.category', docId, {
          locale: 'fr',
          name: 'GH27182 omit french',
          // intentionally omit nonLocalizedRepeatableCompo
        });
        expect(frRes.statusCode).toBe(200);

        expect(frRes.body.data.nonLocalizedRepeatableCompo).toEqual([
          expect.objectContaining({ name: 'from-sibling' }),
        ]);

        const enEntry = await strapi.db.query('api::category.category').findOne({
          where: {
            documentId: docId,
            publishedAt: null,
            locale: 'en',
          },
          populate: ['nonLocalizedRepeatableCompo'],
        });

        expect(enEntry.nonLocalizedRepeatableCompo).toEqual([
          expect.objectContaining({ name: 'from-sibling' }),
        ]);
      });

      test('copies the current default-locale draft instead of an older published value', async () => {
        const createRes = await create('api::category.category', {
          name: 'draft source default',
          nonLocalizedRepeatableCompo: [{ name: 'published-value' }],
        });
        expect(createRes.statusCode).toBe(201);

        const { documentId: docId } = createRes.body.data;
        const publishRes = await publish('api::category.category', docId, {
          nonLocalizedRepeatableCompo: [{ name: 'published-value' }],
        });
        expect(publishRes.statusCode).toBe(200);

        const updateRes = await update('api::category.category', docId, {
          nonLocalizedRepeatableCompo: [{ name: 'draft-value' }],
        });
        expect(updateRes.statusCode).toBe(200);

        const frRes = await update('api::category.category', docId, {
          locale: 'fr',
          name: 'draft source french',
          nonLocalizedRepeatableCompo: [],
        });
        expect(frRes.statusCode).toBe(200);
        expect(frRes.body.data.nonLocalizedRepeatableCompo).toEqual([
          expect.objectContaining({ name: 'draft-value' }),
        ]);

        const [enDraft, enPublished] = await Promise.all([
          strapi.db.query('api::category.category').findOne({
            where: { documentId: docId, locale: 'en', publishedAt: null },
            populate: ['nonLocalizedRepeatableCompo'],
          }),
          strapi.db.query('api::category.category').findOne({
            where: { documentId: docId, locale: 'en', publishedAt: { $notNull: true } },
            populate: ['nonLocalizedRepeatableCompo'],
          }),
        ]);

        expect(enDraft.nonLocalizedRepeatableCompo).toEqual([
          expect.objectContaining({ name: 'draft-value' }),
        ]);
        expect(enPublished.nonLocalizedRepeatableCompo).toEqual([
          expect.objectContaining({ name: 'published-value' }),
        ]);
      });
    });

    describe('Creating a locale with a shallow nested non-localized component', () => {
      const nestedProfile = {
        name: 'shared-name',
        mid: {
          heading: 'keep-heading',
          inners: [{ label: 'keep-inner' }],
        },
      };

      test('preserves nested component data when the new locale sends a shallow parent', async () => {
        const createRes = await create('api::category.category', {
          name: 'nested default',
          nestedProfile,
        });
        expect(createRes.statusCode).toBe(201);

        const { documentId: docId } = createRes.body.data;

        // Simulate availableLocales populate that only hydrated the parent component.
        const frRes = await update('api::category.category', docId, {
          locale: 'fr',
          name: 'nested french',
          nestedProfile: { name: 'shared-name' },
        });
        expect(frRes.statusCode).toBe(200);

        expect(frRes.body.data.nestedProfile).toEqual(
          expect.objectContaining({
            name: 'shared-name',
            mid: expect.objectContaining({
              heading: 'keep-heading',
              inners: [expect.objectContaining({ label: 'keep-inner' })],
            }),
          })
        );

        const enEntry = await strapi.db.query('api::category.category').findOne({
          where: {
            documentId: docId,
            publishedAt: null,
            locale: 'en',
          },
          populate: ['nestedProfile.mid.inners'],
        });

        expect(enEntry.nestedProfile).toEqual(
          expect.objectContaining({
            name: 'shared-name',
            mid: expect.objectContaining({
              heading: 'keep-heading',
              inners: [expect.objectContaining({ label: 'keep-inner' })],
            }),
          })
        );
      });

      test('preserves nested repeatable data when the new locale sends an empty nested array', async () => {
        const createRes = await create('api::category.category', {
          name: 'nested empty-array default',
          nestedProfile,
        });
        expect(createRes.statusCode).toBe(201);

        const { documentId: docId } = createRes.body.data;

        const frRes = await update('api::category.category', docId, {
          locale: 'fr',
          name: 'nested empty-array french',
          nestedProfile: { name: 'shared-name', mid: { heading: 'keep-heading', inners: [] } },
        });
        expect(frRes.statusCode).toBe(200);

        const enEntry = await strapi.db.query('api::category.category').findOne({
          where: {
            documentId: docId,
            publishedAt: null,
            locale: 'en',
          },
          populate: ['nestedProfile.mid.inners'],
        });

        expect(enEntry.nestedProfile.mid.inners).toEqual([
          expect.objectContaining({ label: 'keep-inner' }),
        ]);
      });

      test('includes nested component data in availableLocales when the locale is missing', async () => {
        const createRes = await create('api::category.category', {
          name: 'nested metadata default',
          nestedProfile,
        });
        expect(createRes.statusCode).toBe(201);

        const { documentId: docId } = createRes.body.data;

        const getRes = await rq({
          method: 'GET',
          url: `/content-manager/collection-types/api::category.category/${docId}`,
          qs: { locale: 'fr' },
        });
        expect(getRes.statusCode).toBe(200);
        expect(getRes.body.data).toEqual({});

        const sibling = getRes.body.meta.availableLocales[0];
        expect(sibling.nestedProfile).toEqual(
          expect.objectContaining({
            name: 'shared-name',
            mid: expect.objectContaining({
              heading: 'keep-heading',
              inners: [expect.objectContaining({ label: 'keep-inner' })],
            }),
          })
        );
      });
    });

    describe('Creating a locale with an empty non-localized dynamic zone', () => {
      test('preserves default-locale dynamic zone data when the new locale is saved with an empty array', async () => {
        const createRes = await create('api::category.category', {
          name: 'dz default',
          nonLocalizedDz: [{ __component: 'default.compo', name: 'hero' }],
        });
        expect(createRes.statusCode).toBe(201);

        const { documentId: docId } = createRes.body.data;

        const frRes = await update('api::category.category', docId, {
          locale: 'fr',
          name: 'dz french',
          nonLocalizedDz: [],
        });
        expect(frRes.statusCode).toBe(200);

        expect(frRes.body.data.nonLocalizedDz).toEqual([
          expect.objectContaining({ __component: 'default.compo', name: 'hero' }),
        ]);

        const enEntry = await strapi.db.query('api::category.category').findOne({
          where: {
            documentId: docId,
            publishedAt: null,
            locale: 'en',
          },
          populate: ['nonLocalizedDz'],
        });

        expect(enEntry.nonLocalizedDz).toEqual([
          expect.objectContaining({ __component: 'default.compo', name: 'hero' }),
        ]);
      });

      test('includes non-localized dynamic zone data in availableLocales when the locale is missing', async () => {
        const createRes = await create('api::category.category', {
          name: 'dz metadata default',
          nonLocalizedDz: [{ __component: 'default.compo', name: 'hero' }],
        });
        expect(createRes.statusCode).toBe(201);

        const { documentId: docId } = createRes.body.data;

        const getRes = await rq({
          method: 'GET',
          url: `/content-manager/collection-types/api::category.category/${docId}`,
          qs: { locale: 'fr' },
        });
        expect(getRes.statusCode).toBe(200);

        const sibling = getRes.body.meta.availableLocales[0];
        expect(sibling.nonLocalizedDz).toEqual([
          expect.objectContaining({ __component: 'default.compo', name: 'hero' }),
        ]);
      });

      test('preserves nested data from the deeply populated dynamic-zone metadata', async () => {
        const nestedBlock = {
          __component: 'default.outer',
          name: 'shared-name',
          mid: {
            heading: 'keep-heading',
            inners: [{ label: 'keep-inner' }],
          },
        };
        const createRes = await create('api::category.category', {
          name: 'nested dz default',
          nonLocalizedDz: [nestedBlock],
        });
        expect(createRes.statusCode).toBe(201);

        const { documentId: docId } = createRes.body.data;
        const getRes = await rq({
          method: 'GET',
          url: `/content-manager/collection-types/api::category.category/${docId}`,
          qs: { locale: 'fr' },
        });
        expect(getRes.statusCode).toBe(200);
        const availableLocale = getRes.body.meta.availableLocales[0];
        expect(availableLocale.nonLocalizedDz[0].mid.inners).toEqual([
          expect.objectContaining({ label: 'keep-inner' }),
        ]);

        const frRes = await update('api::category.category', docId, {
          locale: 'fr',
          name: 'nested dz french',
          nonLocalizedDz: availableLocale.nonLocalizedDz,
        });
        expect(frRes.statusCode).toBe(200);
        expect(frRes.body.data.nonLocalizedDz[0].mid.inners).toEqual([
          expect.objectContaining({ label: 'keep-inner' }),
        ]);

        const enEntry = await strapi.db.query('api::category.category').findOne({
          where: { documentId: docId, locale: 'en', publishedAt: null },
          populate: {
            nonLocalizedDz: {
              on: {
                'default.outer': {
                  populate: ['mid.inners'],
                },
              },
            },
          },
        });
        expect(enEntry.nonLocalizedDz[0].mid.inners).toEqual([
          expect.objectContaining({ label: 'keep-inner' }),
        ]);
      });

      test('does not graft nested data into an explicit dynamic-zone replacement', async () => {
        const createRes = await create('api::category.category', {
          name: 'dz replacement default',
          nonLocalizedDz: [
            {
              __component: 'default.outer',
              name: 'original',
              mid: {
                heading: 'original-heading',
                inners: [{ label: 'original-inner' }],
              },
            },
          ],
        });
        expect(createRes.statusCode).toBe(201);

        const { documentId: docId } = createRes.body.data;
        const replacement = {
          __component: 'default.outer',
          name: 'replacement',
          mid: {
            heading: 'replacement-heading',
            inners: [],
          },
        };

        const frRes = await update('api::category.category', docId, {
          locale: 'fr',
          name: 'dz replacement french',
          nonLocalizedDz: [replacement],
        });
        expect(frRes.statusCode).toBe(200);
        expect(frRes.body.data.nonLocalizedDz).toEqual([
          expect.objectContaining({
            name: 'replacement',
            mid: expect.objectContaining({ inners: [] }),
          }),
        ]);

        const enEntry = await strapi.db.query('api::category.category').findOne({
          where: { documentId: docId, locale: 'en', publishedAt: null },
          populate: {
            nonLocalizedDz: {
              on: {
                'default.outer': {
                  populate: ['mid.inners'],
                },
              },
            },
          },
        });
        expect(enEntry.nonLocalizedDz).toEqual([
          expect.objectContaining({
            name: 'replacement',
            mid: expect.objectContaining({ inners: [] }),
          }),
        ]);
      });
    });
  });
});
