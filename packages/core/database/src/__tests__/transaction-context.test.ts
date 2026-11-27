import knex, { Knex } from 'knex';

import { SavepointError } from '../errors';
import { isDeadlockError, transactionCtx } from '../transaction-context';

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

  test('matches a driver error whose message only says Deadlock found', () => {
    expect(
      isDeadlockError({
        sqlMessage: 'Deadlock found when trying to get lock',
        message: 'Deadlock found when trying to get lock',
      })
    ).toBe(true);
  });

  test('ignores a driver error that has no message', () => {
    expect(isDeadlockError({ sqlState: '40P01' })).toBe(false);
    expect(isDeadlockError({ sql: 'update t set a = 1' })).toBe(false);
  });
});

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

  test('a throwing rollback hook is reported and skips the hooks after it', async () => {
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
    expect(later).not.toHaveBeenCalled();
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

  test('keeps the callback error when an onRollback hook throws', async () => {
    const later = jest.fn();
    const hookError = new Error('rollback hook failed');
    const reported: unknown[] = [];

    await inTransaction(async () => {
      await expect(
        transactionCtx.savepoint(
          async () => {
            transactionCtx.onRollback(() => {
              throw hookError;
            });
            transactionCtx.onRollback(later);
            throw new Error('callback failed');
          },
          (error) => {
            reported.push(error);
          }
        )
      ).rejects.toThrow('callback failed');
    });

    expect(later).not.toHaveBeenCalled();
    expect(reported).toEqual([hookError]);
  });

  test('keeps the savepoint error when an onRollback hook throws after a failed rollback', async () => {
    const callbackError = new Error('callback failed');
    const hookError = new Error('rollback hook failed');
    const later = jest.fn();
    const reported: unknown[] = [];

    await inTransaction(async () => {
      const savepoint = transactionCtx.savepoint(
        async () => {
          transactionCtx.onRollback(() => {
            throw hookError;
          });
          transactionCtx.onRollback(later);
          await rollBackWholeTransaction(transactionCtx.get()!);
          throw callbackError;
        },
        (error) => {
          reported.push(error);
        }
      );

      await expect(savepoint).rejects.toBeInstanceOf(SavepointError);
      await expect(savepoint).rejects.toMatchObject({
        message: 'Failed to roll back to the savepoint',
        cause: expect.objectContaining({ message: expect.stringMatching(/no such savepoint/) }),
        details: { error: callbackError },
      });
    });

    expect(later).not.toHaveBeenCalled();
    expect(reported).toEqual([hookError]);
  });

  test('keeps the savepoint error when an onRollback hook throws after a failed release', async () => {
    const hookError = new Error('rollback hook failed');
    const later = jest.fn();
    const reported: unknown[] = [];

    await inTransaction(async () => {
      const savepoint = transactionCtx.savepoint(
        async () => {
          transactionCtx.onRollback(() => {
            throw hookError;
          });
          transactionCtx.onRollback(later);
          await rollBackWholeTransaction(transactionCtx.get()!);
        },
        (error) => {
          reported.push(error);
        }
      );

      await expect(savepoint).rejects.toBeInstanceOf(SavepointError);
      await expect(savepoint).rejects.toMatchObject({
        message: 'Failed to release the savepoint',
        cause: expect.objectContaining({ message: expect.stringMatching(/no such savepoint/) }),
      });
    });

    expect(later).not.toHaveBeenCalled();
    expect(reported).toEqual([hookError]);
  });
});

describe('transactionCtx.commit', () => {
  let db: Knex;

  beforeEach(async () => {
    db = knex({
      client: 'better-sqlite3',
      connection: { filename: ':memory:' },
      useNullAsDefault: true,
    });
    await db.raw('PRAGMA foreign_keys = ON');
    await db.raw('create table parents (id integer primary key)');
    // Checked when SQLite commits, not when the row is inserted
    await db.raw(
      'create table children (id integer primary key, parent_id integer references parents (id) deferrable initially deferred)'
    );
  });

  afterEach(async () => {
    await db.destroy();
  });

  test('rejects with the database error and skips the commit hooks when COMMIT is rejected', async () => {
    const onCommit = jest.fn();
    const trx = await db.transaction();

    const commit = transactionCtx.run(trx, async () => {
      transactionCtx.onCommit(onCommit);
      // Inserted without error: the missing parent is only found at COMMIT
      await trx('children').insert({ parent_id: 999 });
      await transactionCtx.commit(trx);
    });

    await expect(commit).rejects.toMatchObject({
      message: expect.stringMatching(/FOREIGN KEY constraint failed/),
    });
    expect(trx.isCompleted()).toBe(true);

    await transactionCtx.settleHooks();
    expect(onCommit).not.toHaveBeenCalled();
  });

  test('runs the commit hooks once COMMIT succeeds', async () => {
    const onCommit = jest.fn();
    const trx = await db.transaction();

    await transactionCtx.run(trx, async () => {
      transactionCtx.onCommit(onCommit);
      await trx('parents').insert({ id: 1 });
      await trx('children').insert({ parent_id: 1 });
      await transactionCtx.commit(trx);
    });

    await transactionCtx.settleHooks();
    expect(onCommit).toHaveBeenCalledTimes(1);
    await expect(db('children').count({ count: '*' })).resolves.toEqual([{ count: 1 }]);
  });
});
