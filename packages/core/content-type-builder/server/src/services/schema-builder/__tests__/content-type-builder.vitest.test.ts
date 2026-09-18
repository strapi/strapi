import { describe, it, expect } from 'vitest';

import createSchemaHandler from '../schema-handler';
import createContentTypeBuilder from '../content-type-builder';

describe('content-type-builder setRelation', () => {
  it('preserves required on the target attribute when regenerating a bidirectional inverse', () => {
    const articleUid = 'api::article.article';
    const categoryUid = 'api::category.category';

    const article = createSchemaHandler({
      uid: articleUid,
      dir: '/tmp',
      filename: 'schema.json',
      schema: {
        kind: 'collectionType',
        collectionName: 'articles',
        info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
        options: {},
        attributes: {
          categories: {
            type: 'relation',
            relation: 'manyToMany',
            target: categoryUid,
            inversedBy: 'articles',
            required: true,
          },
        },
      } as any,
    });

    const category = createSchemaHandler({
      uid: categoryUid,
      dir: '/tmp',
      filename: 'schema.json',
      schema: {
        kind: 'collectionType',
        collectionName: 'categories',
        info: { singularName: 'category', pluralName: 'categories', displayName: 'Category' },
        options: {},
        attributes: {
          articles: {
            type: 'relation',
            relation: 'manyToMany',
            target: articleUid,
            mappedBy: 'categories',
          },
        },
      } as any,
    });

    const builder = {
      contentTypes: new Map([
        [articleUid, article],
        [categoryUid, category],
      ]),
      ...createContentTypeBuilder(),
    };

    // When both sides are in the payload, editing Category regenerates Article.categories
    builder.setRelation({
      key: 'articles',
      uid: categoryUid,
      attribute: {
        type: 'relation',
        relation: 'manyToMany',
        target: articleUid,
        targetAttribute: 'categories',
        dominant: false,
      },
    });

    expect(article.getAttribute('categories')).toMatchObject({
      type: 'relation',
      relation: 'manyToMany',
      target: categoryUid,
      inversedBy: 'articles',
      required: true,
    });
  });

  it('does not inherit required onto the inverse from the source attribute', () => {
    const articleUid = 'api::article.article';
    const categoryUid = 'api::category.category';

    const article = createSchemaHandler({
      uid: articleUid,
      dir: '/tmp',
      filename: 'schema.json',
      schema: {
        kind: 'collectionType',
        collectionName: 'articles',
        info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
        options: {},
        attributes: {
          categories: {
            type: 'relation',
            relation: 'manyToMany',
            target: categoryUid,
            inversedBy: 'articles',
            required: true,
          },
        },
      } as any,
    });

    const category = createSchemaHandler({
      uid: categoryUid,
      dir: '/tmp',
      filename: 'schema.json',
      schema: {
        kind: 'collectionType',
        collectionName: 'categories',
        info: { singularName: 'category', pluralName: 'categories', displayName: 'Category' },
        options: {},
        attributes: {
          articles: {
            type: 'relation',
            relation: 'manyToMany',
            target: articleUid,
            mappedBy: 'categories',
          },
        },
      } as any,
    });

    const builder = {
      contentTypes: new Map([
        [articleUid, article],
        [categoryUid, category],
      ]),
      ...createContentTypeBuilder(),
    };

    builder.setRelation({
      key: 'categories',
      uid: articleUid,
      attribute: {
        type: 'relation',
        relation: 'manyToMany',
        target: categoryUid,
        targetAttribute: 'articles',
        dominant: true,
        required: true,
      },
    });

    expect(category.getAttribute('articles').required).toBeUndefined();
  });
});
