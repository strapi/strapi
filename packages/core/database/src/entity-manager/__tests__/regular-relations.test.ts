import { cleanOrderColumns } from '../regular-relations';

describe('cleanOrderColumns', () => {
  beforeEach(() => {
    (global as any).strapi = {
      db: {
        dialect: {
          client: 'mysql',
        },
      },
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const attribute = {
    relation: 'manyToMany',
    inversedBy: 'documents',
    joinTable: {
      name: 'documents_categories_lnk',
      joinColumn: { name: 'document_id', referencedTable: 'documents' },
      inverseJoinColumn: { name: 'category_id', referencedTable: 'categories' },
      orderColumnName: 'document_order',
      inverseOrderColumnName: 'category_order',
    },
  } as any;

  const createDb = ({ selectResult }: { selectResult: any[] }) => {
    const raw = jest.fn().mockReturnValue({ transacting: jest.fn().mockResolvedValue(undefined) });
    const getConnection = jest.fn().mockReturnValue({ raw });

    const query: any = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      transacting: jest.fn().mockResolvedValue(selectResult),
    };

    const connection = jest.fn().mockReturnValue(query);

    const db = {
      connection,
      getConnection,
    };

    return { db, connection, query, getConnection, raw };
  };

  it('issues a single-table UPDATE ... CASE for the mysql order column (no multi-table UPDATE)', async () => {
    const { db, query, getConnection, raw } = createDb({
      selectResult: [{ id: 30 }, { id: 10 }, { id: 20 }],
    });

    await cleanOrderColumns({ attribute, db: db as any, id: 1 });

    expect(query.where).toHaveBeenCalledWith('document_id', 1);
    expect(query.orderBy).toHaveBeenCalledWith([
      { column: 'document_order' },
      { column: 'id' },
    ]);

    expect(getConnection).toHaveBeenCalled();
    const [sql, bindings] = raw.mock.calls[0];

    // Single target table only: statement never references the join table twice.
    expect(sql).not.toMatch(/,\s*\(/);
    expect(sql).not.toMatch(/\bAS b\b/);
    expect(sql).toMatch(/^UPDATE \?\? SET \?\? = CASE id (WHEN \? THEN \? ){3}END WHERE id IN \(\?, \?, \?\)$/);

    expect(bindings).toEqual([
      'documents_categories_lnk',
      'document_order',
      30,
      1,
      10,
      2,
      20,
      3,
      30,
      10,
      20,
    ]);
  });

  it('does not issue an UPDATE when there are no rows to reorder', async () => {
    const { db, getConnection } = createDb({ selectResult: [] });

    await cleanOrderColumns({ attribute, db: db as any, id: 1 });

    expect(getConnection).not.toHaveBeenCalled();
  });

  it('ranks the mysql inverse order column per partition (per inverseJoinColumn value)', async () => {
    const { db, raw } = createDb({
      selectResult: [
        { id: 1, category_id: 100 },
        { id: 2, category_id: 100 },
        { id: 3, category_id: 200 },
        { id: 4, category_id: 100 },
      ],
    });

    await cleanOrderColumns({ attribute, db: db as any, inverseRelIds: [100, 200] });

    const [sql, bindings] = raw.mock.calls[0];

    expect(sql).not.toMatch(/,\s*\(/);
    expect(sql).not.toMatch(/\bAS b\b/);

    expect(bindings).toEqual([
      'documents_categories_lnk',
      'category_order',
      1,
      1,
      2,
      2,
      3,
      1,
      4,
      3,
      1,
      2,
      3,
      4,
    ]);
  });
});
