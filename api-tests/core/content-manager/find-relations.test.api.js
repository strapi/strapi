'use strict';

const { omit } = require('lodash/fp');

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const modelsUtils = require('api-tests/models');

let strapi;
let rq;

const data = {
  products: {
    draft: [],
    published: [],
  },
  shops: {
    draft: [],
    published: [],
  },
  shopRelations: {},
  testData: {},
};

const defaultLocale = 'en';
const extraLocale = 'fr';

const productUid = 'api::product.product';
const shopUid = 'api::shop.shop';
const compoUid = 'default.compo';

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
          compo_products_ow: {
            type: 'relation',
            relation: 'oneToOne',
            target: productUid,
          },
          compo_products_mw: {
            type: 'relation',
            relation: 'oneToMany',
            target: productUid,
          },
        }),
  },
});

const productModel = () => ({
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
    },
  },
});

const shopModel = () => ({
  displayName: 'Shop',
  singularName: 'shop',
  pluralName: 'shops',
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  attributes: {
    name: {
      type: 'string',
    },
    products_ow: {
      type: 'relation',
      relation: 'oneToOne',
      target: productUid,
    },
    products_oo: {
      type: 'relation',
      relation: 'oneToOne',
      target: productUid,
      targetAttribute: 'shop',
    },
    products_mo: {
      type: 'relation',
      relation: 'manyToOne',
      target: productUid,
      targetAttribute: 'shops_mo',
    },
    products_om: {
      type: 'relation',
      relation: 'oneToMany',
      target: productUid,
      targetAttribute: 'shop_om',
    },
    products_mm: {
      type: 'relation',
      relation: 'manyToMany',
      target: productUid,
      targetAttribute: 'shops',
    },
    products_mw: {
      type: 'relation',
      relation: 'oneToMany',
      target: productUid,
    },
    myCompo: {
      type: 'component',
      repeatable: false,
      component: compoUid,
    },
  },
});

const addPublishedAtCheck = (value) => {
  publishedAt: value;
};

const allRelations = {
  products_ow: {
    isComponent: false,
  },
  products_oo: {
    isComponent: false,
  },
  products_mo: {
    isComponent: false,
  },
  products_om: {
    isComponent: false,
  },
  products_mm: {
    isComponent: false,
  },
  products_mw: {
    isComponent: false,
  },
  ['myCompo.compo_products_ow']: {
    isComponent: true,
  },
  ['myCompo.compo_products_mw']: {
    isComponent: true,
  },
};

