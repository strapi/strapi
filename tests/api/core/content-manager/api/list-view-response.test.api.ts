import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

/**
 * The list view endpoint only returns what the list can display: no dynamic zones, no rich text,
 * blocks or json, and to-one relations reduced to the main field of their target.
 */
const ARTICLE_UID = 'api::article.article';

const component = {
  displayName: 'seo',
  attributes: {
    metaTitle: { type: 'string' },
  },
};

const category = {
  attributes: {
    name: { type: 'string' },
    description: { type: 'text' },
  },
  draftAndPublish: false,
  displayName: 'Category',
  singularName: 'category',
  pluralName: 'categories',
  description: '',
  collectionName: '',
};

const tag = {
  attributes: {
    name: { type: 'string' },
  },
  draftAndPublish: false,
  displayName: 'Tag',
  singularName: 'tag',
  pluralName: 'tags',
  description: '',
  collectionName: '',
};

const article = {
  attributes: {
    title: { type: 'string' },
    views: { type: 'integer' },
    body: { type: 'richtext' },
    content: { type: 'blocks' },
    data: { type: 'json' },
    seo: { type: 'component', component: 'default.seo' },
    sections: { type: 'dynamiczone', components: ['default.seo'] },
    category: { type: 'relation', relation: 'manyToOne', target: 'api::category.category' },
    tags: { type: 'relation', relation: 'manyToMany', target: 'api::tag.tag' },
  },
  pluginOptions: {
    i18n: { localized: true },
  },
  draftAndPublish: true,
  displayName: 'Article',
  singularName: 'article',
  pluralName: 'articles',
  description: '',
  collectionName: '',
};

describe('CM API - List view response', () => {
  const builder = createTestBuilder();
  let strapi: any;
  let rq: any;
  let documentId: string;
  let categoryDocumentId: string;

  beforeAll(async () => {
    await builder.addComponent(component).addContentTypes([category, tag, article]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    const createdCategory = await strapi
      .documents('api::category.category')
      .create({ data: { name: 'News', description: 'All the news' } });
    categoryDocumentId = createdCategory.documentId;

    const tags = await Promise.all(
      ['a', 'b'].map((name) => strapi.documents('api::tag.tag').create({ data: { name } }))
    );

    const created = await strapi.documents(ARTICLE_UID).create({
      locale: 'en',
      data: {
        title: 'Hello',
        views: 3,
        body: '# Rich text',
        content: [{ type: 'paragraph', children: [{ type: 'text', text: 'Blocks' }] }],
        data: { key: 'value' },
        seo: { metaTitle: 'Meta' },
        sections: [{ __component: 'default.seo', metaTitle: 'Section' }],
        category: { connect: [createdCategory.documentId] },
        tags: { connect: tags.map((t: any) => t.documentId) },
      },
    });
    documentId = created.documentId;
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  const findList = async () => {
    const res = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/${ARTICLE_UID}`,
      qs: { locale: 'en', page: 1, pageSize: 10 },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.results).toHaveLength(1);

    return res.body.results[0];
  };

  test('returns the fields the list can display', async () => {
    const row = await findList();

    expect(row).toMatchObject({
      documentId,
      title: 'Hello',
      views: 3,
      locale: 'en',
      publishedAt: null,
      status: 'draft',
      seo: { metaTitle: 'Meta' },
      tags: { count: 2 },
      localizations: [],
    });
    expect(row).toHaveProperty('createdAt');
    expect(row).toHaveProperty('updatedAt');
  });

  test('does not return dynamic zones, rich text, blocks and json', async () => {
    const row = await findList();

    expect(row).not.toHaveProperty('sections');
    expect(row).not.toHaveProperty('body');
    expect(row).not.toHaveProperty('content');
    expect(row).not.toHaveProperty('data');
  });

  test('reduces to-one relations to the main field of their target', async () => {
    const row = await findList();

    expect(row.category).toEqual({
      id: expect.anything(),
      documentId: categoryDocumentId,
      name: 'News',
    });
  });

  test('the edit view still returns the whole document', async () => {
    const res = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/${ARTICLE_UID}/${documentId}`,
      qs: { locale: 'en' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.data).toMatchObject({
      body: '# Rich text',
      data: { key: 'value' },
      sections: [{ __component: 'default.seo', metaTitle: 'Section' }],
    });
  });
});
