import knex, { Knex } from 'knex';

import { SavepointError } from '../errors';
import { transactionCtx } from '../transaction-context';

// A real connection: knex settles a savepoint's `commit()`/`rollback()` even when the database
// rejects the statement, so only a database can show what the savepoint reports
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
