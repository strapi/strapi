import type { Internal } from '@strapi/types';

import { getDeepPopulate } from '../populate';

const ARTICLE_UID = 'api::article.article' as Internal.UID.ContentType;
const CATEGORY_UID = 'api::category.category' as Internal.UID.ContentType;

const articleModel = {
  uid: ARTICLE_UID,
  modelType: 'contentType' as const,
  kind: 'collectionType' as const,
  info: { displayName: 'Article', singularName: 'article', pluralName: 'articles' },
  options: { draftAndPublish: true },
  attributes: {
    title: { type: 'string' as const },
    // Polymorphic relations that can point to any content type
    related: { type: 'relation' as const, relation: 'morphToOne' as const },
    relatedMany: { type: 'relation' as const, relation: 'morphToMany' as const },
    // Inverse polymorphic (storage still lives on the morphTo* owner side; must be included in deep populate)
    fromRelated: {
      type: 'relation' as const,
      relation: 'morphOne' as const,
      target: ARTICLE_UID,
      morphBy: 'related' as const,
    },
    fromRelatedMany: {
      type: 'relation' as const,
      relation: 'morphMany' as const,
      target: ARTICLE_UID,
      morphBy: 'relatedMany' as const,
    },
    // Regular relation with a fixed target
    category: {
      type: 'relation' as const,
      relation: 'manyToOne' as const,
      target: CATEGORY_UID,
    },
    // Virtual relation not managed by the DB layer — must be excluded
    virtualRel: {
      type: 'relation' as const,
      relation: 'oneToMany' as const,
      target: CATEGORY_UID,
      unstable_virtual: true,
    },
  },
};

describe('getDeepPopulate', () => {
  let result: Record<string, unknown>;

  beforeAll(() => {
    global.strapi = { getModel: () => articleModel } as any;
    result = getDeepPopulate(ARTICLE_UID);
  });

  it('includes morphToOne relations', () => {
    expect(result).toHaveProperty('related');
  });

  it('includes morphToMany relations', () => {
    expect(result).toHaveProperty('relatedMany');
  });

  it('includes morphOne relations (inverse of morphToOne / morphToMany on the target)', () => {
    expect(result).toHaveProperty('fromRelated');
  });

  it('includes morphMany relations (inverse of morphToMany on the target)', () => {
    expect(result).toHaveProperty('fromRelatedMany');
  });

  it('includes regular relations', () => {
    expect(result).toHaveProperty('category');
  });

  it('excludes unstable_virtual relations', () => {
    expect(result).not.toHaveProperty('virtualRel');
  });

  it('does not include scalar attributes', () => {
    expect(result).not.toHaveProperty('title');
  });
});

describe('getDeepPopulate with relations disabled', () => {
  const PAGE_UID = 'api::page.page' as Internal.UID.ContentType;
  const SEO_UID = 'shared.seo' as Internal.UID.Component;

  const pageModel = {
    uid: PAGE_UID,
    modelType: 'contentType' as const,
    kind: 'collectionType' as const,
    info: { displayName: 'Page', singularName: 'page', pluralName: 'pages' },
    options: { draftAndPublish: true },
    attributes: {
      title: { type: 'string' as const },
      cover: { type: 'media' as const, multiple: false },
      seo: { type: 'component' as const, component: SEO_UID, repeatable: false },
      categories: {
        type: 'relation' as const,
        relation: 'oneToMany' as const,
        target: CATEGORY_UID,
      },
    },
  };

  const seoModel = {
    uid: SEO_UID,
    modelType: 'component' as const,
    category: 'shared',
    info: { displayName: 'Seo' },
    attributes: {
      metaTitle: { type: 'string' as const },
      image: { type: 'media' as const, multiple: false },
      category: { type: 'relation' as const, relation: 'oneToOne' as const, target: CATEGORY_UID },
    },
  };

  beforeAll(() => {
    global.strapi = {
      getModel: (uid: string) => (uid === SEO_UID ? seoModel : pageModel),
    } as any;
  });

  it('leaves relations out at every level and keeps components and media', () => {
    const result = getDeepPopulate(PAGE_UID, { relations: false });

    expect(result).toEqual({
      cover: { select: ['*'] },
      seo: { populate: { image: { select: ['*'] } } },
    });
  });

  it('does not share its cache entry with the default populate', () => {
    expect(getDeepPopulate(PAGE_UID)).toHaveProperty('categories');
    expect(getDeepPopulate(PAGE_UID, { relations: false })).not.toHaveProperty('categories');
  });
});
