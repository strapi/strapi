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
