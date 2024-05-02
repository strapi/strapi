'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');
const modelsUtils = require('api-tests/models');

let strapi;
let rq;

const productUid = 'api::product.product';
const employeeUid = 'api::employee.employee';
const shopUid = 'api::shop.shop';
const compoUid = 'default.compo';

const defaultLocale = 'en';
const extraLocale = 'fr';

const data = {
  [productUid]: {
    draft: [],
    published: [],
  },
  [shopUid]: {
    draft: [],
    published: [],
  },
  [employeeUid]: {
    draft: [],
  },
  shopRelations: {},
  testData: {},
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
});

const employeeModal = () => ({
  displayName: 'Employee',
  singularName: 'employee',
  pluralName: 'employees',
  description: '',
  collectionName: '',
  draftAndPublish: true,
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
    employee_ow: {
      type: 'relation',
      relation: 'oneToOne',
      target: employeeUid,
    },
  },
});

// Add an appropriate publishedAt check based on the presence of a published version
const addStatusCheck = (uid, data, documentId) => {
  if (!documentId) {
    return { publishedAt: null };
  }
  if (!data) {
    return { publishedAt: null };
  }

  if (
    // TODO handle modified status
    data[uid]['published'].find((publishedDocument) => publishedDocument.documentId === documentId)
  ) {
    return { status: 'published' };
  }
  return { status: 'draft' };
};

const allRelations = {
  products_ow: {
    targetUid: productUid,
    isComponent: false,
  },
  products_oo: {
    targetUid: productUid,
    isComponent: false,
  },
  products_mo: {
    targetUid: productUid,
    isComponent: false,
  },
  products_om: {
    targetUid: productUid,
    isComponent: false,
  },
  products_mm: {
    targetUid: productUid,
    isComponent: false,
  },
  products_mw: {
    targetUid: productUid,
    isComponent: false,
  },
  ['myCompo.compo_products_ow']: {
    targetUid: productUid,
    isComponent: true,
  },
  ['myCompo.compo_products_mw']: {
    targetUid: productUid,
    isComponent: true,
  },
  employee_ow: {
    targetUid: employeeUid,
    isComponent: false,
  },
};

