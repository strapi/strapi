import assert from 'node:assert/strict';
import type { Knex } from 'knex';

import { Database } from '../index';

const createGate = () => {
  let release: () => void = () => assert.fail('gate was not initialized');
  const promise = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { promise, release };
};

const createPendingTransaction = (heldEvent: 'commit' | 'rollback') => {
  const gate = createGate();
  const calls = { commit: 0, rollback: 0 };
  let completed = false;

  const transaction = {
    async commit() {
      calls.commit += 1;
      if (heldEvent === 'commit') {
        await gate.promise;
      }
      completed = true;
    },
    async rollback() {
      calls.rollback += 1;
      if (heldEvent === 'rollback') {
        await gate.promise;
      }
      completed = true;
    },
    isCompleted: () => completed,
  } as unknown as Knex.Transaction;

  return { transaction, calls, release: gate.release };
};

const createDatabase = (transaction: Knex.Transaction) => {
  const database = Object.create(Database.prototype) as Database;
  database.connection = {
    transaction: () => Promise.resolve(transaction),
  } as unknown as Knex;
  return database;
};

describe('callback-free transaction finalization', () => {
  (['commit', 'rollback'] as const).forEach((finalization) => {
    it(`shares an in-flight ${finalization} across matching callback-free helpers`, async () => {
      const { transaction, calls, release } = createPendingTransaction(finalization);
      const database = createDatabase(transaction);
      const handle = await database.transaction();
      const first = handle[finalization]();
      const second = handle[finalization]();

      try {
        assert.equal(calls[finalization], 1);
      } finally {
        release();
        await Promise.allSettled([first, second]);
      }

      await Promise.all([first, second]);
      assert.equal(calls[finalization], 1);
    });

    it(`rejects a competing callback-free helper while ${finalization} is in flight`, async () => {
      const opposite = finalization === 'commit' ? 'rollback' : 'commit';
      const { transaction, calls, release } = createPendingTransaction(finalization);
      const database = createDatabase(transaction);
      const handle = await database.transaction();
      const first = handle[finalization]();
      const competing = handle[opposite]();

      try {
        await assert.rejects(
          competing,
          /Transaction is finalizing; another finalizer is not allowed/
        );
        assert.equal(calls[opposite], 0);
      } finally {
        release();
        await Promise.allSettled([first, competing]);
      }

      await first;
      assert.equal(calls[finalization], 1);
      assert.equal(calls[opposite], 0);
    });
  });
});
