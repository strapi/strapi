import { createEntityManager } from '../index';
import { deleteRelations } from '../regular-relations';
import { createQueryBuilder } from '../../query';

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
    dialect: {
      getBatchInsertSize: jest.fn(() => 1000),
    },
  } as any;

  return createEntityManager(db);
};

describe('entity-manager updateRelations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('clears every relation when set is null (GH#27432)', async () => {
    const em = createManager();

    await em.updateRelations('api::shop.shop', 1, { products: { set: null } }, {});

    expect(deleteRelations).toHaveBeenCalledTimes(1);
    expect(deleteRelations).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, relIdsToDelete: 'all' })
    );
    // 'all' means delete everything: no exclusion list may be present
    expect((deleteRelations as jest.Mock).mock.calls[0][0]).not.toHaveProperty('relIdsToNotDelete');
  });

  it('clears every relation when set is an empty array', async () => {
    const em = createManager();

    await em.updateRelations('api::shop.shop', 1, { products: { set: [] } }, {});

    expect(deleteRelations).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, relIdsToDelete: 'all', relIdsToNotDelete: [] })
    );
  });

  it('only removes the disconnected relations on a partial update', async () => {
    const em = createManager();

    await em.updateRelations('api::shop.shop', 1, { products: { disconnect: [2] } }, {});

    expect(deleteRelations).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, relIdsToDelete: [2] })
    );
  });

  it('leaves relations untouched when set is undefined', async () => {
    const em = createManager();

    await em.updateRelations('api::shop.shop', 1, { products: { set: undefined } }, {});

    expect(deleteRelations).not.toHaveBeenCalled();
  });

  it('replaces relations when set holds ids', async () => {
    const qbChain: any = {};
    qbChain.insert = jest.fn().mockReturnValue(qbChain);
    qbChain.transacting = jest.fn().mockReturnValue(qbChain);
    qbChain.onConflict = jest.fn().mockReturnValue(qbChain);
    qbChain.merge = jest.fn().mockReturnValue(qbChain);
    qbChain.ignore = jest.fn().mockReturnValue(qbChain);
    qbChain.execute = jest.fn().mockResolvedValue(undefined);
    (createQueryBuilder as jest.Mock).mockReturnValue(qbChain);
    const em = createManager();

    await em.updateRelations(
      'api::shop.shop',
      1,
      { products: { set: [3, 4] } },
      {
        transaction: {},
      }
    );

    expect(deleteRelations).toHaveBeenCalledWith(
      expect.objectContaining({ id: 1, relIdsToDelete: 'all', relIdsToNotDelete: [3, 4] })
    );
  });
});