describe('Find Relations', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder.addComponent(compo(false)).addContentTypes([productModel(), shopModel()]).build();

    await modelsUtils.modifyComponent(compo(true));

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await rq({
      method: 'POST',
      url: '/i18n/locales',
      body: {
        code: extraLocale,
        name: `French (${extraLocale})`,
        isDefault: false,
      },
    });

    // Create draft products
    const [skate, chair, candle, table, porte, fenetre] = await Promise.all([
      strapi.documents(productUid).create({ data: { name: 'Skate' } }),
      strapi.documents(productUid).create({ data: { name: 'Chair' } }),
      strapi.documents(productUid).create({ data: { name: 'Candle' } }),
      strapi.documents(productUid).create({ data: { name: 'Table' } }),
      // We create products in French in order to test that we can cant find
      // aviailable relations in a different locale
      strapi.documents(productUid).create({ data: { name: 'Porte' }, locale: extraLocale }),
      strapi.documents(productUid).create({ data: { name: 'Fenetre' }, locale: extraLocale }),
    ]);
    data.products.draft.push(skate, chair, candle, table, porte, fenetre);

    const productMapping = {
      skate: data.products.draft[0],
      chair: data.products.draft[1],
      candle: data.products.draft[2],
      table: data.products.draft[3],
      porte: data.products.draft[4],
      fenetre: data.products.draft[5],
    };

    // Publish Skate and Chair
    const [publishedSkate, publishedChair] = await Promise.all([
      strapi.documents(productUid).publish(productMapping.skate.documentId),
      strapi.documents(productUid).publish(productMapping.chair.documentId),
    ]);
    data.products.published.push(publishedSkate.versions[0], publishedChair.versions[0]);

    // Define the relations between the shops and the products
    const draftRelations = {
      products_ow: data.products.draft[0],
      products_oo: data.products.draft[2],
      products_mo: data.products.draft[1],
      products_om: data.products.draft.filter((product) => product.locale !== extraLocale),
      products_mm: data.products.draft.slice(0, 2),
      products_mw: [data.products.draft[1], data.products.draft[3]],
      myCompo: {
        compo_products_ow: data.products.draft[2],
        compo_products_mw: [data.products.draft[0]],
      },
    };

    // Create 2 draft shops
    const [draftShop, draftEmptyShop] = await Promise.all([
      strapi.documents(shopUid).create({
        data: {
          name: 'Cazotte Shop',
          products_ow: draftRelations.products_ow.documentId,
          products_oo: draftRelations.products_oo.documentId,
          products_mo: draftRelations.products_mo.documentId,
          products_om: draftRelations.products_om.map((product) => product.documentId),
          products_mm: draftRelations.products_mm.map((product) => product.documentId),
          products_mw: draftRelations.products_mw.map((product) => product.documentId),
          myCompo: {
            compo_products_ow: draftRelations.myCompo.compo_products_ow.documentId,
            compo_products_mw: draftRelations.myCompo.compo_products_mw.map(
              (product) => product.documentId
            ),
          },
        },
        populate: Object.keys(allRelations),
      }),
      strapi.documents(shopUid).create({
        data: {
          myCompo: {
            compo_products_ow: null,
            compo_products_mw: [],
          },
        },
        populate: Object.keys(allRelations),
      }),
    ]);
    data.shops.draft.push(draftShop, draftEmptyShop);

    // Publish both shops
    const [publishedShop, publishedEmptyShop] = await Promise.all([
      strapi.documents(shopUid).publish(draftShop.documentId, {
        populate: Object.keys(allRelations),
      }),
      strapi.documents(shopUid).publish(draftEmptyShop.documentId),
    ]);
    data.shops.published.push(publishedShop.versions[0], publishedEmptyShop.versions[0]);

    // We now omit non relational fields before storing the shop relations
    ['id', 'updatedAt', 'publishedAt', 'locale', 'createdAt', 'name'].forEach(
      (key) => delete publishedShop.versions[0][key]
    );
    data.shopRelations = {
      draft: draftRelations,
      published: publishedShop.versions[0],
    };

    // Define the ids of the shops we will use for testing
    const testData = {
      component: {
        // If the source of the relation is a component, the id we use to
        // query for relations is the entity id of the component, not the id of the
        // parent entity
        modelUID: compoUid,
        id: data.shops.draft[0].myCompo.id,
        idEmptyShop: data.shops.draft[1].myCompo.id,
      },
      entity: {
        // If the source of the relation is a content type, we use the documentId
        modelUID: shopUid,
        id: data.shops.draft[0].documentId,
        idEmptyShop: data.shops.draft[1].documentId,
      },
    };
    data.testData = testData;
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  /**
   * Find all the ids of the products that are related to the entity
   */
  const getRelatedProductDocumentIds = (isComponent, status, fieldName) => {
    let relatedProductIds;
    if (isComponent) {
      relatedProductIds = data.shopRelations[status].myCompo[fieldName];
    } else {
      relatedProductIds = data.shopRelations[status][fieldName];
    }

    if (Array.isArray(relatedProductIds)) {
      relatedProductIds = relatedProductIds.map((relation) => relation?.documentId);
    } else {
      relatedProductIds = [relatedProductIds?.documentId];
    }

    return relatedProductIds.filter(Boolean);
  };

  describe('Content type failure cases', () => {
    describe('Find Available', () => {
      test('Fail when entity is not found', async () => {
        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/${shopUid}/products_ow`,
          qs: {
            id: 'docIdDoesntExist',
            status: 'draft',
          },
        });

        expect(res.status).toBe(404);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {},
            message: 'Entity not found',
            name: 'NotFoundError',
            status: 404,
          },
        });
      });

      test("Fail when the field doesn't exist", async () => {
        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/${shopUid}/unknown_field`,
        });

        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {},
            message: `The relational field unknown_field doesn't exist on ${shopUid}`,
            name: 'ValidationError',
            status: 400,
          },
        });
      });

      test('Fail when the field exists but is not a relational field', async () => {
        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/${shopUid}/name`,
        });

        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {},
            message: `The relational field name doesn't exist on ${shopUid}`,
            name: 'ValidationError',
            status: 400,
          },
        });
      });
    });

    describe('Find Existing', () => {
      test('Fail when entity is not found', async () => {
        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/${shopUid}/notADocID/products_ow`,
          qs: {
            status: 'draft',
          },
        });

        expect(res.status).toBe(404);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {},
            message: 'Entity not found',
            name: 'NotFoundError',
            status: 404,
          },
        });
      });

      test("Fail when the field doesn't exist", async () => {
        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/${shopUid}/${data.testData.entity.id}/unkown`,
          qs: {
            status: 'draft',
          },
        });

        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {},
            message: `The relational field unkown doesn't exist on ${shopUid}`,
            name: 'ValidationError',
            status: 400,
          },
        });
      });

      test('Fail when the field exists but is not a relational field', async () => {
        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/${shopUid}/${data.testData.entity.id}/name`,
          qs: {
            status: 'draft',
          },
        });

        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {},
            message: `The relational field name doesn't exist on ${shopUid}`,
            name: 'ValidationError',
            status: 400,
          },
        });
      });
    });
  });

  describe('Component failure cases', () => {
    describe('Find Available', () => {
      test('Fail when the component is not found', async () => {
        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/${compoUid}/compo_products_ow`,
          qs: {
            id: 99999,
          },
        });

        expect(res.status).toBe(404);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {},
            message: 'Entity not found',
            name: 'NotFoundError',
            status: 404,
          },
        });
      });

      test("Fail when the field doesn't exist", async () => {
        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/${compoUid}/unknown`,
        });

        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {},
            message: `The relational field unknown doesn't exist on ${compoUid}`,
            name: 'ValidationError',
            status: 400,
          },
        });
      });

      test('Fail when the field exists but is not a relational field', async () => {
        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/${compoUid}/name`,
        });

        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {},
            message: `The relational field name doesn't exist on ${compoUid}`,
            name: 'ValidationError',
            status: 400,
          },
        });
      });
    });

    describe('Find Existing', () => {
      test('Fail when the component is not found', async () => {
        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/${compoUid}/999999/compo_products_ow`,
        });

        expect(res.status).toBe(404);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {},
            message: 'Entity not found',
            name: 'NotFoundError',
            status: 404,
          },
        });
      });

      test("Fail when the field doesn't exist", async () => {
        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/${compoUid}/${data.testData.component.id}/unknown`,
        });

        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {},
            message: `The relational field unknown doesn't exist on ${compoUid}`,
            name: 'ValidationError',
            status: 400,
          },
        });
      });

      test('Fail when the field exists but is not a relational field', async () => {
        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/${compoUid}/${data.testData.component.id}/name`,
        });

        expect(res.status).toBe(400);
        expect(res.body).toMatchObject({
          data: null,
          error: {
            details: {},
            message: `The relational field name doesn't exist on ${compoUid}`,
            name: 'ValidationError',
            status: 400,
          },
        });
      });
    });
  });

  // Run tests against every type of relation in the shop content type, always
  // from the default locale
  describe.each(
    Object.entries(allRelations).map(([fieldName, { isComponent }]) => [
      fieldName.split('.').at(-1),
      isComponent,
    ])
  )('Relational field (%s) (is in component: %s)', (fieldName, isComponent) => {
    // Perform the same tests for both draft and published entries
    // Components don't have a published status
    const statuses = isComponent ? [['draft']] : [['draft'], ['published']];

    describe.each(statuses)(`Get %s relation(s)`, (status) => {
      const qs = {
        // Not sending a locale will default to the default locale
        status,
      };

      describe('Find Available', () => {
        describe.each([[true], [false]])(
          'Can retrieve all available relation(s)',
          (useEmptyShop) => {
            test(`when entity ID is ${
              !useEmptyShop ? 'undefined' : 'an empty entity'
            }`, async () => {
              const { modelUID, idEmptyShop } = isComponent
                ? data.testData.component
                : data.testData.entity;

              const id = useEmptyShop ? idEmptyShop : undefined;

              const res = await rq({
                method: 'GET',
                url: `/content-manager/relations/${modelUID}/${fieldName}`,
                qs: {
                  ...qs,
                  id,
                },
              });
              expect(res.status).toBe(200);

              const productsInThisLocale = data.products[status].filter(
                // This test is running for the default locale (en)
                // any products that are in the non default locale should not
                // be considered available
                (product) => product.locale === defaultLocale
              );

              expect(res.body.results.map((result) => result.id)).toMatchObject(
                productsInThisLocale
                  // Results form the request should be sorted by name
                  // but are not necessarily in the same order as data.products
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((product) => product.documentId)
              );

              const idsToOmit = [productsInThisLocale[1]?.documentId].filter(Boolean);
              const omitIdsRes = await rq({
                method: 'GET',
                url: `/content-manager/relations/${modelUID}/${fieldName}`,
                qs: {
                  ...qs,
                  id,
                  idsToOmit,
                },
              });

              expect(omitIdsRes.body.results).toHaveLength(
                productsInThisLocale
                  .map((product) => product.documentId)
                  .filter((id) => !idsToOmit.includes(id)).length
              );
            });
          }
        );

        test(`Get relations for ${fieldName}`, async () => {
          const { id, modelUID } = isComponent ? data.testData.component : data.testData.entity;

          const res = await rq({
            method: 'GET',
            url: `/content-manager/relations/${modelUID}/${fieldName}`,
            qs: {
              ...qs,
              id,
            },
          });
          expect(res.status).toBe(200);

          // Get the ids of the products that are not already related to this
          // entity and are in the same locale as the entity
          const availableProducts = data.products[status]
            .filter((product) => {
              return (
                !getRelatedProductDocumentIds(isComponent, status, fieldName).includes(
                  product.documentId
                ) && product.locale === defaultLocale
              );
            })
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((product) => ({
              id: product.documentId,
              ...addPublishedAtCheck(status === 'published' ? expect().not.toBeNull() : null),
            }));

          expect(res.body.results).toMatchObject(
            // The results should be the products that are not already related to the shop
            availableProducts
          );

          const idsToOmit = [availableProducts[1]?.documentId].filter(Boolean);
          const omitIdsRes = await rq({
            method: 'GET',
            url: `/content-manager/relations/${modelUID}/${fieldName}`,
            qs: {
              ...qs,
              id,
              idsToOmit,
            },
          });

          expect(omitIdsRes.body.results).toHaveLength(
            availableProducts.filter((product) => !idsToOmit.includes(product.documentId)).length
          );
        });

        describe('Search', () => {
          const searchTerms = [
            ['Skate'],
            ['Candle'],
            ['Chair'],
            ['Table'],
            ['skate'],
            ['candle'],
            ['Skate'.substring(0, 3)],
            ['Candle'.substring(0, 3)],
            ['Chair'.substring(3)],
            ['table'.substring(2)],
            ['nothing'],
            ['nothing'.substring(0, 3)],
            [''],
            ['Fenetre'],
            ['Porte'],
          ];
          describe.each(searchTerms)(`Search with term %s`, (searchTerm) => {
            test('Can search entity', async () => {
              const { id, modelUID } = isComponent ? data.testData.component : data.testData.entity;

              const res = await rq({
                method: 'GET',
                url: `/content-manager/relations/${modelUID}/${fieldName}`,
                qs: {
                  ...qs,
                  _q: searchTerm,
                  id,
                },
              });
              expect(res.status).toBe(200);

              // We expect to get products that are not already related to the entity
              // that fuzzy match the search query and are in the same locale as the entity
              const expected = data.products[status]
                .filter(
                  (product) =>
                    new RegExp(searchTerm, 'i').test(product.name) &&
                    product.locale === defaultLocale &&
                    !getRelatedProductDocumentIds(isComponent, status, fieldName).includes(
                      product.documentId
                    )
                )
                .sort((a, b) => a.name.localeCompare(b.name));

              expect(res.body.results).toHaveLength(expected.length);
              expect(res.body.results).toMatchObject(
                expected.map((product) => ({
                  id: product.documentId,
                  name: product.name,
                  ...addPublishedAtCheck(status === 'published' ? expect().not.toBeNull() : null),
                }))
              );
            });
          });
        });
      });

      describe('Find Existing', () => {
        test('Can retrieve the relation(s) for an entity that have some relations', async () => {
          const { id, modelUID } = isComponent ? data.testData.component : data.testData.entity;

          const res = await rq({
            method: 'GET',
            url: `/content-manager/relations/${modelUID}/${id}/${fieldName}`,
            qs,
          });

          expect(res.status).toBe(200);

          const relatedProductDocumentIds = getRelatedProductDocumentIds(
            isComponent,
            status,
            fieldName
          );

          expect(res.body.results).toHaveLength(relatedProductDocumentIds.length);
          expect(res.body.results.map((result) => result.id)).toEqual(
            // TODO we aren't accounting for the order of the results here
            expect.arrayContaining(relatedProductDocumentIds)
          );
        });

        test("Can retrieve the relation(s) for an entity that doesn't have relations yet", async () => {
          const { modelUID, idEmptyShop } = isComponent
            ? data.testData.component
            : data.testData.entity;
          const res = await rq({
            method: 'GET',
            url: `/content-manager/relations/${modelUID}/${idEmptyShop}/${fieldName}`,
            qs,
          });

          expect(res.status).toBe(200);
          expect(res.body.results).toHaveLength(0);
        });
      });
    });
  });
});
