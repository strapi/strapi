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

describe('content-type-builder editContentType with retargeted relations', () => {
  const bookUid = 'api::book.book';
  const shelfUid = 'api::shelf.shelf';
  const bookcaseUid = 'api::bookcase.bookcase';
  const magazineUid = 'api::magazine.magazine';

  const oppositeRelation = {
    manyToOne: 'oneToMany',
    oneToOne: 'oneToOne',
    manyToMany: 'manyToMany',
  } as const;

  type OwnerRelation = keyof typeof oppositeRelation;

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

  const relation = (kind: string, target: string, targetAttribute: string) => ({
    type: 'relation',
    relation: kind,
    target,
    targetAttribute,
  });

  // Book.shelf owns the relation, Shelf.books is its inverse side
  const setStrapi = (kind: OwnerRelation) => {
    (global as any).strapi = {
      dirs: { app: { api: '/app/src/api', components: '/app/src/components' } },
      components: {},
      contentTypes: {
        [bookUid]: contentType(bookUid, 'book', {
          title: { type: 'string' },
          shelf: { type: 'relation', relation: kind, target: shelfUid, inversedBy: 'books' },
        }),
        [bookcaseUid]: contentType(bookcaseUid, 'bookcase', { name: { type: 'string' } }),
        [magazineUid]: contentType(magazineUid, 'magazine', { title: { type: 'string' } }),
        [shelfUid]: contentType(shelfUid, 'shelf', {
          name: { type: 'string' },
          books: {
            type: 'relation',
            relation: oppositeRelation[kind],
            target: bookUid,
            mappedBy: 'shelf',
          },
        }),
      },
    };
  };

  // Every order in which the update-schema payload can list the edited types
  const permutations = <T>(items: T[]): T[][] =>
    items.length <= 1
      ? [items]
      : items.flatMap((item, index) =>
          permutations([...items.slice(0, index), ...items.slice(index + 1)]).map((rest) => [
            item,
            ...rest,
          ])
        );

  const editAll = (edits: Record<string, Record<string, unknown>>, order: string[]) => {
    const builder = createBuilder();
    order.forEach((uid) => {
      builder.editContentType({
        uid,
        kind: 'collectionType',
        displayName: uid,
        draftAndPublish: false,
        attributes: edits[uid],
      });
    });
    return builder;
  };

  const attributesOf = (builder: any, uid: string) =>
    builder.contentTypes.get(uid).schema.attributes;

  // Same rule as the database boot check: both sides target each other, and exactly one
  // side owns the relation (inversedBy) while the other points back to it (mappedBy).
  const expectValidPair = (builder: any, [uidA, keyA]: string[], [uidB, keyB]: string[]) => {
    const a = attributesOf(builder, uidA)[keyA];
    const b = attributesOf(builder, uidB)[keyB];

    expect(a).toMatchObject({ type: 'relation', target: uidB });
    expect(b).toMatchObject({ type: 'relation', target: uidA });

    const aOwns = a.inversedBy === keyB && b.mappedBy === keyA;
    const bOwns = b.inversedBy === keyA && a.mappedBy === keyB;

    expect({ aOwns, bOwns }).toEqual(
      aOwns ? { aOwns: true, bOwns: false } : { aOwns: false, bOwns: true }
    );
  };

  describe.each(Object.keys(oppositeRelation) as OwnerRelation[])('%s owner', (kind) => {
    beforeEach(() => setStrapi(kind));

    it.each(permutations([bookUid, bookcaseUid, shelfUid]))(
      'keeps the owner when it is retargeted under its own name (%s, %s, %s)',
      (...order) => {
        const builder = editAll(
          {
            [bookUid]: {
              title: { type: 'string' },
              shelf: relation(kind, bookcaseUid, 'books'),
            },
            [bookcaseUid]: {
              name: { type: 'string' },
              books: relation(oppositeRelation[kind], bookUid, 'shelf'),
            },
            [shelfUid]: { name: { type: 'string' } },
          },
          order
        );

        expect(attributesOf(builder, shelfUid)).not.toHaveProperty('books');
        expectValidPair(builder, [bookUid, 'shelf'], [bookcaseUid, 'books']);
      }
    );

    it.each(permutations([bookUid, magazineUid, shelfUid]))(
      'keeps the pair when the inverse side is retargeted under its own name (%s, %s, %s)',
      (...order) => {
        const builder = editAll(
          {
            [shelfUid]: {
              name: { type: 'string' },
              books: relation(oppositeRelation[kind], magazineUid, 'shelf'),
            },
            [bookUid]: { title: { type: 'string' } },
            [magazineUid]: {
              title: { type: 'string' },
              shelf: relation(kind, shelfUid, 'books'),
            },
          },
          order
        );

        expect(attributesOf(builder, bookUid)).not.toHaveProperty('shelf');
        expectValidPair(builder, [shelfUid, 'books'], [magazineUid, 'shelf']);
      }
    );

    it.each(permutations([bookUid, shelfUid]))(
      'moves the owner to another inverse side on the same target (%s, %s)',
      (...order) => {
        const builder = editAll(
          {
            [bookUid]: {
              title: { type: 'string' },
              shelf: relation(kind, shelfUid, 'storedBooks'),
            },
            [shelfUid]: {
              name: { type: 'string' },
              storedBooks: relation(oppositeRelation[kind], bookUid, 'shelf'),
            },
          },
          order
        );

        expect(attributesOf(builder, shelfUid)).not.toHaveProperty('books');
        expectValidPair(builder, [bookUid, 'shelf'], [shelfUid, 'storedBooks']);
      }
    );

    it('keeps the attribute named by mappedBy when it owns another inverse side', () => {
      // Shelf.books names Book.shelf, but its owner is Book.mainShelf. Book.shelf owns
      // Shelf.archive. Both pairs boot: the database does not read the mappedBy name.
      const strapiState = (global as any).strapi;
      strapiState.contentTypes[bookUid].__schema__.attributes = {
        title: { type: 'string' },
        mainShelf: { type: 'relation', relation: kind, target: shelfUid, inversedBy: 'books' },
        shelf: {
          type: 'relation',
          relation: kind,
          target: shelfUid,
          inversedBy: 'archive',
          required: true,
        },
      };
      strapiState.contentTypes[shelfUid].__schema__.attributes = {
        name: { type: 'string' },
        books: {
          type: 'relation',
          relation: oppositeRelation[kind],
          target: bookUid,
          mappedBy: 'shelf',
        },
        archive: {
          type: 'relation',
          relation: oppositeRelation[kind],
          target: bookUid,
          mappedBy: 'shelf',
        },
      };

      const builder = editAll(
        {
          [shelfUid]: {
            name: { type: 'string' },
            archive: relation(oppositeRelation[kind], bookUid, 'shelf'),
          },
        },
        [shelfUid]
      );

      expect(attributesOf(builder, bookUid).shelf).toMatchObject({ required: true });
      expectValidPair(builder, [bookUid, 'shelf'], [shelfUid, 'archive']);
    });

    it('removes the counterpart on the old target when only the owner is edited', () => {
      const builder = editAll(
        {
          [bookUid]: {
            title: { type: 'string' },
            shelf: relation(kind, bookcaseUid, 'books'),
          },
        },
        [bookUid]
      );

      expect(attributesOf(builder, shelfUid)).not.toHaveProperty('books');
      expectValidPair(builder, [bookUid, 'shelf'], [bookcaseUid, 'books']);
    });

    it.each([
      ['owner', bookUid, shelfUid, 'books', { title: { type: 'string' } }],
      ['inverse side', shelfUid, bookUid, 'shelf', { name: { type: 'string' } }],
    ])(
      'removes the counterpart when the %s is deleted',
      (_label, editedUid, otherUid, otherKey, attributes) => {
        const builder = editAll({ [editedUid]: attributes }, [editedUid]);

        expect(attributesOf(builder, otherUid)).not.toHaveProperty(otherKey);
      }
    );
  });
});

