import { findDocumentKeysWithOmittedRelations } from '../omitted-relations';

const ARTICLE_UID = 'api::article.article';
const TAG_UID = 'api::tag.tag';
const BLOCK_UID = 'default.block';

const models: Record<string, any> = {
  [ARTICLE_UID]: {
    uid: ARTICLE_UID,
    options: { draftAndPublish: true },
    attributes: {
      tag: { type: 'relation', relation: 'oneToOne', target: TAG_UID },
      block: { type: 'component', component: BLOCK_UID, repeatable: false },
    },
  },
  [TAG_UID]: {
    uid: TAG_UID,
    options: { draftAndPublish: true },
    attributes: { name: { type: 'string' } },
  },
  [BLOCK_UID]: {
    uid: BLOCK_UID,
    modelType: 'component',
    options: {},
    attributes: {
      tag: { type: 'relation', relation: 'oneToOne', target: TAG_UID },
    },
  },
};

const createStrapi = ({
  draft,
  published,
  publishedTargets,
}: {
  draft: any;
  published: any;
  publishedTargets: any[];
}) => {
  const findMany = jest.fn(async (params: { status?: string }) => {
    return params.status === 'published' ? [published] : [draft];
  });

  return {
    getModel: (uid: string) => models[uid],
    localization: {
      isLocalizedContentType: () => false,
    },
    documents: () => ({ findMany }),
    db: {
      query: () => ({
        findMany: jest.fn(async () => publishedTargets),
      }),
    },
  } as any;
};

describe('findDocumentKeysWithOmittedRelations', () => {
  it('marks a document whose published version is missing a relation to a now-published target', async () => {
    const strapi = createStrapi({
      draft: {
        documentId: 'article-1',
        locale: null,
        tag: { documentId: 'tag-1' },
        block: { tag: { documentId: 'tag-1' } },
      },
      published: {
        documentId: 'article-1',
        locale: null,
        tag: null,
        block: { tag: null },
      },
      publishedTargets: [{ documentId: 'tag-1' }],
    });

    const keys = await findDocumentKeysWithOmittedRelations(strapi, ARTICLE_UID, [
      { documentId: 'article-1', locale: null },
    ]);

    expect(keys).toEqual(new Set(['article-1\t']));
  });

  it('leaves the document in sync while the related entry is still draft-only', async () => {
    const strapi = createStrapi({
      draft: {
        documentId: 'article-1',
        locale: null,
        tag: { documentId: 'tag-1' },
        block: null,
      },
      published: {
        documentId: 'article-1',
        locale: null,
        tag: null,
        block: null,
      },
      publishedTargets: [],
    });

    const keys = await findDocumentKeysWithOmittedRelations(strapi, ARTICLE_UID, [
      { documentId: 'article-1', locale: null },
    ]);

    expect(keys).toEqual(new Set());
  });

  it('leaves the document in sync when the published version already has the relation', async () => {
    const strapi = createStrapi({
      draft: {
        documentId: 'article-1',
        locale: null,
        tag: { documentId: 'tag-1' },
        block: null,
      },
      published: {
        documentId: 'article-1',
        locale: null,
        tag: { documentId: 'tag-1' },
        block: null,
      },
      publishedTargets: [{ documentId: 'tag-1' }],
    });

    const keys = await findDocumentKeysWithOmittedRelations(strapi, ARTICLE_UID, [
      { documentId: 'article-1', locale: null },
    ]);

    expect(keys).toEqual(new Set());
  });
});
