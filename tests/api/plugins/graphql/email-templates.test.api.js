'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;

const homePageModel = {
  singularName: 'home-page',
  pluralName: 'home-pages',
  displayName: 'Homepage',
  kind: 'singleType',
  attributes: {
    title: {
      type: 'string',
    },
  },
};

const fieldNames = (type) => (type?.fields ?? []).map(({ name }) => name);

describe('GraphQL and the email plugin', () => {
  beforeAll(async () => {
    await builder.addContentType(homePageModel).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('stored email templates are not in the schema', async () => {
    const res = await rq({
      url: '/graphql',
      method: 'POST',
      body: {
        query: /* GraphQL */ `
          {
            queryType: __type(name: "Query") {
              fields {
                name
              }
            }
            mutationType: __type(name: "Mutation") {
              fields {
                name
              }
            }
          }
        `,
      },
    });

    expect(res.statusCode).toBe(200);

    const queries = fieldNames(res.body.data.queryType);
    const mutations = fieldNames(res.body.data.mutationType);

    // The schema is there, and the project's own types are in it
    expect(queries).toContain('homePage');

    for (const name of [...queries, ...mutations]) {
      expect(name).not.toMatch(
        /^(emailTemplate|updateEmailTemplate|deleteEmailTemplate|createEmailTemplate)/
      );
    }
  });
});
