import { describe, it, expect, beforeEach } from 'vitest';

import createSchemaHandler from '../schema-handler';
import createContentTypeBuilder from '../content-type-builder';
import createBuilder from '../index';

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

describe('content-type-builder editContentType with renamed relations', () => {
  const articleUid = 'api::article.article';
  const categoryUid = 'api::category.category';

  const contentType = (uid: string, singularName: string, attributes: Record<string, unknown>) => ({
    uid,
    apiName: singularName,
    modelName: singularName,
    info: { singularName, pluralName: `${singularName}s`, displayName: singularName },
    __schema__: {
      kind: 'collectionType',
      collectionName: `${singularName}s`,
      info: { singularName, pluralName: `${singularName}s`, displayName: singularName },
      options: {},
      attributes,
    },
  });

  beforeEach(() => {
    (global as any).strapi = {
      dirs: { app: { api: '/app/src/api', components: '/app/src/components' } },
      components: {},
      contentTypes: {
        [articleUid]: contentType(articleUid, 'article', {
          categories: {
            type: 'relation',
            relation: 'manyToMany',
            target: categoryUid,
            inversedBy: 'articles',
          },
          related: {
            type: 'relation',
            relation: 'manyToMany',
            target: articleUid,
            inversedBy: 'relatedBy',
          },
          relatedBy: {
            type: 'relation',
            relation: 'manyToMany',
            target: articleUid,
            mappedBy: 'related',
          },
        }),
        [categoryUid]: contentType(categoryUid, 'category', {
          articles: {
            type: 'relation',
            relation: 'manyToMany',
            target: articleUid,
            mappedBy: 'categories',
          },
        }),
      },
    };
  });

  const edit = (uid: string, attributes: Record<string, unknown>, renames: unknown[]) => {
    const builder = createBuilder();
    builder.editContentType({
      uid,
      kind: 'collectionType',
      displayName: uid,
      draftAndPublish: false,
      renames,
      attributes,
    });
    return builder;
  };

  it('keeps the inverse side inverse when it is renamed', () => {
    const builder = edit(
      categoryUid,
      {
        posts: {
          type: 'relation',
          relation: 'manyToMany',
          target: articleUid,
          targetAttribute: 'categories',
        },
      },
      [{ oldName: 'articles', newName: 'posts' }]
    );

    const category = builder.contentTypes.get(categoryUid).schema.attributes;
    const article = builder.contentTypes.get(articleUid).schema.attributes;

    expect(category).not.toHaveProperty('articles');
    expect(category.posts).toMatchObject({ mappedBy: 'categories' });
    expect(category.posts).not.toHaveProperty('inversedBy');
    expect(article.categories).toMatchObject({ inversedBy: 'posts' });
    expect(article.categories).not.toHaveProperty('mappedBy');
  });

  it('keeps the owning side dominant when it is renamed', () => {
    const builder = edit(
      articleUid,
      {
        sections: {
          type: 'relation',
          relation: 'manyToMany',
          target: categoryUid,
          targetAttribute: 'articles',
        },
      },
      [
        { oldName: 'categories', newName: 'tmp' },
        { oldName: 'tmp', newName: 'sections' },
      ]
    );

    const category = builder.contentTypes.get(categoryUid).schema.attributes;
    const article = builder.contentTypes.get(articleUid).schema.attributes;

    expect(article.sections).toMatchObject({ inversedBy: 'articles' });
    expect(article.sections).not.toHaveProperty('mappedBy');
    expect(category.articles).toMatchObject({ mappedBy: 'sections' });
  });

  it.each([
    ['owning', 'related', 'linked', { linked: 'inversedBy', relatedBy: 'mappedBy' }],
    ['inverse', 'relatedBy', 'linkedBy', { related: 'inversedBy', linkedBy: 'mappedBy' }],
  ])(
    'keeps ownership when the %s side of a self-referencing relation is renamed',
    (_label, oldName, newName, expected) => {
      const [owner, inverse] = Object.keys(expected);
      const selfRelation = (targetAttribute: string) => ({
        type: 'relation',
        relation: 'manyToMany',
        target: articleUid,
        targetAttribute,
      });

      const builder = edit(
        articleUid,
        {
          categories: {
            type: 'relation',
            relation: 'manyToMany',
            target: categoryUid,
            targetAttribute: 'articles',
          },
          [owner]: selfRelation(inverse),
          [inverse]: selfRelation(owner),
        },
        [{ oldName, newName }]
      );

      const article = builder.contentTypes.get(articleUid).schema.attributes;

      expect(article[owner]).toMatchObject({ inversedBy: inverse });
      expect(article[owner]).not.toHaveProperty('mappedBy');
      expect(article[inverse]).toMatchObject({ mappedBy: owner });
      expect(article[inverse]).not.toHaveProperty('inversedBy');
    }
  );
});
