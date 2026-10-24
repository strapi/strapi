import type { Model } from '../types';

/**
 * Shared models used by the benchmarks. They mimic a realistic content-type graph with
 * relations, components, dynamic zones and media so that the traversal logic is exercised.
 */
export const models: Record<string, Model> = {
  'admin::user': {
    uid: 'admin::user',
    modelType: 'contentType',
    kind: 'collectionType',
    info: { singularName: 'user', pluralName: 'users', displayName: 'User' },
    options: {},
    attributes: {
      id: { type: 'integer' },
      firstname: { type: 'string' },
      lastname: { type: 'string' },
      email: { type: 'email', private: true },
      password: { type: 'password', private: true },
    },
  },
  'plugin::upload.file': {
    uid: 'plugin::upload.file',
    modelType: 'contentType',
    kind: 'collectionType',
    info: { singularName: 'file', pluralName: 'files', displayName: 'File' },
    options: {},
    attributes: {
      id: { type: 'integer' },
      name: { type: 'string' },
      url: { type: 'string' },
      mime: { type: 'string' },
      size: { type: 'decimal' },
    },
  },
  'api::author.author': {
    uid: 'api::author.author',
    modelType: 'contentType',
    kind: 'collectionType',
    info: { singularName: 'author', pluralName: 'authors', displayName: 'Author' },
    options: {},
    attributes: {
      id: { type: 'integer' },
      name: { type: 'string' },
      bio: { type: 'text' },
      secret: { type: 'string', private: true },
      avatar: { type: 'media', multiple: false },
      articles: {
        type: 'relation',
        relation: 'oneToMany',
        target: 'api::article.article',
        mappedBy: 'author',
      },
    },
  },
  'api::article.article': {
    uid: 'api::article.article',
    modelType: 'contentType',
    kind: 'collectionType',
    info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
    options: { draftAndPublish: true },
    attributes: {
      id: { type: 'integer' },
      documentId: { type: 'string' },
      title: { type: 'string' },
      slug: { type: 'uid', targetField: 'title' },
      content: { type: 'richtext' },
      views: { type: 'integer' },
      rating: { type: 'float' },
      featured: { type: 'boolean' },
      internalNotes: { type: 'text', private: true },
      cover: { type: 'media', multiple: false },
      gallery: { type: 'media', multiple: true },
      author: {
        type: 'relation',
        relation: 'manyToOne',
        target: 'api::author.author',
        inversedBy: 'articles',
      },
      seo: { type: 'component', component: 'shared.seo', repeatable: false },
      blocks: { type: 'dynamiczone', components: ['shared.quote', 'shared.seo'] },
      createdAt: { type: 'datetime' },
      updatedAt: { type: 'datetime' },
      publishedAt: { type: 'datetime' },
      createdBy: { type: 'relation', relation: 'oneToOne', target: 'admin::user' },
      updatedBy: { type: 'relation', relation: 'oneToOne', target: 'admin::user' },
    },
  },
  'shared.seo': {
    uid: 'shared.seo',
    modelType: 'component',
    info: { displayName: 'Seo' },
    options: {},
    attributes: {
      id: { type: 'integer' },
      metaTitle: { type: 'string' },
      metaDescription: { type: 'text' },
      shareImage: { type: 'media', multiple: false },
    },
  },
  'shared.quote': {
    uid: 'shared.quote',
    modelType: 'component',
    info: { displayName: 'Quote' },
    options: {},
    attributes: {
      id: { type: 'integer' },
      body: { type: 'text' },
      author: { type: 'string' },
    },
  },
} as Record<string, Model>;

/**
 * Minimal `strapi` global stub: some sanitizers/validators read the global configuration
 * (e.g. `api.responses.privateAttributes`).
 */
export const setupStrapiGlobal = () => {
  (globalThis as any).strapi = {
    contentTypes: Object.fromEntries(
      Object.entries(models).filter(([, model]) => model.modelType === 'contentType')
    ),
    components: Object.fromEntries(
      Object.entries(models).filter(([, model]) => model.modelType === 'component')
    ),
    config: {
      get: (_path: string, defaultValue?: unknown) => defaultValue,
    },
  };
};

export const getModel = (uid: string): Model => models[uid];

export const articleModel = models['api::article.article'];

export const makeArticle = (index: number) => ({
  id: index,
  documentId: `doc-${index}`,
  title: `Article ${index}`,
  slug: `article-${index}`,
  content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(5),
  views: index * 10,
  rating: 4.5,
  featured: index % 2 === 0,
  internalNotes: 'do not leak',
  cover: { id: index, name: 'cover.png', url: '/uploads/cover.png', mime: 'image/png' },
  gallery: [
    { id: 1, name: 'a.png', url: '/uploads/a.png', mime: 'image/png' },
    { id: 2, name: 'b.png', url: '/uploads/b.png', mime: 'image/png' },
  ],
  author: {
    id: 1,
    name: 'Jane Doe',
    bio: 'Writer',
    secret: 'hidden',
    avatar: { id: 3, name: 'avatar.png', url: '/uploads/avatar.png', mime: 'image/png' },
  },
  seo: {
    id: index,
    metaTitle: `Article ${index}`,
    metaDescription: 'Description',
    shareImage: { id: 4, name: 'share.png', url: '/uploads/share.png', mime: 'image/png' },
  },
  blocks: [
    { __component: 'shared.quote', id: 1, body: 'Quote body', author: 'Someone' },
    { __component: 'shared.seo', id: 2, metaTitle: 'Nested', metaDescription: 'Nested seo' },
  ],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-02T00:00:00.000Z',
  publishedAt: '2024-01-03T00:00:00.000Z',
  createdBy: { id: 1, firstname: 'Admin', lastname: 'User', email: 'a@b.c', password: 'x' },
  updatedBy: { id: 1, firstname: 'Admin', lastname: 'User', email: 'a@b.c', password: 'x' },
});

export const complexQuery = {
  filters: {
    $and: [
      { title: { $containsi: 'strapi' } },
      { views: { $gt: 100 } },
      { $or: [{ featured: true }, { rating: { $gte: 4 } }] },
      { author: { name: { $eq: 'Jane Doe' } } },
      { createdAt: { $between: ['2024-01-01T00:00:00.000Z', '2024-12-31T00:00:00.000Z'] } },
    ],
  },
  sort: ['title:asc', 'createdAt:desc', 'author.name:asc'],
  fields: ['title', 'slug', 'views', 'rating', 'featured'],
  populate: {
    author: { fields: ['name', 'bio'], populate: { avatar: true } },
    cover: true,
    gallery: { fields: ['name', 'url'] },
    seo: { populate: ['shareImage'] },
    blocks: {
      on: {
        'shared.quote': { fields: ['body', 'author'] },
        'shared.seo': { populate: '*' },
      },
    },
  },
  page: 2,
  pageSize: 25,
};
