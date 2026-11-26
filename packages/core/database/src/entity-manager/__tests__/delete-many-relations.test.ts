import { createEntityManager } from '../index';
import { createQueryBuilder } from '../../query';
import { deleteRelations } from '../regular-relations';

jest.mock('../../query', () => ({
  createQueryBuilder: jest.fn(),
}));

jest.mock('../regular-relations', () => ({
  ...jest.requireActual('../regular-relations'),
  deleteRelations: jest.fn(async () => undefined),
}));

const LINK_UID = 'monster.links';

const createBuilder = () => {
  const builder: Record<string, jest.Mock> = {};
  for (const method of ['select', 'delete', 'update', 'where', 'transacting']) {
    builder[method] = jest.fn(() => builder);
  }
  builder.execute = jest.fn(async () => undefined);

  return builder;
};

const linkModel = {
  uid: LINK_UID,
  attributes: {
    title: { type: 'string' },
    // one-way to-many: one statement for every id
    tags: {
      type: 'relation',
      relation: 'oneToMany',
      target: 'api::tag.tag',
      joinTable: {
        name: 'links_tags_lnk',
        joinColumn: { name: 'links_id', referencedColumn: 'id' },
        inverseJoinColumn: { name: 'tag_id', referencedColumn: 'id' },
        orderColumnName: 'tag_ord',
      },
    },
    // bidirectional: the other side keeps an order column, handled id by id
    categories: {
      type: 'relation',
      relation: 'manyToMany',
      target: 'api::category.category',
      inversedBy: 'links',
      joinTable: {
        name: 'links_categories_lnk',
        joinColumn: { name: 'links_id', referencedColumn: 'id' },
        inverseJoinColumn: { name: 'category_id', referencedColumn: 'id' },
        orderColumnName: 'category_ord',
        inverseOrderColumnName: 'links_ord',
      },
    },
    // polymorphic owner side (dynamic zone like)
    blocks: {
      type: 'relation',
      relation: 'morphToMany',
      joinTable: {
        name: 'links_cmps',
        joinColumn: { name: 'entity_id', referencedColumn: 'id' },
        on: { field: 'blocks' },
      },
    },
  },
};

const createDb = ({ usesForeignKeys = false } = {}) =>
  ({
    metadata: { get: jest.fn(() => linkModel) },
    dialect: { usesForeignKeys: jest.fn(() => usesForeignKeys) },
    lifecycles: { run: jest.fn(async () => undefined) },
  }) as any;

describe('entity-manager deleteManyRelations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does nothing without ids', async () => {
    const db = createDb();

    await createEntityManager(db).deleteManyRelations(LINK_UID, []);

    expect(createQueryBuilder).not.toHaveBeenCalled();
  });

  it('removes the join rows of every id with one statement per attribute', async () => {
    const builder = createBuilder();
    (createQueryBuilder as jest.Mock).mockReturnValue(builder);
    const db = createDb();
    const trx = { id: 'trx' } as any;

    await createEntityManager(db).deleteManyRelations(LINK_UID, [1, 2, 3], { transaction: trx });

    // one-way join table and polymorphic join table: one delete each
    expect(createQueryBuilder).toHaveBeenCalledWith('links_tags_lnk', db);
    expect(createQueryBuilder).toHaveBeenCalledWith('links_cmps', db);
    expect(builder.delete).toHaveBeenCalledTimes(2);
    expect(builder.where).toHaveBeenCalledWith({ links_id: { $in: [1, 2, 3] } });
    expect(builder.where).toHaveBeenCalledWith({ entity_id: { $in: [1, 2, 3] }, field: 'blocks' });
    expect(builder.transacting).toHaveBeenCalledWith(trx);

    // bidirectional: falls back to the per-entity deletion that renumbers the other side
    expect(deleteRelations).toHaveBeenCalledTimes(3);
    expect(deleteRelations).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 2,
        attribute: linkModel.attributes.categories,
        relIdsToDelete: 'all',
      })
    );
  });

  it('leaves the join tables to the foreign keys when the dialect has them', async () => {
    const builder = createBuilder();
    (createQueryBuilder as jest.Mock).mockReturnValue(builder);
    const db = createDb({ usesForeignKeys: true });

    await createEntityManager(db).deleteManyRelations(LINK_UID, [1, 2]);

    // the polymorphic join rows have no foreign key, they are still removed
    expect(createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(createQueryBuilder).toHaveBeenCalledWith('links_cmps', db);
    expect(deleteRelations).not.toHaveBeenCalled();
  });
});
