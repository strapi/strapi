import applyPopulate from '../apply';

/**
 * Tests for the morphToOne populate helper in apply.ts.
 *
 * Key behaviour under test:
 *  - The populated result row includes a `__type` field (or a custom typeField from morphColumn)
 *    that carries the target content-type UID.
 *  - When a result row has no morph target (null id / type columns) the attribute is set to null.
 */

// fromRow is the only piece of transform we need to isolate — mock it so tests
// don't depend on field/scalar serialisation internals.
jest.mock('../../transform', () => ({
  fromRow: jest.fn((_meta: unknown, row: unknown) => {
    if (row == null) return null;
    return row; // pass-through for test purposes
  }),
}));

const TARGET_TYPE = 'api::category.category';
const SOURCE_UID = 'api::article.article';
const ATTRIBUTE_NAME = 'related';

const buildMorphAttribute = (typeField?: string) => ({
  type: 'relation' as const,
  relation: 'morphToOne' as const,
  morphColumn: {
    idColumn: { name: 'related_id', referencedColumn: 'id' },
    typeColumn: { name: 'related_type' },
    ...(typeField ? { typeField } : {}),
  },
});

const buildCtx = (targetRows: Record<string, unknown>[], typeField?: string) => {
  const mockQb = {
    alias: 't',
    init: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(targetRows),
  };

  const db = {
    metadata: {
      get: jest.fn((type: string) => {
        if (type === SOURCE_UID) {
          return {
            attributes: {
              [ATTRIBUTE_NAME]: buildMorphAttribute(typeField),
            },
          };
        }
        // target type meta — only needs to exist (fromRow is mocked)
        return { columnToAttribute: {}, attributes: {} };
      }),
    },
    entityManager: {
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    },
  };

  const ctx = {
    db,
    uid: SOURCE_UID,
    qb: { state: { filters: {} } },
  };

  return { ctx, mockQb };
};

describe('morphToOne populate', () => {
  it('includes __type in the populated result', async () => {
    const targetRow = { id: 10, name: 'Category A' };
    const { ctx } = buildCtx([targetRow]);

    const results: Record<string, unknown>[] = [
      { id: 1, related_id: 10, related_type: TARGET_TYPE },
    ];

    await applyPopulate(results, { [ATTRIBUTE_NAME]: {} }, ctx as any);

    expect(results[0][ATTRIBUTE_NAME]).toEqual({
      __type: TARGET_TYPE,
      ...targetRow,
    });
  });

  it('uses a custom typeField from morphColumn when provided', async () => {
    const targetRow = { id: 10, name: 'Category A' };
    const { ctx } = buildCtx([targetRow], 'contentType');

    const results: Record<string, unknown>[] = [
      { id: 1, related_id: 10, related_type: TARGET_TYPE },
    ];

    await applyPopulate(results, { [ATTRIBUTE_NAME]: {} }, ctx as any);

    expect(results[0][ATTRIBUTE_NAME]).toEqual({
      contentType: TARGET_TYPE,
      ...targetRow,
    });
  });

  it('sets the attribute to null when the morph columns are empty', async () => {
    const { ctx } = buildCtx([]);

    const results: Record<string, unknown>[] = [{ id: 2, related_id: null, related_type: null }];

    await applyPopulate(results, { [ATTRIBUTE_NAME]: {} }, ctx as any);

    expect(results[0][ATTRIBUTE_NAME]).toBeNull();
  });

  it('handles mixed results — some with targets, some without', async () => {
    const targetRow = { id: 10, name: 'Category A' };
    const { ctx } = buildCtx([targetRow]);

    const results: Record<string, unknown>[] = [
      { id: 1, related_id: 10, related_type: TARGET_TYPE },
      { id: 2, related_id: null, related_type: null },
    ];

    await applyPopulate(results, { [ATTRIBUTE_NAME]: {} }, ctx as any);

    expect(results[0][ATTRIBUTE_NAME]).toEqual({ __type: TARGET_TYPE, ...targetRow });
    expect(results[1][ATTRIBUTE_NAME]).toBeNull();
  });

  it('morph type UID overwrites a same-named key on the target row (fromRow output)', async () => {
    const targetRow = {
      id: 10,
      name: 'Category A',
      // Same key as the default typeField: must not hide the real morph target type UID
      __type: 'unrelated-user-value',
    };
    const { ctx } = buildCtx([targetRow]);

    const results: Record<string, unknown>[] = [
      { id: 1, related_id: 10, related_type: TARGET_TYPE },
    ];

    await applyPopulate(results, { [ATTRIBUTE_NAME]: {} }, ctx as any);

    expect(results[0][ATTRIBUTE_NAME]).toEqual({
      ...targetRow,
      __type: TARGET_TYPE,
    });
  });
});

