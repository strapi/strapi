import { transactionCtx } from '../transaction-context';

const fakeTrx = () =>
  ({
    commit: jest.fn(async () => undefined),
    rollback: jest.fn(async () => undefined),
  }) as any;

describe('transaction hooks', () => {
  test('commit returns before commit hooks, and settleHooks waits for them', async () => {
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

    expect(order).toEqual(['after commit']);
    await transactionCtx.settleHooks();
    expect(order).toEqual(['after commit', 'first', 'nested']);
  });

  test('a rejected commit hook is reported and the later hooks still run', async () => {
    const error = Object.assign(new Error('hook failed'), { code: '40P01' });
    const later = jest.fn();
    const reported: unknown[] = [];

    await transactionCtx.run(fakeTrx(), async () => {
      transactionCtx.onCommit(() => Promise.reject(error));
      transactionCtx.onCommit(later);
      await transactionCtx.commit(fakeTrx(), (hookError) => {
        reported.push(hookError);
      });
    });

    await transactionCtx.settleHooks();
    expect(later).toHaveBeenCalledTimes(1);
    expect(reported).toEqual([error]);
  });

  test('a throwing rollback hook is reported and the later hooks still run', async () => {
    const error = Object.assign(new Error('rollback hook failed'), { code: '40P01' });
    const later = jest.fn();
    const reported: unknown[] = [];

    await transactionCtx.run(fakeTrx(), async () => {
      transactionCtx.onRollback(() => {
        throw error;
      });
      transactionCtx.onRollback(later);
      await transactionCtx.rollback(fakeTrx(), (hookError) => {
        reported.push(hookError);
      });
    });

    await transactionCtx.settleHooks();
    expect(reported).toEqual([error]);
    expect(later).toHaveBeenCalledTimes(1);
  });

  test('commit still finishes when a hook fails and nobody is listening', async () => {
    const later = jest.fn();

    await transactionCtx.run(fakeTrx(), async () => {
      transactionCtx.onCommit(() => {
        throw new Error('no listener');
      });
      transactionCtx.onCommit(later);
      await transactionCtx.commit(fakeTrx());
    });

    await transactionCtx.settleHooks();
    expect(later).toHaveBeenCalledTimes(1);
  });

  test('onCommit outside a transaction is not kept for a later one', async () => {
    const stray = jest.fn();
    transactionCtx.onCommit(stray);

    await transactionCtx.run(fakeTrx(), async () => {
      await transactionCtx.commit(fakeTrx());
    });

    expect(stray).not.toHaveBeenCalled();
  });

  test('a transaction opened from a commit hook does not run rolled-back commit hooks', async () => {
    const rolledBack = jest.fn();

    const order: string[] = [];

    await transactionCtx.run(fakeTrx(), async () => {
      transactionCtx.onCommit(async () => {
        order.push('hook');
        await transactionCtx.run(fakeTrx(), async () => {
          transactionCtx.onCommit(rolledBack);
          await transactionCtx.rollback(fakeTrx());
        });
      });
      await transactionCtx.commit(fakeTrx());
    });

    await transactionCtx.settleHooks();
    expect(order).toEqual(['hook']);
    expect(rolledBack).not.toHaveBeenCalled();
  });

  test('settleHooks waits only for the database that scheduled the hooks', async () => {
    const first = {};
    const second = {};
    let release: () => void = () => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });

    await transactionCtx.run(
      fakeTrx(),
      async () => {
        transactionCtx.onCommit(() => gate);
        await transactionCtx.commit(fakeTrx());
      },
      first
    );

    await expect(transactionCtx.settleHooks(second, 20)).resolves.toBe(true);

    let finished = false;
    const waiting = transactionCtx.settleHooks(first, 1_000).then((drained) => {
      finished = true;
      return drained;
    });
    await new Promise((resolve) => {
      setTimeout(resolve, 20);
    });
    expect(finished).toBe(false);

    release();
    await expect(waiting).resolves.toBe(true);
  });

  test('settleHooks returns when the deadline passes with hooks still running', async () => {
    const owner = {};

    await transactionCtx.run(
      fakeTrx(),
      async () => {
        transactionCtx.onCommit(
          () =>
            new Promise<void>(() => {
              // Stays pending past the drain deadline.
            })
        );
        await transactionCtx.commit(fakeTrx());
      },
      owner
    );

    await expect(transactionCtx.settleHooks(owner, 15)).resolves.toBe(false);
  });

  test('settleHooks returns when the deadline has already passed', async () => {
    const owner = {};

    await transactionCtx.run(
      fakeTrx(),
      async () => {
        transactionCtx.onCommit(
          () =>
            new Promise<void>(() => {
              // Still pending when the drain deadline is already 0.
            })
        );
        await transactionCtx.commit(fakeTrx());
      },
      owner
    );

    await expect(transactionCtx.settleHooks(owner, 0)).resolves.toBe(false);
  });

  test('drains hooks on the default owner when the transaction has none', async () => {
    const ran = jest.fn();

    await transactionCtx.run(
      fakeTrx(),
      async () => {
        transactionCtx.onCommit(ran);
        await transactionCtx.commit(fakeTrx());
      },
      null as never
    );

    await transactionCtx.settleHooks();
    expect(ran).toHaveBeenCalledTimes(1);
  });
});
