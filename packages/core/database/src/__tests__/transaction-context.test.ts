import assert from 'node:assert/strict';
import { AsyncLocalStorage } from 'node:async_hooks';
import type { Knex } from 'knex';

import { Database } from '../index';
import { transactionCtx } from '../transaction-context';

const createTransaction = () => {
  let completed = false;
  const transaction = {
    commit() {
      assert.equal(completed, false, 'a transaction must not commit twice');
      completed = true;
      return Promise.resolve();
    },
    rollback() {
      assert.equal(completed, false, 'a transaction must not roll back twice');
      completed = true;
      return Promise.resolve();
    },
    isCompleted: () => completed,
  };

  return transaction as unknown as Knex.Transaction;
};

// Exercise the real transaction orchestration without a SQL connection or constructor side effects.
const createDatabase = (firstTransaction?: Knex.Transaction) => {
  const transactions: Knex.Transaction[] = [];
  const database = Object.create(Database.prototype) as Database;
  database.connection = {
    transaction() {
      const trx =
        transactions.length === 0 && firstTransaction ? firstTransaction : createTransaction();
      transactions.push(trx);
      return Promise.resolve(trx);
    },
  } as unknown as Knex;

  return { database, transactions };
};

const createGate = () => {
  let release: () => void = () => assert.fail('gate was not initialized');
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
};

