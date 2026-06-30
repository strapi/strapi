import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

const ARTICLE_UID = 'api::article.article';
const TAG_UID = 'api::tag.tag';

const builder = createTestBuilder();
let strapi: any;
let rq: any;

const tagModel = {
  displayName: 'Tag',
  singularName: 'tag',
  pluralName: 'tags',
  draftAndPublish: true,
  attributes: {
    name: { type: 'string' },
  },
};

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

  test('returns 0 when bidirectional M2M links use draft rows of published entries', async () => {
    const {
      body: {
        data: { documentId: tagDocumentId },
      },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${TAG_UID}`,
      body: { name: 'Published tag' },
    });

    await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${TAG_UID}/${tagDocumentId}/actions/publish`,
    });

    const {
      body: { data: draftTagRow },
    } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/${TAG_UID}/${tagDocumentId}`,
      qs: { status: 'draft' },
    });

    const {
      body: { data: article },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${ARTICLE_UID}`,
      body: {
        title: 'Article',
        tags: [draftTagRow.id],
      },
    });

    const { body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/${ARTICLE_UID}/${article.documentId}/actions/countDraftRelations`,
    });

    expect(body.data.unpublishedRelations).toBe(0);
    expect(body.data.draftM2mLinks).toBe(0);
  });

  test('returns 0 for bidirectional M2M links to published entries only', async () => {
    const {
      body: {
        data: { documentId: tagDocumentId },
      },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${TAG_UID}`,
      body: { name: 'Published tag' },
    });

    const {
      body: { data: publishedTag },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${TAG_UID}/${tagDocumentId}/actions/publish`,
    });

    const {
      body: { data: article },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${ARTICLE_UID}`,
      body: {
        title: 'Article',
        tags: [publishedTag.id],
      },
    });

    const { body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/${ARTICLE_UID}/${article.documentId}/actions/countDraftRelations`,
    });

    expect(body.data.unpublishedRelations).toBe(0);
    expect(body.data.draftM2mLinks).toBe(0);
  });

  test('counts only draft-only bidirectional M2M links when mixed with published entries', async () => {
    const {
      body: { data: draftTag },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${TAG_UID}`,
      body: { name: 'Draft tag' },
    });

    const {
      body: {
        data: { documentId: publishedTagDocumentId },
      },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${TAG_UID}`,
      body: { name: 'Published tag' },
    });

    await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${TAG_UID}/${publishedTagDocumentId}/actions/publish`,
    });

    const {
      body: { data: publishedTagDraftRow },
    } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/${TAG_UID}/${publishedTagDocumentId}`,
      qs: { status: 'draft' },
    });

    const {
      body: { data: article },
    } = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${ARTICLE_UID}`,
      body: {
        title: 'Article',
        tags: [draftTag.id, publishedTagDraftRow.id],
      },
    });

    const { body } = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/${ARTICLE_UID}/${article.documentId}/actions/countDraftRelations`,
    });

    expect(body.data.unpublishedRelations).toBe(0);
    expect(body.data.draftM2mLinks).toBe(1);
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
