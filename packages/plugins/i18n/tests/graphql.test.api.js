'use strict';

// Helpers.
const { createTestBuilder } = require('../../../../test/helpers/builder');
const { createStrapiInstance } = require('../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../test/helpers/request');

const builder = createTestBuilder();
let strapi;
let rq;
let graphqlQuery;
let localeId;

const recipesModel = {
  attributes: {
    name: {
      type: 'string',
    },
  },
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

    const locale = await strapi.query('plugin::i18n.locale').create({
      data: { code: 'fr', name: 'French' },
    });

    localeId = locale.id;
  });

  afterAll(async () => {
    await strapi.query('plugin::i18n.locale').delete({ where: { id: localeId } });
    await strapi.query('api::recipe.recipe').deleteMany();
    await strapi.destroy();
    await builder.cleanup();
  });

  test('Create localization', async () => {
    const createResponse = await graphqlQuery({
      query: /* GraphQL */ `
        mutation createRecipe($data: RecipeInput!) {
          createRecipe(data: $data) {
            data {
              id
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

    const recipeId = createResponse.body.data.createRecipe.data.id;

    const createLocalizationResponse = await graphqlQuery({
      query: /* GraphQL */ `
        mutation createRecipeLocalization($id: ID!, $locale: I18NLocaleCode, $data: RecipeInput!) {
          createRecipeLocalization(id: $id, locale: $locale, data: $data) {
            data {
              id
              attributes {
                name
                locale
              }
            }
          }
        }
      `,
      variables: {
        id: recipeId,
        locale: 'fr',
        data: {
          name: 'Recipe Name fr',
        },
      },
    });

    expect(createLocalizationResponse.statusCode).toBe(200);
    expect(createLocalizationResponse.body.data.createRecipeLocalization).toMatchObject({
      data: {
        attributes: {
          name: 'Recipe Name fr',
          locale: 'fr',
        },
      },
    });
  });
});
