import { deleteRelations } from '../regular-relations';
import { createQueryBuilder } from '../../query';

jest.mock('../../query', () => ({
  createQueryBuilder: jest.fn(),
}));

const JOIN_TABLE = 'links_tags_lnk';

const oneWayToMany = {
  type: 'relation',
  relation: 'oneToMany',
  target: 'api::tag.tag',
  joinTable: {
    name: JOIN_TABLE,
    joinColumn: { name: 'links_id', referencedColumn: 'id' },
    inverseJoinColumn: { name: 'tag_id', referencedColumn: 'id' },
    orderColumnName: 'tag_ord',
    orderBy: { tag_ord: 'asc' },
  },
} as any;

const bidirectionalManyToMany = {
  ...oneWayToMany,
  relation: 'manyToMany',
  inversedBy: 'links',
  joinTable: {
    ...oneWayToMany.joinTable,
    inverseOrderColumnName: 'links_ord',
  },
} as any;

/**
 * A chainable query builder whose `execute` resolves the queued results in order.
 */
const createBuilder = (results: unknown[] = []) => {
  const builder: Record<string, jest.Mock> = {};
  for (const method of ['select', 'delete', 'where', 'orderBy', 'limit', 'transacting']) {
    builder[method] = jest.fn(() => builder);
  }
  builder.execute = jest.fn(async () => results.shift());

  return builder;
};

const createDb = () => {
  const rawResult = { transacting: jest.fn() };
  const knexChain: Record<string, jest.Mock> = {};
  for (const method of ['select', 'rowNumber', 'where']) {
    knexChain[method] = jest.fn(() => knexChain);
  }
  knexChain.toSQL = jest.fn(() => ({ sql: 'select', bindings: [] }));

  const connection = Object.assign(
    jest.fn(() => knexChain),
    { raw: jest.fn(() => rawResult) }
  );

  return {
    connection,
    getConnection: jest.fn(() => ({ raw: jest.fn(() => rawResult) })),
    getSchemaName: jest.fn(() => undefined),
    metadata: new Map(),
  } as any;
};

describe('deleteRelations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.strapi = { db: { dialect: { client: 'sqlite' }, metadata: new Map() } } as any;
  });

  it('deletes every relation of a one-way to-many attribute with a single statement', async () => {
    const builder = createBuilder();
    (createQueryBuilder as jest.Mock).mockReturnValue(builder);
    const db = createDb();

    await deleteRelations({ id: 1, attribute: oneWayToMany, db, relIdsToDelete: 'all' });

    expect(createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(createQueryBuilder).toHaveBeenCalledWith(JOIN_TABLE, db);
    expect(builder.select).not.toHaveBeenCalled();
    expect(builder.delete).toHaveBeenCalledTimes(1);
    expect(builder.where).toHaveBeenCalledWith({ links_id: 1, tag_id: { $notIn: [] } });
    expect(builder.execute).toHaveBeenCalledTimes(1);
    // nothing left on this side, so no order column was renumbered
    expect(db.connection.raw).not.toHaveBeenCalled();
  });

  it('keeps the batched deletion when some relations of the entity are kept', async () => {
    // one batch: the select returns nothing, the delete runs, the order column is renumbered
    const builder = createBuilder([[], undefined]);
    (createQueryBuilder as jest.Mock).mockReturnValue(builder);
    const db = createDb();

    await deleteRelations({
      id: 1,
      attribute: oneWayToMany,
      db,
      relIdsToDelete: 'all',
      relIdsToNotDelete: [7],
    });

    expect(builder.select).toHaveBeenCalledWith('tag_id');
    expect(builder.delete).toHaveBeenCalledTimes(1);
    expect(db.connection.raw).toHaveBeenCalledTimes(1);
  });

  it('keeps the batched deletion when only some relations are deleted', async () => {
    const builder = createBuilder([[], undefined]);
    (createQueryBuilder as jest.Mock).mockReturnValue(builder);
    const db = createDb();

    await deleteRelations({ id: 1, attribute: oneWayToMany, db, relIdsToDelete: [5] });

    expect(builder.select).toHaveBeenCalledWith('tag_id');
    expect(builder.delete).toHaveBeenCalledTimes(1);
  });

  it('keeps the batched deletion for bidirectional attributes, whose other side is renumbered', async () => {
    const builder = createBuilder([[], undefined]);
    (createQueryBuilder as jest.Mock).mockReturnValue(builder);
    const db = createDb();

    await deleteRelations({ id: 1, attribute: bidirectionalManyToMany, db, relIdsToDelete: 'all' });

    expect(builder.select).toHaveBeenCalledWith('tag_id');
    expect(builder.delete).toHaveBeenCalledTimes(1);
  });
});