const MORPH_TO_MANY_ATTRIBUTE_NAME = 'relatedMany';
const TARGET_TYPE_B = 'api::tag.tag';
const TARGET_TYPE_C = 'api::author.author';

const buildMorphToManyAttribute = (
  overrides: {
    typeColumnName?: string;
    joinTableOn?: Record<string, unknown>;
  } = {}
) => ({
  type: 'relation' as const,
  relation: 'morphToMany' as const,
  joinTable: {
    name: 'articles_related_links',
    joinColumn: {
      name: 'article_id',
      referencedColumn: 'id',
    },
    morphColumn: {
      idColumn: {
        name: 'related_id',
        referencedColumn: 'id',
      },
      typeColumn: {
        name: overrides.typeColumnName ?? 'related_type',
      },
      ...(overrides.typeColumnName === 'component_type' ? { typeField: '__component' } : {}),
    },
    ...(overrides.joinTableOn ? { on: overrides.joinTableOn } : {}),
  },
});

const buildMorphToManyCtx = (
  joinRows: Record<string, unknown>[],
  targetRowsByType: Record<string, Record<string, unknown>[]>,
  options: {
    typeColumnName?: string;
    joinTableOn?: Record<string, unknown>;
  } = {}
) => {
  const joinQb = {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue(joinRows),
  };

  const targetQbs: Record<
    string,
    {
      alias: string;
      init: jest.Mock;
      addSelect: jest.Mock;
      where: jest.Mock;
      execute: jest.Mock;
    }
  > = {};

  const db = {
    metadata: {
      get: jest.fn((uid: string) => {
        if (uid === SOURCE_UID) {
          return {
            attributes: {
              [MORPH_TO_MANY_ATTRIBUTE_NAME]: buildMorphToManyAttribute(options),
            },
          };
        }

        if (uid in targetRowsByType) {
          return { columnToAttribute: {}, attributes: {} };
        }

        return undefined;
      }),
    },
    entityManager: {
      createQueryBuilder: jest.fn((uid: string) => {
        if (uid === 'articles_related_links') {
          return joinQb;
        }

        if (!targetQbs[uid]) {
          targetQbs[uid] = {
            alias: 't',
            init: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue(targetRowsByType[uid] ?? []),
          };
        }

        return targetQbs[uid];
      }),
    },
  };

  const ctx = {
    db,
    uid: SOURCE_UID,
    qb: { state: { filters: {} } },
  };

  return { ctx, joinQb, targetQbs, createQueryBuilder: db.entityManager.createQueryBuilder };
};