// These tests use Node assertions so the same cases can also run in an isolated source harness.
describe('transaction context ownership', () => {
  it('shares commit hooks through nested scopes of the same transaction', async () => {
    const { database, transactions } = createDatabase();
    const calls: string[] = [];

    await database.transaction(async ({ onCommit, trx }) => {
      onCommit(() => calls.push('outer'));
      await database.transaction(async ({ onCommit, trx: nestedTrx }) => {
        assert.equal(nestedTrx, trx);
        onCommit(() => calls.push('nested'));
        await database.transaction(({ onCommit }) => {
          onCommit(() => calls.push('deepest'));
        });
        assert.deepEqual(calls, []);
      });
      assert.deepEqual(calls, []);
    });

    assert.equal(transactions.length, 1);
    assert.deepEqual(calls, ['outer', 'nested', 'deepest']);
    assert.equal(transactionCtx.get(), undefined);
  });

  it('shares rollback hooks through nested scopes of the same transaction', async () => {
    const { database, transactions } = createDatabase();
    const calls: string[] = [];
    const failure = new Error('roll back the shared transaction');

    await assert.rejects(
      database.transaction(async ({ onCommit, onRollback }) => {
        onCommit(() => calls.push('unexpected commit'));
        onRollback(() => calls.push('outer'));
        await database.transaction(({ onRollback }) => {
          onRollback(() => calls.push('nested'));
          throw failure;
        });
      }),
      (error) => error === failure
    );

    assert.equal(transactions.length, 1);
    assert.deepEqual(calls, ['outer', 'nested']);
    assert.equal(transactionCtx.get(), undefined);
  });

  it("does not run a rolled-back transaction's commit hooks in a recovery transaction", async () => {
    const { database, transactions } = createDatabase();
    const calls: string[] = [];
    const failure = new Error('original transaction failed');
    let recovery: Promise<unknown> | undefined;

    await assert.rejects(
      database.transaction(({ onCommit, onRollback }) => {
        onCommit(() => calls.push('unexpected original commit'));
        onRollback(() => {
          calls.push('original rollback');
          recovery = database.transaction(({ onCommit }) => {
            onCommit(() => calls.push('recovery commit'));
          });
        });
        throw failure;
      }),
      (error) => error === failure
    );
    assert.ok(recovery);
    await recovery;

    assert.equal(transactions.length, 2);
    assert.deepEqual(calls, ['original rollback', 'recovery commit']);
  });

  it("does not run a committed transaction's rollback hooks when a follow-up rolls back", async () => {
    const { database, transactions } = createDatabase();
    const calls: string[] = [];
    let followUp: Promise<unknown> | undefined;

    await database.transaction(({ onCommit, onRollback }) => {
      onRollback(() => calls.push('unexpected original rollback'));
      onCommit(() => {
        calls.push('original commit');
        followUp = database.transaction(async ({ onRollback, rollback }) => {
          onRollback(() => calls.push('follow-up rollback'));
          await rollback();
        });
      });
    });
    assert.ok(followUp);
    await followUp;

    assert.equal(transactions.length, 2);
    assert.deepEqual(calls, ['original commit', 'follow-up rollback']);
  });

  it('runs independent commit hooks once when started by an onCommit hook', async () => {
    const { database, transactions } = createDatabase();
    const calls: string[] = [];
    let followUp: Promise<unknown> | undefined;

    await database.transaction(({ onCommit }) => {
      onCommit(() => {
        calls.push('original');
        followUp = database.transaction(({ onCommit }) => {
          onCommit(() => calls.push('follow-up'));
        });
      });
    });
    assert.ok(followUp);
    await followUp;

    assert.equal(transactions.length, 2);
    assert.deepEqual(calls, ['original', 'follow-up']);
  });

  it('runs independent rollback hooks once when started by an onRollback hook', async () => {
    const { database, transactions } = createDatabase();
    const calls: string[] = [];
    let followUp: Promise<unknown> | undefined;

    await database.transaction(async ({ onRollback, rollback }) => {
      onRollback(() => {
        calls.push('original');
        followUp = database.transaction(async ({ onRollback, rollback }) => {
          onRollback(() => calls.push('follow-up'));
          await rollback();
        });
      });
      await rollback();
    });
    assert.ok(followUp);
    await followUp;

    assert.equal(transactions.length, 2);
    assert.deepEqual(calls, ['original', 'follow-up']);
  });

  (['commit', 'rollback'] as const).forEach((finalization) => {
    it(`closes all shared scopes when an outer ${finalization} helper is called inside a nested scope`, async () => {
      const { database, transactions } = createDatabase();
      const calls: string[] = [];

      await database.transaction(async (outer) => {
        await database.transaction(async () => {
          await outer[finalization]();
          assert.throws(() => transactionCtx.get(), /Transaction is closed/);
          await assert.rejects(
            database.transaction(async () => {}),
            /Transaction is closed/
          );
        });
        assert.throws(() => transactionCtx.get(), /Transaction is closed/);
        await assert.rejects(
          database.transaction(async () => {}),
          /Transaction is closed/
        );
      });
      await database.transaction(({ onCommit }) => {
        onCommit(() => calls.push('new transaction'));
      });

      assert.equal(transactions.length, 2);
      assert.deepEqual(calls, ['new transaction']);
    });
    it(`does not detach an unrelated active transaction when an independent handle uses ${finalization}`, async () => {
      const { database, transactions } = createDatabase();
      const handle = await database.transaction();
      const calls: string[] = [];

      await database.transaction(async ({ trx, onCommit, onRollback }) => {
        onCommit(() => calls.push('active commit'));
        onRollback(() => calls.push('unexpected active rollback'));
        assert.notEqual(trx, handle.get());
        await handle[finalization]();
        assert.equal(transactionCtx.get(), trx);
        assert.deepEqual(calls, []);
      });

      assert.equal(transactions.length, 2);
      assert.deepEqual(calls, ['active commit']);
    });

    it(`does not detach an active transaction when an already-finalized handle repeats ${finalization}`, async () => {
      const { database, transactions } = createDatabase();
      const handle = await database.transaction();
      const calls: string[] = [];
      await handle[finalization]();

      await database.transaction(async ({ trx, onCommit, onRollback }) => {
        onCommit(() => calls.push('active commit'));
        onRollback(() => calls.push('unexpected active rollback'));
        await handle[finalization]();
        assert.equal(transactionCtx.get(), trx);
      });

      assert.equal(transactions.length, 2);
      assert.deepEqual(calls, ['active commit']);
    });
  });

  it('restores the active parent context after a nested callback throws and is caught', async () => {
    const { database, transactions } = createDatabase();
    const calls: string[] = [];
    const failure = new Error('handled nested failure');

    await database.transaction(async ({ trx, onCommit }) => {
      await assert.rejects(
        database.transaction(() => {
          throw failure;
        }),
        (error) => error === failure
      );
      assert.equal(transactionCtx.get(), trx);
      onCommit(() => calls.push('outer'));
    });

    assert.equal(transactions.length, 1);
    assert.deepEqual(calls, ['outer']);
  });

  it('does not share hooks with a different transactor inside an active scope', async () => {
    const outer = createTransaction();
    const separate = createTransaction();
    const calls: string[] = [];

    await transactionCtx.run(outer, async () => {
      transactionCtx.onCommit(() => calls.push('outer'));
      await transactionCtx.run(separate, async () => {
        transactionCtx.onCommit(() => calls.push('separate'));
        await transactionCtx.commit(separate);
      });
      assert.equal(transactionCtx.get(), outer);
      assert.deepEqual(calls, ['separate']);
      await transactionCtx.commit(outer);
    });

    assert.deepEqual(calls, ['separate', 'outer']);
  });

  it('isolates callbacks when a new context is entered synchronously from a commit hook', async () => {
    const outer = createTransaction();
    const calls: string[] = [];
    let followUp: Promise<unknown> | undefined;

    await transactionCtx.run(outer, async () => {
      transactionCtx.onCommit(() => {
        calls.push('outer');
        // Bound the regression on the unfixed implementation instead of allowing recursive replay.
        if (calls.length !== 1) return;
        const separate = createTransaction();
        followUp = transactionCtx.run(separate, async () => {
          transactionCtx.onCommit(() => calls.push('separate'));
          await transactionCtx.commit(separate);
        });
      });
      await transactionCtx.commit(outer);
    });
    assert.ok(followUp);
    await followUp;

    assert.deepEqual(calls, ['outer', 'separate']);
  });

  it('isolates interleaved root transactions with different outcomes', async () => {
    const { database, transactions } = createDatabase();
    const calls: string[] = [];
    let releaseFirst: () => void = () => assert.fail('release promise was not initialized');
    let signalFirst: () => void = () => assert.fail('ready promise was not initialized');
    const ready = new Promise<void>((resolve) => {
      signalFirst = resolve;
    });
    const release = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });

    const first = database.transaction(async ({ trx, onCommit, onRollback }) => {
      onCommit(() => calls.push('first commit'));
      onRollback(() => calls.push('unexpected first rollback'));
      signalFirst();
      await release;
      assert.equal(transactionCtx.get(), trx);
    });

    await ready;
    try {
      await database.transaction(async ({ trx, onCommit, onRollback, rollback }) => {
        onCommit(() => calls.push('unexpected second commit'));
        onRollback(() => calls.push('second rollback'));
        assert.notEqual(trx, transactions[0]);
        await rollback();
      });
    } finally {
      releaseFirst();
    }
    await first;

    assert.equal(transactions.length, 2);
    assert.deepEqual(calls, ['second rollback', 'first commit']);
  });

  it('keeps explicitly finalized transactions idempotent', async () => {
    const { database, transactions } = createDatabase();
    const calls: string[] = [];

    await database.transaction(async ({ onCommit, commit }) => {
      onCommit(() => calls.push('commit'));
      await commit();
      await commit();
    });

    assert.equal(transactions.length, 1);
    assert.deepEqual(calls, ['commit']);
  });

  it('runs rollback hooks when commit rejects before the transactor completes', async () => {
    const { database, transactions } = createDatabase();
    const calls: string[] = [];
    const failure = new Error('commit failed before completion');

    await assert.rejects(
      database.transaction(({ trx, onCommit, onRollback }) => {
        trx.commit = () => Promise.reject(failure);
        onCommit(() => calls.push('unexpected commit'));
        onRollback(() => calls.push('rollback'));
      }),
      (error) => error === failure
    );

    assert.equal(transactions.length, 1);
    assert.equal(transactions[0].isCompleted(), true);
    assert.deepEqual(calls, ['rollback']);
    assert.equal(transactionCtx.get(), undefined);
  });

  it('keeps recovery hooks isolated after rolling back a failed commit', async () => {
    const { database, transactions } = createDatabase();
    const calls: string[] = [];
    const failure = new Error('commit failed before completion');
    let recovery: Promise<unknown> | undefined;

    await assert.rejects(
      database.transaction(({ trx, onCommit, onRollback }) => {
        trx.commit = () => Promise.reject(failure);
        onCommit(() => calls.push('unexpected original commit'));
        onRollback(() => {
          calls.push('original rollback');
          recovery = database.transaction(({ onCommit }) => {
            onCommit(() => calls.push('recovery commit'));
          });
        });
      }),
      (error) => error === failure
    );
    assert.ok(recovery);
    await recovery;

    assert.equal(transactions.length, 2);
    assert.deepEqual(calls, ['original rollback', 'recovery commit']);
  });

  (['commit', 'rollback'] as const).forEach((finalization) => {
    it(`rejects detached nested work while ${finalization} is in flight without opening a second transaction`, async () => {
      const finish = createGate();
      const resume = createGate();
      const transaction = createTransaction();
      const slowTransaction = {
        ...transaction,
        async [finalization]() {
          await finish.promise;
          return transaction[finalization]();
        },
      } as unknown as Knex.Transaction;
      const { database, transactions } = createDatabase(slowTransaction);
      let detached: Promise<unknown> | undefined;

      await database.transaction(async (outer) => {
        await database.transaction(() => {
          detached = resume.promise.then(() => database.transaction(async () => {}));
        });
        assert.ok(detached);
        const finalizing = outer[finalization]();
        try {
          resume.release();
          await assert.rejects(detached, /Transaction is finalizing/);
          assert.throws(() => transactionCtx.get(), /Transaction is finalizing/);
          assert.throws(() => outer.onCommit(() => {}), /Transaction is finalizing/);
          assert.throws(() => outer.onRollback(() => {}), /Transaction is finalizing/);
          await assert.rejects(
            transactionCtx.run(outer.trx, async () => {}),
            /Transaction is finalizing/
          );
          assert.equal(transactions.length, 1);
        } finally {
          finish.release();
          await finalizing;
        }
      });
      assert.equal(transactions.length, 1);
    });

    it(`rejects detached descendants after ${finalization} rather than reopening their context`, async () => {
      const { database, transactions } = createDatabase();
      const resume = createGate();
      let detached: Promise<unknown> | undefined;
      let nested: Promise<unknown> | undefined;

      await database.transaction(async (outer) => {
        await database.transaction(() => {
          nested = resume.promise.then(() => database.transaction(async () => {}));
          detached = resume.promise.then(async () => {
            assert.throws(() => transactionCtx.get(), /Transaction is closed/);
            assert.throws(() => outer.onCommit(() => {}), /Transaction is closed/);
            assert.throws(() => outer.onRollback(() => {}), /Transaction is closed/);
            await assert.rejects(
              transactionCtx.run(outer.trx, async () => {}),
              /Transaction is closed/
            );
            await assert.rejects(
              transactionCtx.run(createTransaction(), async () => {}),
              /Transaction is closed/
            );
          });
        });
        await outer[finalization]();
      });

      assert.ok(nested);
      assert.ok(detached);
      const rejected = assert.rejects(nested, /Transaction is closed/);
      resume.release();
      await Promise.all([rejected, detached]);
      assert.equal(transactions.length, 1);
      assert.equal(transactionCtx.get(), undefined);
    });

    it(`runs async ${finalization} hooks outside the closed store without losing other async context`, async () => {
      const { database, transactions } = createDatabase();
      const requestContext = new AsyncLocalStorage<string>();
      const calls: string[] = [];
      let followUp: Promise<unknown> | undefined;

      await requestContext.run('request', async () => {
        await database.transaction(async (outer) => {
          const register = finalization === 'commit' ? outer.onCommit : outer.onRollback;
          register(() => {
            assert.equal(transactionCtx.get(), undefined);
            followUp = Promise.resolve().then(async () => {
              assert.equal(transactionCtx.get(), undefined);
              assert.equal(requestContext.getStore(), 'request');
              await database.transaction(({ trx, onCommit }) => {
                assert.notEqual(trx, outer.trx);
                onCommit(() => calls.push('follow-up'));
              });
            });
          });
          await outer[finalization]();
          assert.throws(() => transactionCtx.get(), /Transaction is closed/);
        });
        assert.ok(followUp);
        await followUp;
      });

      assert.equal(transactions.length, 2);
      assert.deepEqual(calls, ['follow-up']);
    });
  });

  it('rejects mid-commit nested work and still rolls back with isolated recovery hooks if commit fails', async () => {
    const { database, transactions } = createDatabase();
    const resume = createGate();
    const calls: string[] = [];
    const failure = new Error('commit failed before completion');
    let rejectCommit: (error: Error) => void = () => assert.fail('commit gate was not initialized');
    const pendingCommit = new Promise<void>((resolve, reject) => {
      rejectCommit = reject;
    });
    let nested: Promise<unknown> | undefined;
    let nestedError: unknown;
    let recovery: Promise<unknown> | undefined;

    await assert.rejects(
      database.transaction(async (outer) => {
        outer.onCommit(() => calls.push('unexpected original commit'));
        outer.onRollback(() => {
          calls.push('original rollback');
          recovery = database.transaction(({ onCommit }) => {
            onCommit(() => calls.push('recovery commit'));
          });
        });
        await database.transaction(() => {
          nested = resume.promise.then(() => database.transaction(async () => {}));
        });
        outer.trx.commit = () => pendingCommit;
        const finalizing = outer.commit();
        resume.release();
        try {
          await nested;
        } catch (error) {
          nestedError = error;
        } finally {
          rejectCommit(failure);
        }
        await finalizing;
      }),
      (error) => error === failure
    );

    assert.ok(nestedError instanceof Error);
    assert.match(nestedError.message, /Transaction is finalizing/);
    assert.ok(recovery);
    await recovery;
    assert.equal(transactions.length, 2);
    assert.equal(transactions[0].isCompleted(), true);
    assert.deepEqual(calls, ['original rollback', 'recovery commit']);
  });

  it('keeps the store closed if a synchronous completion hook throws', async () => {
    const { database, transactions } = createDatabase();
    const failure = new Error('completion hook failed');
    const calls: string[] = [];

    await assert.rejects(
      database.transaction(async (outer) => {
        outer.onRollback(() => calls.push('unexpected rollback'));
        outer.onCommit(() => {
          assert.equal(transactionCtx.get(), undefined);
          calls.push('commit');
          throw failure;
        });
        await assert.rejects(outer.commit(), (error) => error === failure);
        assert.throws(() => transactionCtx.get(), /Transaction is closed/);
        await outer.commit();
        throw failure;
      }),
      (error) => error === failure
    );

    assert.equal(transactions.length, 1);
    assert.deepEqual(calls, ['commit']);
  });
});
