import { createEntityManager } from '../index';
import { createQueryBuilder } from '../../query';
import { transactionCtx } from '../../transaction-context';

jest.mock('../../query', () => ({
  createQueryBuilder: jest.fn(),
}));

const deadlock = () => Object.assign(new Error('deadlock'), { code: '40P01' });

describe('entity-manager relation-order deadlock retry', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    (global as { strapi?: unknown }).strapi = {
      plugins: {},
      api: {},
      admin: { services: {} },
      db: {},
    };
  });

  const setup = () => {
    const execute = jest.fn().mockResolvedValueOnce({ id: 5, title: 'kept' });
    const chain = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      first: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      execute,
    };
    (createQueryBuilder as jest.Mock).mockReturnValue(chain);

    const commit = jest.fn();
    const rollback = jest.fn();
    const transaction = jest.fn(async () => ({
      get: () => ({}),
      commit,
      rollback,
    }));
    (global as { strapi?: unknown }).strapi = {
      plugins: {},
      api: {},
      admin: { services: {} },
      db: { transaction },
    };

    const db = {
      metadata: {
        get: jest.fn().mockReturnValue({
          attributes: {
            articles: {
              type: 'relation',
              relation: 'oneToMany',
              target: 'api::article.article',
            },
          },
        }),
      },
      lifecycles: {
        run: jest.fn(async () => undefined),
      },
    } as any;

    const em = createEntityManager(db);
    return { em, execute, chain, transaction, commit, rollback };
  };

  const update = (em: ReturnType<typeof createEntityManager>) =>
    em.update('api::article.article', {
      where: { id: 5 },
      data: { articles: [1] },
    });

  it('retries a deadlock three times when the update owns the transaction', async () => {
    const { em, execute, transaction, commit, rollback } = setup();
    const error = deadlock();
    jest.spyOn(em, 'updateRelations').mockRejectedValue(error);

    await expect(update(em)).rejects.toBe(error);

    expect(transaction).toHaveBeenCalledTimes(3);
    expect(rollback).toHaveBeenCalledTimes(3);
    expect(commit).not.toHaveBeenCalled();
    // The original row is written back once the retries are exhausted.
    expect(execute).toHaveBeenCalledTimes(2);
  });

  it('does not retry a deadlock inside an outer transaction', async () => {
    const { em, transaction, rollback } = setup();
    const error = deadlock();
    jest.spyOn(em, 'updateRelations').mockRejectedValue(error);

    await transactionCtx.run({} as never, async () => {
      await expect(update(em)).rejects.toBe(error);
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(rollback).toHaveBeenCalledTimes(1);
  });

  it('does not retry an error that is not a deadlock', async () => {
    const { em, transaction } = setup();
    const error = new Error('constraint');
    jest.spyOn(em, 'updateRelations').mockRejectedValue(error);

    await expect(update(em)).rejects.toBe(error);

    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
