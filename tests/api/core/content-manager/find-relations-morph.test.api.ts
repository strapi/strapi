import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

const articleUid = 'api::article.article';

const articleModel = {
  displayName: 'Article',
  singularName: 'article',
  pluralName: 'articles',
  draftAndPublish: false,
  attributes: {
    title: {
      type: 'string',
    },
    morph_to_one: {
      type: 'relation',
      relation: 'morphToOne',
    },
    morph_to_many: {
      type: 'relation',
      relation: 'morphToMany',
    },
  },
};

describe('Find Relations - morph-to fields', () => {
  const builder = createTestBuilder();
  let strapi: any;
  let rq: any;
  let articleDocumentId: string;

  beforeAll(async () => {
    await builder.addContentType(articleModel).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const article = await strapi.documents(articleUid).create({ data: { title: 'Article' } });
    articleDocumentId = article.documentId;
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  // A morph-to field has no single target model, so the relation endpoints cannot answer for it
  describe.each(['morph_to_one', 'morph_to_many'])('%s', (field) => {
    const expectedError = {
      data: null,
      error: {
        message: `The relational field ${field} on ${articleUid} has no target model`,
        name: 'ValidationError',
        status: 400,
      },
    };

    test('Find available fails with a validation error', async () => {
      const res = await rq({
        method: 'GET',
        url: `/content-manager/relations/${articleUid}/${field}`,
      });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject(expectedError);
    });

    test('Find existing fails with a validation error', async () => {
      const res = await rq({
        method: 'GET',
        url: `/content-manager/relations/${articleUid}/${articleDocumentId}/${field}`,
      });

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject(expectedError);
    });
  });
});
