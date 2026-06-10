'use strict';

const { createTestBuilder } = require('api-tests/builder');
const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const builder = createTestBuilder();
let strapi;
let rq;
let graphqlQuery;
let pageDocumentId;

const chapterComponent = {
  displayName: 'Chapter',
  attributes: {
    title: {
      type: 'string',
    },
  },
};

const pageModel = {
  attributes: {
    title: {
      type: 'string',
    },
    chapters: {
      type: 'component',
      component: 'default.chapter',
      repeatable: true,
    },
  },
  singularName: 'page',
  pluralName: 'pages',
  displayName: 'Page',
};

describe('GraphQL repeatable component order (issue #26465)', () => {
  beforeAll(async () => {
    await builder.addComponent(chapterComponent).addContentTypes([pageModel]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    graphqlQuery = (body) =>
      rq({
        url: '/graphql',
        method: 'POST',
        body,
      });

    const page = await strapi.documents('api::page.page').create({
      data: {
        title: 'Test page',
        chapters: [{ title: 'First' }, { title: 'Second' }, { title: 'Third' }],
      },
      populate: { chapters: true },
    });

    pageDocumentId = page.documentId;

    // Deliberate non-creation order (admin reorder): Third, First, Second
    await strapi.documents('api::page.page').update({
      documentId: pageDocumentId,
      data: {
        chapters: [page.chapters[2], page.chapters[0], page.chapters[1]],
      },
    });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('returns repeatable components in connect order', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        query getPage($documentId: ID!) {
          page(documentId: $documentId) {
            data {
              attributes {
                chapters {
                  title
                }
              }
            }
          }
        }
      `,
      variables: { documentId: pageDocumentId },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const chapters = res.body.data.page.data.attributes.chapters;
    const titles = chapters.map((chapter) => chapter.title ?? chapter.attributes?.title);

    expect(titles).toEqual(['Third', 'First', 'Second']);
  });

  test('returns repeatable components in connect order when sort is explicitly empty', async () => {
    const res = await graphqlQuery({
      query: /* GraphQL */ `
        query getPage($documentId: ID!) {
          page(documentId: $documentId) {
            data {
              attributes {
                chapters(sort: []) {
                  title
                }
              }
            }
          }
        }
      `,
      variables: { documentId: pageDocumentId },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.errors).toBeUndefined();

    const chapters = res.body.data.page.data.attributes.chapters;
    const titles = chapters.map((chapter) => chapter.title ?? chapter.attributes?.title);

    expect(titles).toEqual(['Third', 'First', 'Second']);
  });
});
