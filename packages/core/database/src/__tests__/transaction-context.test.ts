import { isDeadlockError, isTransactionHookError, transactionCtx } from '../transaction-context';

const fakeTrx = () =>
  ({
    commit: jest.fn(async () => undefined),
    rollback: jest.fn(async () => undefined),
  }) as any;

describe('isDeadlockError', () => {
  test('matches driver codes and a driver error that only kept the message', () => {
    expect(isDeadlockError(Object.assign(new Error('boom'), { code: '40P01' }))).toBe(true);
    expect(isDeadlockError({ errno: 1213, message: 'lock' })).toBe(true);
    expect(isDeadlockError({ sql: 'update t set a = 1', message: 'deadlock detected' })).toBe(true);
    expect(isDeadlockError({ message: 'wrapped', original: { code: 'ER_LOCK_DEADLOCK' } })).toBe(
      true
    );
  });

  test('ignores an application error that only mentions a deadlock', () => {
    expect(isDeadlockError(new Error('deadlock detected'))).toBe(false);
    expect(isDeadlockError(new Error('Deadlock found'))).toBe(false);
  });
});

describe('transaction hooks', () => {
  test('commit waits for commit hooks, including hooks they register', async () => {
    const order: string[] = [];

    await transactionCtx.run(fakeTrx(), async () => {
      transactionCtx.onCommit(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, 10);
        });
        order.push('first');
        transactionCtx.onCommit(() => {
          order.push('nested');
        });
      });
      await transactionCtx.commit(fakeTrx());
      order.push('after commit');
    });

    expect(order).toEqual(['first', 'nested', 'after commit']);
  });

  test('a rejected commit hook fails commit and is marked as a hook error', async () => {
    const error = Object.assign(new Error('hook failed'), { code: '40P01' });
    const later = jest.fn();

    await transactionCtx.run(fakeTrx(), async () => {
      transactionCtx.onCommit(() => Promise.reject(error));
      transactionCtx.onCommit(later);
      await expect(transactionCtx.commit(fakeTrx())).rejects.toBe(error);
    });

    expect(later).not.toHaveBeenCalled();
    expect(isTransactionHookError(error)).toBe(true);
  });

  test('a throwing rollback hook fails rollback', async () => {
    const error = new Error('rollback hook failed');

    await transactionCtx.run(fakeTrx(), async () => {
      transactionCtx.onRollback(() => {
        throw error;
      });
      await expect(transactionCtx.rollback(fakeTrx())).rejects.toBe(error);
    });

    expect(isTransactionHookError(error)).toBe(true);
  });

  test('a driver error is not a hook error', () => {
    expect(isTransactionHookError(Object.assign(new Error('x'), { code: '40P01' }))).toBe(false);
  });

  test('a transaction opened from a commit hook does not run rolled-back commit hooks', async () => {
    const rolledBack = jest.fn();

    await transactionCtx.run(fakeTrx(), async () => {
      transactionCtx.onCommit(async () => {
        await transactionCtx.run(fakeTrx(), async () => {
          transactionCtx.onCommit(rolledBack);
          await transactionCtx.rollback(fakeTrx());
        });
      });
      await transactionCtx.commit(fakeTrx());
    });

    expect(rolledBack).not.toHaveBeenCalled();
  });
});