describe('content-type-builder editContentType options', () => {
  const articleUid = 'api::article.article';

  beforeEach(() => {
    (global as any).strapi = {
      dirs: { app: { api: '/app/src/api', components: '/app/src/components' } },
      components: {},
      contentTypes: {
        [articleUid]: {
          uid: articleUid,
          apiName: 'article',
          modelName: 'article',
          info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
          __schema__: {
            kind: 'collectionType',
            collectionName: 'articles',
            info: { singularName: 'article', pluralName: 'articles', displayName: 'Article' },
            options: { draftAndPublish: true, populateCreatorFields: true },
            attributes: { title: { type: 'string' } },
          },
        },
      },
    };
  });

  const edit = (infos: Record<string, unknown>) => {
    const builder = createBuilder();
    builder.editContentType({
      uid: articleUid,
      displayName: 'Article',
      attributes: { title: { type: 'string' } },
      ...infos,
    });
    return builder.contentTypes.get(articleUid).schema.options;
  };

  it('keeps the stored draftAndPublish when the payload does not set it', () => {
    expect(edit({})).toMatchObject({ draftAndPublish: true });
  });

  it('uses draftAndPublish from the payload options when the top-level value is not set', () => {
    expect(edit({ options: { draftAndPublish: false } })).toMatchObject({
      draftAndPublish: false,
    });
  });

  it('uses the top-level draftAndPublish when the payload sets it', () => {
    expect(edit({ draftAndPublish: false, options: { draftAndPublish: true } })).toMatchObject({
      draftAndPublish: false,
    });
  });

  it('keeps the stored option keys when the payload does not send options', () => {
    expect(edit({})).toEqual({ draftAndPublish: true, populateCreatorFields: true });
  });

  it('keeps the stored option keys the payload options do not set', () => {
    expect(edit({ options: { custom: 'value' } })).toEqual({
      draftAndPublish: true,
      populateCreatorFields: true,
      custom: 'value',
    });
  });

  it('uses the payload value for an option key it sets', () => {
    expect(edit({ options: { populateCreatorFields: false } })).toEqual({
      draftAndPublish: true,
      populateCreatorFields: false,
    });
  });

  it('applies stored options, then payload options, then the resolved draftAndPublish', () => {
    expect(
      edit({
        draftAndPublish: false,
        options: { draftAndPublish: true, custom: 'value' },
      })
    ).toEqual({
      draftAndPublish: false,
      populateCreatorFields: true,
      custom: 'value',
    });
  });
});

describe('content-type-builder createContentType draftAndPublish', () => {
  beforeEach(() => {
    (global as any).strapi = {
      dirs: { app: { api: '/app/src/api', components: '/app/src/components' } },
      components: {},
      contentTypes: {},
    };
  });

  const create = (infos: Record<string, unknown>) => {
    const builder = createBuilder();
    const contentType = builder.createContentType({
      kind: 'collectionType',
      singularName: 'article',
      pluralName: 'articles',
      displayName: 'Article',
      attributes: { title: { type: 'string' } },
      ...infos,
    });
    const { options } = contentType.schema;
    if (options === undefined) {
      throw new Error('Expected the created content type to have options');
    }
    return options;
  };

  it('does not set draftAndPublish when the payload does not set it', () => {
    expect(create({}).draftAndPublish).toBeUndefined();
  });

  it('uses draftAndPublish from the payload options when the top-level value is not set', () => {
    expect(create({ options: { draftAndPublish: true } })).toMatchObject({
      draftAndPublish: true,
    });
  });

  it('uses the top-level draftAndPublish when the payload sets it', () => {
    expect(create({ draftAndPublish: false, options: { draftAndPublish: true } })).toMatchObject({
      draftAndPublish: false,
    });
  });
});
