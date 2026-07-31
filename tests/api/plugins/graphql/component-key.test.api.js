'use strict';

/**
 * GraphQL surfacing of durable componentKey on nested components.
 * Stacked on feat/component-key (#27077).
 */

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
let graphqlQuery;
let documentId;

const blockComponent = {
  attributes: {
    name: {
      type: 'string',
    },
  },
  displayName: 'gql-key-block',
};

const articleModel = {
  attributes: {
    title: {
      type: 'string',
    },
    blocks: {
      type: 'component',
      component: 'default.gql-key-block',
      repeatable: true,
    },
  },
  singularName: 'gql-key-article',
  pluralName: 'gql-key-articles',
  displayName: 'Gql Key Article',
  draftAndPublish: false,
};

describe('GraphQL — componentKey', () => {
  beforeAll(async () => {
    await builder.addComponent(blockComponent).addContentTypes([articleModel]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    graphqlQuery = (body) =>
      rq({
        url: '/graphql',
        method: 'POST',
        body,
      });

    const created = await strapi.documents('api::gql-key-article.gql-key-article').create({
      data: {
        title: 'hello',
        blocks: [{ name: 'a' }, { name: 'b' }],
      },
      populate: ['blocks'],
    });
    documentId = created.documentId;
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('query returns componentKey on nested components', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        query ($documentId: ID!) {
          gqlKeyArticle(documentId: $documentId) {
            data {
              attributes {
                title
                blocks {
                  id
                  componentKey
                  name
                }
              }
            }
          }
        }
      `,
      variables: { documentId },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const blocks = res.body.data.gqlKeyArticle.data.attributes.blocks;
    expect(blocks).toHaveLength(2);
    expect(blocks[0].componentKey).toEqual(expect.any(String));
    expect(blocks[1].componentKey).toEqual(expect.any(String));
    expect(blocks[0].componentKey).not.toBe(blocks[1].componentKey);
  });

  test('mutation update accepts componentKey on component input', async () => {
    const read = await graphqlQuery({
      query: /* GraphQL */ `
        query ($documentId: ID!) {
          gqlKeyArticle(documentId: $documentId) {
            data {
              attributes {
                blocks {
                  componentKey
                  name
                }
              }
            }
          }
        }
      `,
      variables: { documentId },
    });

    const blocks = read.body.data.gqlKeyArticle.data.attributes.blocks;
    const targetKey = blocks[0].componentKey;

    const updateRes = await graphqlQuery({
      query: /* GraphQL */ `
        mutation updateArticle($documentId: ID!, $data: GqlKeyArticleInput!) {
          updateGqlKeyArticle(documentId: $documentId, data: $data) {
            data {
              attributes {
                blocks {
                  componentKey
                  name
                }
              }
            }
          }
        }
      `,
      variables: {
        documentId,
        data: {
          blocks: [
            { componentKey: targetKey, name: 'a-updated' },
            { componentKey: blocks[1].componentKey, name: 'b' },
          ],
        },
      },
    });

    expect(updateRes.statusCode).toBe(200);
    expect(updateRes.body.errors).toBeUndefined();

    const updated = updateRes.body.data.updateGqlKeyArticle.data.attributes.blocks;
    expect(updated.find((b) => b.componentKey === targetKey).name).toBe('a-updated');
  });
});
