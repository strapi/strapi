import knex, { Knex } from 'knex';

import { SavepointError } from '../errors';
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

describe('transactionCtx.savepoint', () => {
  let db: Knex;

  beforeEach(async () => {
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await db.schema.createTable('items', (table) => {
      table.string('name');
    });
  });

  afterEach(async () => {
    await db.destroy();
  });

  // Runs `cb` as the current transaction, then rolls back what's left of it
  const inTransaction = async (cb: (trx: Knex.Transaction) => Promise<void>) => {
    const trx = await db.transaction();
    try {
      await transactionCtx.run(trx, () => cb(trx));
    } finally {
      await trx.rollback().catch(() => {});
    }
  };

  // What a database that rolls back the whole transaction on an error (MySQL on a deadlock) leaves
  // the savepoint with: no savepoint to release or roll back to
  const rollBackWholeTransaction = (trx: Knex.Transaction) => trx.raw('ROLLBACK');

  test('resolves with the callback result once released', async () => {
    await inTransaction(async () => {
      await expect(transactionCtx.savepoint(async () => 'done')).resolves.toBe('done');
    });
  });

  test('rethrows the callback error once rolled back', async () => {
    await inTransaction(async () => {
      await expect(
        transactionCtx.savepoint(async () => {
          throw new Error('callback failed');
        })
      ).rejects.toThrow('callback failed');
    });
  });

  test('rejects with a savepoint error when the savepoint fails to release', async () => {
    await inTransaction(async () => {
      const savepoint = transactionCtx.savepoint(async () => {
        await rollBackWholeTransaction(transactionCtx.get()!);
      });

      await expect(savepoint).rejects.toBeInstanceOf(SavepointError);
      await expect(savepoint).rejects.toMatchObject({
        message: 'Failed to release the savepoint',
        cause: expect.objectContaining({ message: expect.stringMatching(/no such savepoint/) }),
      });
    });
  });

  test('rejects with a savepoint error, keeping the callback error, when the savepoint fails to roll back', async () => {
    const callbackError = new Error('callback failed');

    await inTransaction(async () => {
      const savepoint = transactionCtx.savepoint(async () => {
        await rollBackWholeTransaction(transactionCtx.get()!);
        throw callbackError;
      });

      await expect(savepoint).rejects.toBeInstanceOf(SavepointError);
      await expect(savepoint).rejects.toMatchObject({
        message: 'Failed to roll back to the savepoint',
        cause: expect.objectContaining({ message: expect.stringMatching(/no such savepoint/) }),
        details: { error: callbackError },
      });
    });
  });

  test('runs the rollback callbacks of a savepoint that failed to release', async () => {
    const called: string[] = [];

    await inTransaction(async () => {
      await transactionCtx
        .savepoint(async () => {
          transactionCtx.onCommit(() => called.push('commit'));
          transactionCtx.onRollback(() => called.push('rollback'));
          await rollBackWholeTransaction(transactionCtx.get()!);
        })
        .catch(() => {});
    });

    expect(called).toEqual(['rollback']);
  });
});
