import { createEntityManager } from '../index';
import { createQueryBuilder } from '../../query';

jest.mock('../../query', () => ({
  createQueryBuilder: jest.fn(),
}));

describe('entity-manager update', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const createDb = (trx: any) => {
    const db = {
      metadata: {
        get: jest.fn().mockReturnValue({
          attributes: {
            title: { type: 'string' },
            meta: { type: 'json' },
            tags: { type: 'relation', relation: 'oneToMany' },
          },
        }),
      },
      dialect: {
        usesForeignKeys() {
          return false;
        },
      },
      lifecycles: {
        run: jest.fn(async () => undefined),
      },
      transaction: jest.fn().mockResolvedValue(trx),
    } as any;

    global.strapi = { db } as any;
    return db;
  };

  it('runs scalar update inside transaction and rolls back on relation update error', async () => {
    const mockTrx = {
      get: jest.fn().mockReturnValue('knex-trx-instance'),
      commit: jest.fn().mockResolvedValue(undefined),
      rollback: jest.fn().mockResolvedValue(undefined),
    };

    const mockQbSelect = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue({ id: 1, title: 'Old Title', meta: { key: 'val' } }),
    };

    const mockQbUpdate = {
      where: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      transacting: jest.fn().mockReturnThis(),
      execute: jest.fn().mockResolvedValue(1),
    };

    (createQueryBuilder as jest.Mock)
      .mockReturnValueOnce(mockQbSelect)
      .mockReturnValueOnce(mockQbUpdate);

    const db = createDb(mockTrx);
    const em = createEntityManager(db);

    const originalError = new Error('ER_NO_REFERENCED_ROW_2: Cannot add or update child row');
    em.updateRelations = jest.fn().mockRejectedValue(originalError);

    await expect(
      em.update('api::article.article', {
        where: { id: 1 },
        data: { title: 'Changed by failed update', tags: { connect: [{ id: 999 }] } },
      })
    ).rejects.toThrow('ER_NO_REFERENCED_ROW_2: Cannot add or update child row');

    // Verify scalar update was executed with transacting(trx.get())
    expect(mockQbUpdate.transacting).toHaveBeenCalledWith('knex-trx-instance');
    expect(mockQbUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Changed by failed update' })
    );
  });
});