describe('morphToMany populate', () => {
  it('morph type UID overwrites a same-named key on each target row (fromRow output)', async () => {
    const targetRow = {
      id: 10,
      name: 'Category A',
      __type: 'unrelated-user-value',
    };

    const { ctx } = buildMorphToManyCtx(
      [
        {
          article_id: 1,
          related_id: 10,
          related_type: TARGET_TYPE,
          order: 1,
        },
      ],
      { [TARGET_TYPE]: [targetRow] }
    );

    const results: Record<string, unknown>[] = [{ id: 1 }];

    await applyPopulate(results, { [MORPH_TO_MANY_ATTRIBUTE_NAME]: {} }, ctx as any);

    expect(results[0][MORPH_TO_MANY_ATTRIBUTE_NAME]).toEqual([
      {
        ...targetRow,
        __type: TARGET_TYPE,
      },
    ]);
  });

  it('does not add the morph type column to the join-table where when populate.on is set', async () => {
    const { ctx, joinQb } = buildMorphToManyCtx(
      [
        {
          article_id: 1,
          related_id: 10,
          related_type: TARGET_TYPE,
          order: 1,
        },
      ],
      { [TARGET_TYPE]: [{ id: 10, name: 'Category A' }] }
    );

    const results: Record<string, unknown>[] = [{ id: 1 }];

    await applyPopulate(
      results,
      {
        [MORPH_TO_MANY_ATTRIBUTE_NAME]: {
          on: {
            [TARGET_TYPE]: {},
            [TARGET_TYPE_B]: {},
          },
        },
      },
      ctx as any
    );

    expect(joinQb.where).toHaveBeenCalledWith({
      article_id: [1],
    });
    expect(joinQb.where).not.toHaveBeenCalledWith(
      expect.objectContaining({
        related_type: expect.anything(),
      })
    );
  });

  it('applies populate.on type restrictions in memory after loading join rows', async () => {
    const categoryRow = { id: 10, name: 'Category A' };
    const tagRow = { id: 20, name: 'Tag B' };
    const authorRow = { id: 30, name: 'Author C' };

    const { ctx, createQueryBuilder } = buildMorphToManyCtx(
      [
        {
          article_id: 1,
          related_id: 10,
          related_type: TARGET_TYPE,
          order: 1,
        },
        {
          article_id: 1,
          related_id: 20,
          related_type: TARGET_TYPE_B,
          order: 2,
        },
        {
          article_id: 1,
          related_id: 30,
          related_type: TARGET_TYPE_C,
          order: 3,
        },
      ],
      {
        [TARGET_TYPE]: [categoryRow],
        [TARGET_TYPE_B]: [tagRow],
        [TARGET_TYPE_C]: [authorRow],
      }
    );

    const results: Record<string, unknown>[] = [{ id: 1 }];

    await applyPopulate(
      results,
      {
        [MORPH_TO_MANY_ATTRIBUTE_NAME]: {
          on: {
            [TARGET_TYPE]: {},
            [TARGET_TYPE_B]: {},
          },
        },
      },
      ctx as any
    );

    expect(results[0][MORPH_TO_MANY_ATTRIBUTE_NAME]).toEqual([
      { ...categoryRow, __type: TARGET_TYPE },
      { ...tagRow, __type: TARGET_TYPE_B },
    ]);
    expect(createQueryBuilder).toHaveBeenCalledWith(TARGET_TYPE);
    expect(createQueryBuilder).toHaveBeenCalledWith(TARGET_TYPE_B);
    expect(createQueryBuilder).not.toHaveBeenCalledWith(TARGET_TYPE_C);
  });

  it('returns no components when populate.on is an empty object', async () => {
    const { ctx } = buildMorphToManyCtx(
      [
        {
          article_id: 1,
          related_id: 10,
          related_type: TARGET_TYPE,
          order: 1,
        },
      ],
      { [TARGET_TYPE]: [{ id: 10, name: 'Category A' }] }
    );

    const results: Record<string, unknown>[] = [{ id: 1 }];

    await applyPopulate(
      results,
      {
        [MORPH_TO_MANY_ATTRIBUTE_NAME]: {
          on: {},
        },
      },
      ctx as any
    );

    expect(results[0][MORPH_TO_MANY_ATTRIBUTE_NAME]).toEqual([]);
  });

  it('populates every join row type when populate has no on key', async () => {
    const categoryRow = { id: 10, name: 'Category A' };
    const tagRow = { id: 20, name: 'Tag B' };

    const { ctx } = buildMorphToManyCtx(
      [
        {
          article_id: 1,
          related_id: 10,
          related_type: TARGET_TYPE,
          order: 1,
        },
        {
          article_id: 1,
          related_id: 20,
          related_type: TARGET_TYPE_B,
          order: 2,
        },
      ],
      {
        [TARGET_TYPE]: [categoryRow],
        [TARGET_TYPE_B]: [tagRow],
      }
    );

    const results: Record<string, unknown>[] = [{ id: 1 }];

    await applyPopulate(results, { [MORPH_TO_MANY_ATTRIBUTE_NAME]: {} }, ctx as any);

    expect(results[0][MORPH_TO_MANY_ATTRIBUTE_NAME]).toEqual([
      { ...categoryRow, __type: TARGET_TYPE },
      { ...tagRow, __type: TARGET_TYPE_B },
    ]);
  });

  it('uses dynamic-zone join table metadata without SQL type filtering', async () => {
    const heroRow = { id: 10, title: 'Hero' };

    const { ctx, joinQb } = buildMorphToManyCtx(
      [
        {
          article_id: 1,
          related_id: 10,
          component_type: TARGET_TYPE,
          field: MORPH_TO_MANY_ATTRIBUTE_NAME,
          order: 1,
        },
        {
          article_id: 1,
          related_id: 20,
          component_type: TARGET_TYPE_C,
          field: MORPH_TO_MANY_ATTRIBUTE_NAME,
          order: 2,
        },
      ],
      { [TARGET_TYPE]: [heroRow] },
      {
        typeColumnName: 'component_type',
        joinTableOn: { field: MORPH_TO_MANY_ATTRIBUTE_NAME },
      }
    );

    const results: Record<string, unknown>[] = [{ id: 1 }];

    await applyPopulate(
      results,
      {
        [MORPH_TO_MANY_ATTRIBUTE_NAME]: {
          on: {
            [TARGET_TYPE]: {},
          },
        },
      },
      ctx as any
    );

    expect(joinQb.where).toHaveBeenCalledWith({
      article_id: [1],
      field: MORPH_TO_MANY_ATTRIBUTE_NAME,
    });
    expect(joinQb.where).not.toHaveBeenCalledWith(
      expect.objectContaining({
        component_type: expect.anything(),
      })
    );
    expect(results[0][MORPH_TO_MANY_ATTRIBUTE_NAME]).toEqual([
      { ...heroRow, __component: TARGET_TYPE },
    ]);
  });
});
