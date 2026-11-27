import { createEntityManager } from '../index';
import { createQueryBuilder } from '../../query';
import type { Database } from '../..';

jest.mock('../../query', () => ({ createQueryBuilder: jest.fn() }));

const uid = 'api::test.test';

const setup = (ids: number[]) => {
  const trx = {};
  const builder = {
    init: jest.fn().mockReturnThis(),
    deleteReturningIds: jest.fn(async () => ids),
  };
  jest
    .mocked(createQueryBuilder)
    .mockReturnValue(builder as unknown as ReturnType<typeof createQueryBuilder>);
  const db = {
    metadata: { get: () => ({ attributes: { cover: { type: 'relation' } } }) },
    inTransaction: () => false,
    transaction: jest.fn((run: (ctx: { trx: object }) => unknown) => run({ trx })),
    dialect: { getBatchInsertSize: () => 2 },
    lifecycles: { run: jest.fn(async () => ({})) },
  };
  const em = createEntityManager(db as unknown as Database);
  const cleanup = jest.spyOn(em, 'deleteManyRelations').mockResolvedValue(undefined);
  return { db, em, trx, builder, cleanup };
};

describe('entity-manager deleteMany', () => {
  it('applies only the delete filters and cleans the returned ids in the same transaction', async () => {
    const { db, em, trx, builder, cleanup } = setup([2, 5, 9]);
    const params = {
      where: { author: { id: 1 } },
      filters: { published: true },
      _q: 'search',
      limit: 1,
      offset: 2,
      orderBy: { name: 'asc' },
      populate: ['author'],
      select: ['name'],
    };

    await expect(em.deleteMany(uid, params)).resolves.toEqual({ count: 3 });
    expect(builder.init).toHaveBeenCalledWith({
      where: params.where,
      filters: params.filters,
      _q: 'search',
    });
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(builder.deleteReturningIds).toHaveBeenCalledWith(trx);
    expect(cleanup.mock.calls).toEqual([
      [uid, [2, 5], { transaction: trx }],
      [uid, [9], { transaction: trx }],
    ]);
    expect(db.lifecycles.run).toHaveBeenLastCalledWith(
      'afterDeleteMany',
      uid,
      { params, result: { count: 3 } },
      {}
    );
  });

  it('skips cleanup when the delete returned no ids', async () => {
    const { em, cleanup } = setup([]);
    await expect(em.deleteMany(uid, {})).resolves.toEqual({ count: 0 });
    expect(cleanup).not.toHaveBeenCalled();
  });

  it('propagates cleanup failures without firing the after lifecycle', async () => {
    const { db, em, cleanup } = setup([2]);
    cleanup.mockRejectedValueOnce(new Error('cleanup failed'));
    await expect(em.deleteMany(uid, {})).rejects.toThrow('cleanup failed');
    expect(db.lifecycles.run).toHaveBeenCalledTimes(1);
    expect(db.lifecycles.run).toHaveBeenCalledWith('beforeDeleteMany', uid, { params: {} });
  });
});
