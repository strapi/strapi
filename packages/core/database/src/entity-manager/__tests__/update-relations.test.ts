import { createEntityManager } from '../index';
import { deleteRelations } from '../regular-relations';

jest.mock('../../query', () => ({
  createQueryBuilder: jest.fn(),
}));

jest.mock('../regular-relations', () => ({
  deletePreviousOneToAnyRelations: jest.fn(),
  deletePreviousAnyToOneRelations: jest.fn(),
  deleteRelations: jest.fn(),
  cleanOrderColumns: jest.fn(),
}));

const attribute = {
  type: 'relation',
  relation: 'manyToMany',
  target: 'api::product.product',
  joinTable: {
    name: 'shops_products_links',
    joinColumn: { name: 'shop_id', referencedColumn: 'id' },
    inverseJoinColumn: { name: 'product_id', referencedColumn: 'id' },
    orderColumnName: 'product_order',
    inverseOrderColumnName: 'shop_order',
    pivotColumns: ['shop_id', 'product_id'],
  },
};

const createManager = () => {
  const db = {
    metadata: {
      get: jest.fn(() => ({ attributes: { products: attribute } })),
    },
    lifecycles: {
      run: jest.fn(async () => undefined),
    },
  } as any;

  return createEntityManager(db);
};

describe('entity-manager updateRelations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deletes every relation when set is null', async () => {
    const em = createManager();

    await em.updateRelations('api::shop.shop', 1, { products: { set: null } }, {});

    expect(deleteRelations).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, relIdsToDelete: 'all' })
    );
    expect(deleteRelations).toHaveBeenCalledWith(
      expect.not.objectContaining({ relIdsToNotDelete: expect.anything() })
    );
  });

  it('deletes every relation when set is an empty array', async () => {
    const em = createManager();

    await em.updateRelations('api::shop.shop', 1, { products: { set: [] } }, {});

    expect(deleteRelations).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, relIdsToDelete: 'all', relIdsToNotDelete: [] })
    );
  });

  it('only deletes the disconnected relations on a partial update', async () => {
    const em = createManager();

    await em.updateRelations('api::shop.shop', 1, { products: { disconnect: [2] } }, {});

    expect(deleteRelations).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, relIdsToDelete: [2] })
    );
  });
});
