import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

const ARTICLE_UID = 'api::article.article';
const TAG_UID = 'api::tag.tag';

const builder = createTestBuilder();
let strapi: any;
let rq: any;

const articleModel = {
  displayName: 'Article',
  singularName: 'article',
  pluralName: 'articles',
  draftAndPublish: true,
  attributes: {
    title: { type: 'string' },
    tags: {
      type: 'relation',
      relation: 'manyToMany',
      target: TAG_UID,
      targetAttribute: 'articles',
    },
    category: {
      type: 'relation',
      relation: 'manyToOne',
      target: TAG_UID,
      targetAttribute: 'articlesMo',
    },
  },
};

const tagModel = {
  displayName: 'Tag',
  singularName: 'tag',
  pluralName: 'tags',
  draftAndPublish: true,
  attributes: {
    name: { type: 'string' },
    articles: {
      type: 'relation',
      relation: 'manyToMany',
      target: ARTICLE_UID,
      mappedBy: 'tags',
    },
    articlesMo: {
      type: 'relation',
      relation: 'oneToMany',
      target: ARTICLE_UID,
      mappedBy: 'category',
    },
  },
};

describe('CM API - countDraftRelations splits bidirectional M2M from xToOne', () => {
  beforeAll(async () => {
    await builder.addContentType(tagModel).addContentType(articleModel).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('counts bidirectional M2M separately from manyToOne draft links', async () => {
    const {
      body: { data: draftTag },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${TAG_UID}`,
      body: { name: 'Draft tag' },
    });

    const {
      body: { data: article },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${ARTICLE_UID}`,
      body: {
        title: 'Article',
        tags: [draftTag.id],
        category: draftTag.id,
      },
    });

    const { body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/${ARTICLE_UID}/${article.documentId}/actions/countDraftRelations`,
    });

    expect(body.data.unpublishedRelations).toBe(1);
    expect(body.data.draftM2mLinks).toBe(1);
  });
});
