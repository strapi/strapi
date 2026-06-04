import applyPopulate from '../apply';

//  Fix: changed to `!_.isEmpty(populateValue.orderBy)` so that only a non-empty orderBy suppresses the join-table order column.

jest.mock('../../transform', () => ({
  fromRow: jest.fn((_meta: unknown, row: unknown) => {
    if (Array.isArray(row)) return row;
    if (row == null) return null;
    return row;
  }),
}));

const SOURCE_UID = 'api::article.article';
const TARGET_UID = 'api::category.category';
const ATTRIBUTE_NAME = 'categories';

/**
 * Builds a mocked DB + ctx whose manyToMany join call captures
 * the `orderBy` argument that was passed to `.join()`.
 */
const buildCtx = () => {
  let capturedJoinOrderBy: unknown = 'NOT_CALLED';

  const populateQb = {
    alias: 'c0',
    getAlias: jest.fn().mockReturnValue('j0'),
    init: jest.fn().mockReturnThis(),
    join: jest.fn(), // implementation set below to avoid TS7022 self-reference
    addSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    execute: jest.fn().mockResolvedValue([]),
  };

  // Set after construction so populateQb is fully defined before being referenced
  populateQb.join.mockImplementation((opts: { orderBy?: unknown }) => {
    capturedJoinOrderBy = opts.orderBy;
    return populateQb;
  });

  const db = {
    metadata: {
      get: jest.fn((uid: string) => {
        if (uid === SOURCE_UID) {
          return {
            attributes: {
              [ATTRIBUTE_NAME]: {
                type: 'relation',
                relation: 'manyToMany',
                target: TARGET_UID,
                joinTable: {
                  name: 'articles_categories_links',
                  joinColumn: { name: 'article_id', referencedColumn: 'id' },
                  inverseJoinColumn: { name: 'category_id', referencedColumn: 'id' },
                  // This is the UI drag-and-drop order column
                  orderBy: { order: 'asc' },
                },
              },
            },
          };
        }
        return { columnToAttribute: {}, attributes: {} };
      }),
    },
    entityManager: {
      createQueryBuilder: jest.fn().mockReturnValue(populateQb),
    },
  };

  const ctx = {
    db,
    uid: SOURCE_UID,
    qb: { alias: 'a0', state: { filters: {} } },
  };

  return { ctx, getCapturedJoinOrderBy: () => capturedJoinOrderBy };
};

describe('getJoinTableOrderBy — relation sort order fix', () => {
  it('uses join-table UI order when populateValue has no orderBy at all', async () => {
    const { ctx, getCapturedJoinOrderBy } = buildCtx();
    const results = [{ id: 1 }];

    await applyPopulate(results, { [ATTRIBUTE_NAME]: {} }, ctx as any);

    // No orderBy on populateValue → joinTable.orderBy should be forwarded
    expect(getCapturedJoinOrderBy()).toEqual({ order: 'asc' });
  });

  it('uses join-table UI order when populateValue.orderBy is an empty array (regression)', async () => {
    const { ctx, getCapturedJoinOrderBy } = buildCtx();
    const results = [{ id: 1 }];

    // Empty array is the default value the query-params transformer emits when
    // no ?sort param is passed. Before the fix this was truthy and dropped the UI order.
    await applyPopulate(results, { [ATTRIBUTE_NAME]: { orderBy: [] } }, ctx as any);

    expect(getCapturedJoinOrderBy()).toEqual({ order: 'asc' });
  });

  it('uses join-table UI order when populateValue.orderBy is an empty object (regression)', async () => {
    const { ctx, getCapturedJoinOrderBy } = buildCtx();
    const results = [{ id: 1 }];

    await applyPopulate(results, { [ATTRIBUTE_NAME]: { orderBy: {} } }, ctx as any);

    expect(getCapturedJoinOrderBy()).toEqual({ order: 'asc' });
  });

  it('suppresses join-table UI order when a real orderBy is provided by the caller', async () => {
    const { ctx, getCapturedJoinOrderBy } = buildCtx();
    const results = [{ id: 1 }];

    // A real sort requested by the API consumer should override UI order
    await applyPopulate(
      results,
      { [ATTRIBUTE_NAME]: { orderBy: [{ column: 'name', order: 'asc' }] } },
      ctx as any
    );

    // join-table orderBy must be undefined (suppressed) when an explicit sort is present
    expect(getCapturedJoinOrderBy()).toBeUndefined();
  });
});