describe('Find Relations', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder
      .addComponent(compo(false))
      .addContentTypes([productModel(), employeeModal(), shopModel()])
      .build();

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
      // available relations in a different locale
      strapi.documents(productUid).create({ data: { name: 'Porte' }, locale: extraLocale }),
      strapi.documents(productUid).create({ data: { name: 'Fenetre' }, locale: extraLocale }),
    ]);
    data[productUid].draft.push(skate, chair, candle, table, porte, fenetre);

    const productMapping = {
      skate: data[productUid].draft[0],
      chair: data[productUid].draft[1],
      candle: data[productUid].draft[2],
      table: data[productUid].draft[3],
      porte: data[productUid].draft[4],
      fenetre: data[productUid].draft[5],
    };

    // Publish Skate and Chair
    const [publishedSkate, publishedChair] = await Promise.all([
      strapi.documents(productUid).publish({ documentId: productMapping.skate.documentId }),
      strapi.documents(productUid).publish({ documentId: productMapping.chair.documentId }),
    ]);
    data[productUid].published.push(publishedSkate.entries[0], publishedChair.entries[0]);

    const stan = await strapi.documents(employeeUid).create({ data: { name: 'Stan' } });
    data[employeeUid].draft.push(stan);

    // Define the relations between the shops and the products
    const draftRelations = {
      products_ow: data[productUid].draft[0],
      products_oo: data[productUid].draft[2],
      products_mo: data[productUid].draft[1],
      products_om: data[productUid].draft.filter((product) => product.locale !== extraLocale),
      products_mm: data[productUid].draft.slice(0, 2),
      products_mw: [data[productUid].draft[1], data[productUid].draft[3]],
      myCompo: {
        compo_products_ow: data[productUid].draft[2],
        compo_products_mw: [data[productUid].draft[0]],
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
    data[shopUid].draft.push(draftShop, draftEmptyShop);

    // Publish both shops
    const [publishedShop, publishedEmptyShop] = await Promise.all([
      strapi.documents(shopUid).publish({
        documentId: draftShop.documentId,
        populate: Object.keys(allRelations),
      }),
      strapi.documents(shopUid).publish({ documentId: draftEmptyShop.documentId }),
    ]);
    data[shopUid].published.push(publishedShop.entries[0], publishedEmptyShop.entries[0]);

    // We now omit non relational fields before storing the shop relations
    ['id', 'updatedAt', 'publishedAt', 'locale', 'createdAt', 'name'].forEach(
      (key) => delete publishedShop.entries[0][key]
    );
    data.shopRelations = {
      draft: draftRelations,
      published: publishedShop.entries[0],
    };

    // Define the ids of the shops we will use for testing
    const testData = {
      component: {
        // If the source of the relation is a component, the id we use to
        // query for relations is the entity id of the component, not the id of the
        // parent entity
        modelUID: compoUid,
        id: data[shopUid].draft[0].myCompo.id,
        idEmptyShop: data[shopUid].draft[1].myCompo.id,
      },
      publishedComponent: {
        modelUID: compoUid,
        id: data[shopUid].published[0].myCompo.id,
        idEmptyShop: undefined,
      },
      entity: {
        // If the source of the relation is a content type, we use the documentId
        modelUID: shopUid,
        id: data[shopUid].draft[0].documentId,
        idEmptyShop: data[shopUid].draft[1].documentId,
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
  const getRelatedDocumentIds = (isComponent, fieldName) => {
    let relatedDocumentIds;
    if (isComponent) {
      relatedDocumentIds = data.shopRelations['draft'].myCompo[fieldName];
    } else {
      relatedDocumentIds = data.shopRelations['draft'][fieldName];
    }

    if (Array.isArray(relatedDocumentIds)) {
      relatedDocumentIds = relatedDocumentIds.map((relation) => relation?.documentId);
    } else {
      relatedDocumentIds = [relatedDocumentIds?.documentId];
    }

    return relatedDocumentIds.filter(Boolean);
  };

  describe('Content type failure cases', () => {
    describe('Find Available', () => {
      test('Fail when entity is not found', async () => {
        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/${shopUid}/products_ow`,
          qs: {
            id: 'docIdDoesntExist',
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
    Object.entries(allRelations).map(([fieldName, params]) => [fieldName.split('.').at(-1), params])
  )('Relational field (%s) (is in component: %s)', (fieldName, params) => {
    const targetUid = params.targetUid;
    const isComponent = params.isComponent;

    const qs = {
      locale: defaultLocale,
    };

    describe('Find Available', () => {
      describe.each([[true], [false]])('Can retrieve all available relation(s)', (useEmptyShop) => {
        test(`when entity ID is ${!useEmptyShop ? 'undefined' : 'an empty entity'}`, async () => {
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

          const documentsInThisLocale = data[targetUid]['draft'].filter(
            // Any products that are in the non default locale should not
            // be considered available
            (document) => !document?.locale || document.locale === defaultLocale
          );

          expect(res.body.results).toMatchObject(
            documentsInThisLocale
              // Results form the request should be sorted by name
              // this is not necessarily the order of data
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((document) => ({
                documentId: document.documentId,
                ...addStatusCheck(data, document.documentId),
              }))
          );

          const idsToOmit = [documentsInThisLocale[1]?.id].filter(Boolean);
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
            documentsInThisLocale.filter((document) => !idsToOmit.includes(document.id)).length
          );
        });
      });

      test(`Get relations for ${fieldName}`, async () => {
        const { id, modelUID } = isComponent ? data.testData.component : data.testData.entity;

        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/${modelUID}/${fieldName}`,
          qs: {
            // When querying for relations when the source content type is
            // localized but the target content type is not, the locale passed
            // should be used to validate that the source exists but ignored when
            // querying for target relations
            ...qs,
            id,
          },
        });
        expect(res.status).toBe(200);

        const availableDocuments = data[targetUid]['draft']
          .filter((document) => {
            // Get the ids of the products that are not already related to this
            // entity and are in the same locale as the entity
            return (
              !getRelatedDocumentIds(isComponent, fieldName).includes(document.documentId) &&
              (!document?.locale || document.locale === defaultLocale)
            );
          })
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((document) => {
            const hasLocale = document?.locale;
            const expect = {
              documentId: document.documentId,
              ...addStatusCheck(data, document.documentId),
            };

            if (hasLocale) {
              return {
                ...expect,
                locale: document.locale,
              };
            } else {
              return expect;
            }
          });

        expect(res.body.results).toMatchObject(availableDocuments);

        const idsToOmit = [availableDocuments[1]?.id].filter(Boolean);
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
          availableDocuments.filter((document) => !idsToOmit.includes(document.id)).length
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
          ['Stan'],
          ['stan'.substring(0, 1)],
        ];
        describe.each(searchTerms)(`Search with term %s`, (searchTerm) => {
          test('Can search entity', async () => {
            const { id, modelUID } = isComponent ? data.testData.component : data.testData.entity;

            const res = await rq({
              method: 'GET',
              url: `/content-manager/relations/${modelUID}/${fieldName}`,
              qs: {
                ...qs,
                id,
                _q: searchTerm,
              },
            });
            expect(res.status).toBe(200);

            // We expect to get products that are not already related to the entity
            // that fuzzy match the search query and are in the same locale as the entity
            const expected = data[targetUid]['draft']
              .filter(
                (document) =>
                  new RegExp(searchTerm, 'i').test(document.name) &&
                  (!document?.locale || document.locale === defaultLocale) &&
                  !getRelatedDocumentIds(isComponent, fieldName).includes(document.documentId)
              )
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((document) => {
                const hasLocale = document?.locale;
                const expected = {
                  documentId: document.documentId,
                  ...addStatusCheck(data, document.documentId),
                };

                if (hasLocale) {
                  return {
                    ...expected,
                    locale: document.locale,
                  };
                } else {
                  return expected;
                }
              });

            expect(res.body.results).toHaveLength(expected.length);
            expect(res.body.results).toMatchObject(expected);
          });
        });
      });
    });

    describe('Find Existing', () => {
      test('Can retrieve the relation(s) for an entity that has some relations', async () => {
        const { id, modelUID } = isComponent ? data.testData.component : data.testData.entity;

        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/${modelUID}/${id}/${fieldName}`,
          qs,
        });

        expect(res.status).toBe(200);

        const relatedDocumentIds = getRelatedDocumentIds(isComponent, fieldName);

        expect(res.body.results).toHaveLength(relatedDocumentIds.length);
        expect(res.body.results.map((result) => result.documentId)).toEqual(
          // TODO we aren't accounting for the order of the results here
          expect.arrayContaining(relatedDocumentIds)
        );
      });

      test('Can query by status for existing relations', async () => {
        const { id, modelUID } = isComponent
          ? data.testData.publishedComponent
          : data.testData.entity;

        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/${modelUID}/${id}/${fieldName}`,
          qs: {
            ...qs,
            status: 'published',
          },
        });
        expect(res.status).toBe(200);

        expect(res.body.results.map((result) => result.publishedAt)).not.toContainEqual(null);
      });

      test("Can retrieve the relation(s) for an entity that doesn't have relations yet", async () => {
        const { modelUID, idEmptyShop } = isComponent
          ? data.testData.component
          : data.testData.entity;
        const res = await rq({
          method: 'GET',
          url: `/content-manager/relations/${modelUID}/${idEmptyShop}/${fieldName}`,
        });

        expect(res.status).toBe(200);
        expect(res.body.results).toHaveLength(0);
      });
    });
  });
});
