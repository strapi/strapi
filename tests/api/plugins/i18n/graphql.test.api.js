'use strict';

// Helpers.
const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
let graphqlQuery;
let localeId;

const recipesModel = {
  attributes: {
    name: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
  },
  draftAndPublish: true,
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  singularName: 'recipe',
  pluralName: 'recipes',
  displayName: 'Recipe',
  description: '',
  collectionName: '',
};

describe('Test Graphql API create localization', () => {
  beforeAll(async () => {
    await builder.addContentType(recipesModel).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    graphqlQuery = (body) => {
      return rq({
        url: '/graphql',
        method: 'POST',
        body,
      });
    };

    const locale = await strapi.db.query('plugin::i18n.locale').create({
      data: { code: 'fr', name: 'French' },
    });

    localeId = locale.documentId;
  });

  afterAll(async () => {
    await strapi.db.query('plugin::i18n.locale').delete({ where: { documentId: localeId } });
    await strapi.db.query('api::recipe.recipe').deleteMany();
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Create localization', async () => {
    const createResponse = await graphqlQuery({
      query: /* GraphQL */ `
        mutation createRecipe($data: RecipeInput!) {
          createRecipe(data: $data) {
            data {
              documentId
              attributes {
                name
                locale
              }
            }
          }
        }
      `,
      variables: {
        data: {
          name: 'Recipe Name',
        },
      },
    });

    expect(createResponse.statusCode).toBe(200);
    expect(createResponse.body).toMatchObject({
      data: {
        createRecipe: {
          data: {
            attributes: {
              name: 'Recipe Name',
              locale: 'en',
            },
          },
        },
      },
    });

    const recipeId = createResponse.body.data.createRecipe.data.documentId;

    const updateRecipeResponse = await graphqlQuery({
      query: /* GraphQL */ `
        mutation updateRecipe($documentId: ID!, $locale: I18NLocaleCode, $data: RecipeInput!) {
          updateRecipe(documentId: $documentId, locale: $locale, data: $data) {
            data {
              documentId
              attributes {
                name
                locale
              }
            }
          }
        }
      `,
      variables: {
        documentId: recipeId,
        locale: 'fr',
        data: {
          name: 'Recipe Name fr',
        },
      },
    });

    expect(updateRecipeResponse.statusCode).toBe(200);
    expect(updateRecipeResponse.body.data.updateRecipe).toMatchObject({
      data: {
        attributes: {
          name: 'Recipe Name fr',
          locale: 'fr',
        },
      },
    });
  });

  test('Localizations match the publication state of the parent entry', async () => {
    const englishRecipe = await strapi.documents('api::recipe.recipe').create({
      locale: 'en',
      status: 'published',
      data: {
        name: 'English published localization state',
      },
    });

    await strapi.documents('api::recipe.recipe').update({
      documentId: englishRecipe.documentId,
      locale: 'fr',
      status: 'published',
      data: {
        name: 'French published localization state',
      },
    });

    await strapi.documents('api::recipe.recipe').update({
      documentId: englishRecipe.documentId,
      locale: 'en',
      data: {
        name: 'English draft localization state',
      },
    });

    await strapi.documents('api::recipe.recipe').update({
      documentId: englishRecipe.documentId,
      locale: 'fr',
      data: {
        name: 'French draft localization state',
      },
    });

    const response = await graphqlQuery({
      query: /* GraphQL */ `
        {
          live: recipes_connection(
            locale: "en"
            filters: { name: { eq: "English published localization state" } }
          ) {
            data {
              attributes {
                name
                publishedAt
                localizations {
                  data {
                    attributes {
                      name
                      locale
                      publishedAt
                    }
                  }
                }
              }
            }
          }

          draft: recipes_connection(
            locale: "en"
            status: DRAFT
            filters: { name: { eq: "English draft localization state" } }
          ) {
            data {
              attributes {
                name
                publishedAt
                localizations {
                  data {
                    attributes {
                      name
                      locale
                      publishedAt
                    }
                  }
                }
              }
            }
          }
        }
      `,
    });

    expect(response.statusCode).toBe(200);

    const live = response.body.data.live.data[0].attributes;
    const draft = response.body.data.draft.data[0].attributes;
    const liveLocalizations = live.localizations.map(
      (localization) => localization.data.attributes
    );
    const draftLocalizations = draft.localizations.map(
      (localization) => localization.data.attributes
    );

    expect(live).toMatchObject({
      name: 'English published localization state',
      publishedAt: expect.any(String),
    });
    expect(liveLocalizations).toEqual([
      {
        name: 'French published localization state',
        locale: 'fr',
        publishedAt: expect.any(String),
      },
    ]);

    expect(draft).toMatchObject({
      name: 'English draft localization state',
      publishedAt: null,
    });
    expect(draftLocalizations).toEqual([
      {
        name: 'French draft localization state',
        locale: 'fr',
        publishedAt: null,
      },
    ]);
  });
});
