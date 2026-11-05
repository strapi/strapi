import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

const ARTICLE_UID = 'api::article.article';
const TAG_UID = 'api::tag.tag';
const AUTHOR_UID = 'api::author.author';
const BLOCK_UID = 'default.block';

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

const authorModel = {
  displayName: 'Author',
  singularName: 'author',
  pluralName: 'authors',
  draftAndPublish: true,
  attributes: {
    name: { type: 'string' },
  },
};

const blockModel = {
  displayName: 'block',
  attributes: {
    tag: {
      type: 'relation',
      relation: 'oneToOne',
      target: TAG_UID,
    },
  },
};

const articleModel = {
  displayName: 'Article',
  singularName: 'article',
  pluralName: 'articles',
  draftAndPublish: true,
  attributes: {
    title: { type: 'string' },
    tag: {
      type: 'relation',
      relation: 'oneToOne',
      target: TAG_UID,
    },
    author: {
      type: 'relation',
      relation: 'manyToOne',
      target: AUTHOR_UID,
      targetAttribute: 'articles',
    },
    block: {
      type: 'component',
      repeatable: false,
      component: BLOCK_UID,
    },
  },
};

const formatDocument = (uid: string, document: { documentId: string }) =>
  strapi
    .plugin('content-manager')
    .service('document-metadata')
    .formatDocumentWithMetadata(uid, document, {});

const readDocument = async (uid: string, documentId: string, status: 'draft' | 'published') => {
  const entry = await strapi.documents(uid).findOne({
    documentId,
    status,
    populate: {
      tag: true,
      author: true,
      block: { populate: { tag: true } },
    },
  });
  const { data } = await formatDocument(uid, entry);
  return { entry, status: data.status as string };
};

describe('CM status when publish drops a relation', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes([tagModel, authorModel])
      .addComponent(blockModel)
      .addContentTypes([articleModel])
      .build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    await strapi?.destroy();
    await builder.cleanup();
  });

  test('marks the parent modified once a dropped unidirectional or component relation can be republished', async () => {
    const tag = await strapi.documents(TAG_UID).create({ data: { name: 'Tag' } });
    const article = await strapi.documents(ARTICLE_UID).create({
      data: {
        title: 'With tag',
        tag: { documentId: tag.documentId },
        block: { tag: { documentId: tag.documentId } },
      },
    });

    await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

    const beforeTargetPublish = await readDocument(ARTICLE_UID, article.documentId, 'published');
    expect(beforeTargetPublish.entry.tag).toBeNull();
    expect(beforeTargetPublish.entry.block.tag).toBeNull();
    expect(beforeTargetPublish.status).toBe('published');

    await strapi.documents(TAG_UID).publish({ documentId: tag.documentId });

    const afterTargetPublish = await readDocument(ARTICLE_UID, article.documentId, 'draft');
    expect(afterTargetPublish.entry.tag.documentId).toBe(tag.documentId);
    expect(afterTargetPublish.status).toBe('modified');

    const publishedAfterTarget = await strapi.documents(ARTICLE_UID).findOne({
      documentId: article.documentId,
      status: 'published',
      populate: { tag: true, block: { populate: { tag: true } } },
    });
    expect(publishedAfterTarget.tag).toBeNull();
    expect(publishedAfterTarget.block.tag).toBeNull();

    const list = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/${ARTICLE_UID}`,
      qs: { page: 1, pageSize: 10 },
    });
    const listed = list.body.results.find(
      (result: { documentId: string }) => result.documentId === article.documentId
    );
    expect(listed.status).toBe('modified');

    await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

    const republished = await readDocument(ARTICLE_UID, article.documentId, 'published');
    expect(republished.entry.tag.documentId).toBe(tag.documentId);
    expect(republished.entry.block.tag.documentId).toBe(tag.documentId);
    expect(republished.status).toBe('published');
  });

  test('does not mark the parent modified when a bidirectional relation is restored on its own', async () => {
    const author = await strapi.documents(AUTHOR_UID).create({ data: { name: 'Author' } });
    const article = await strapi.documents(ARTICLE_UID).create({
      data: {
        title: 'With author',
        author: { documentId: author.documentId },
      },
    });

    await strapi.documents(ARTICLE_UID).publish({ documentId: article.documentId });

    const publishedBefore = await strapi.documents(ARTICLE_UID).findOne({
      documentId: article.documentId,
      status: 'published',
      populate: { author: true },
    });
    expect(publishedBefore.author).toBeNull();

    await strapi.documents(AUTHOR_UID).publish({ documentId: author.documentId });

    const after = await readDocument(ARTICLE_UID, article.documentId, 'published');
    expect(after.entry.author.documentId).toBe(author.documentId);
    expect(after.status).toBe('published');
  });
});
