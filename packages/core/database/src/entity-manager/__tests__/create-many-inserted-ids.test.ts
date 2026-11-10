import { createEntityManager } from '../index';
import { createQueryBuilder } from '../../query';
import { transactionCtx } from '../../transaction-context';

jest.mock('../../query', () => ({
  createQueryBuilder: jest.fn(),
}));

const metadata = {
  attributes: {
    id: { type: 'integer' },
    title: { type: 'string' },
  },
};

describe('entity-manager createMany inserted ids', () => {
  const execute = jest.fn();
  const raw = jest.fn();

  const setup = ({ useReturning }: { useReturning: boolean }) => {
    execute.mockReset();
    raw.mockReset();
    raw.mockResolvedValue([[{ step: 2 }]]);

    const chain = {
      insert: jest.fn().mockReturnThis(),
      transacting: jest.fn().mockReturnThis(),
      execute,
    };
    (createQueryBuilder as jest.Mock).mockReturnValue(chain);

    const trx = {
      get: () => ({}),
      commit: jest.fn(),
      rollback: jest.fn(),
    };
    const connection = { raw };
    const db = {
      connection,
      metadata: { get: jest.fn().mockReturnValue(metadata) },
      lifecycles: { run: jest.fn(async () => undefined) },
      dialect: {
        getBatchInsertSize: () => 100,
        useReturning: () => useReturning,
      },
      transaction: jest.fn(async () => trx),
    };

    return { em: createEntityManager(db as any), trx, connection };
  };

  it('reads auto_increment_increment when MySQL will not return every id', async () => {
    const { em, trx } = setup({ useReturning: false });
    execute.mockResolvedValue([8]);

    await expect(
      em.createMany('api::article.article', {
        data: [{ title: 'a' }, { title: 'b' }],
      })
    ).resolves.toEqual({ count: 2, ids: [8, 10] });

    expect(raw).toHaveBeenCalledWith('SELECT @@auto_increment_increment AS step');
    expect(trx.commit).toHaveBeenCalledTimes(1);
  });

  it('reads the step from the open transaction when one is active', async () => {
    const { em, connection } = setup({ useReturning: false });
    execute.mockResolvedValue([4]);

    await transactionCtx.run(connection as never, async () => {
      await expect(
        em.createMany('api::article.article', {
          data: [{ title: 'a' }, { title: 'b' }, { title: 'c' }],
        })
      ).resolves.toEqual({ count: 3, ids: [4, 6, 8] });
    });

    expect(raw).toHaveBeenCalledTimes(1);
  });

  it('keeps explicit ids and does not read the increment when RETURNING is available', async () => {
    const explicit = setup({ useReturning: false });
    execute.mockResolvedValue([1]);

    await expect(
      explicit.em.createMany('api::article.article', {
        data: [
          { id: 5, title: 'a' },
          { id: 9, title: 'b' },
        ],
      })
    ).resolves.toEqual({ count: 2, ids: [5, 9] });
    expect(raw).not.toHaveBeenCalled();

    const returning = setup({ useReturning: true });
    execute.mockResolvedValue([{ id: 1 }, { id: 2 }]);

    await expect(
      returning.em.createMany('api::article.article', {
        data: [{ title: 'a' }, { title: 'b' }],
      })
    ).resolves.toEqual({ count: 2, ids: [1, 2] });
    expect(raw).not.toHaveBeenCalled();
  });

  it('keeps explicit ids and only expands the generated holes on MySQL', async () => {
    const { em } = setup({ useReturning: false });
    execute.mockResolvedValue([20]);

    await expect(
      em.createMany('api::article.article', {
        data: [{ id: 5, title: 'a' }, { title: 'b' }, { id: 9, title: 'c' }, { title: 'd' }],
      })
    ).resolves.toEqual({ count: 4, ids: [5, 20, 9, 22] });
  });
});
