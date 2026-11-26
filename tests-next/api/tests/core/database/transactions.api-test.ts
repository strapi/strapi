import path from 'node:path';

import { afterAll, afterEach, beforeAll, describe, expect, test } from 'vitest';
import { runInServer, scaffoldServerScript, stopAllServers } from '@strapi/tests-shared';

import { setupApp, type TestApp } from '../../helpers';

/** What an action saw of a call that may throw (server/transactions.js `outcome`). */
interface Outcome {
  reached: boolean;
  error?: { name: string; message: string };
}

let ctx: TestApp;

const run = <T = unknown>(action: string, args?: Record<string, unknown>) =>
  runInServer<T>(ctx.server, 'transactions', action, args);

const getKey = () => run<string>('getKey');

describe('transactions', () => {
  let originalKey: string;

  beforeAll(async () => {
    ctx = await setupApp({
      name: 'db-transactions',
      scaffold(app) {
        scaffoldServerScript(app, path.join(__dirname, 'server/transactions.js'));
      },
    });
    originalKey = await getKey();
  });

  afterAll(stopAllServers);

  afterEach(async () => {
    await run('setKey', { key: originalKey });
  });

  describe('using a transaction method', () => {
    test('commits successfully', async () => {
      await run('commit');

      expect(await getKey()).toEqual('new key');
    });

    test('rollback successfully', async () => {
      const { reached } = await run<Outcome>('rollback');

      expect(reached).toBe(false);
      expect(await getKey()).toEqual(originalKey);
    });

    test('nested rollback -> rollback works', async () => {
      const { reached, keyAfterNested } = await run<Outcome & { keyAfterNested: string }>(
        'nestedRollbackThenRollback',
        { originalKey }
      );

      // A nested transaction joins the outer one without a savepoint (see `Database#transaction`):
      // its writes stay until the outer one ends. The old test expected 'changed key' here, in a
      // try block whose catch swallowed the failed assertion.
      expect(keyAfterNested).toEqual('changed key - nested');
      expect(reached).toBe(false);
      expect(await getKey()).toEqual(originalKey);
    });

    test('nested commit -> rollback works', async () => {
      const { reached, keyAfterNested } = await run<Outcome & { keyAfterNested: string }>(
        'nestedCommitThenRollback',
        { originalKey }
      );

      // should equal the result of the nested transaction
      expect(keyAfterNested).toEqual('changed key - nested');
      expect(reached).toBe(false);
      expect(await getKey()).toEqual(originalKey);
    });

    test('onCommit hook works', async () => {
      expect(await run('onCommit')).toEqual(1);
    });

    test('onCommit hook works with nested transactions', async () => {
      expect(await run('onCommitNested')).toEqual(2);
    });

    test('onRollback hook works', async () => {
      expect(await run('onRollback')).toEqual(1);
    });

    test('onRollback hook works with nested transactions', async () => {
      expect(await run('onRollbackNested')).toEqual(2);
    });

    /**
     * If the success path also called `commit` after the callback, calling `await rollback()` then
     * returning (like `testInTransaction` in tests/api/utils) would finalise the transactor twice.
     * Core uses Knex `isCompleted()` to skip. See @strapi/database `transactionContext.commit`.
     */
    test('completes when the callback calls rollback() and returns (no second commit on transactor)', async () => {
      await run('rollbackAndReturn');
    });

    test('query with trx, then rollback and return (wrapInTransaction pattern)', async () => {
      await run('queryWithTrxThenRollback');
    });

    test('query with trx, direct trx.rollback(), then return (no second commit attempt)', async () => {
      await run('queryWithTrxThenTrxRollback');
    });
  });

  describe('using a savepoint', () => {
    test('a failed savepoint rolls back only its own writes', async () => {
      const { savepoint, keyInTransaction } = await run<{
        savepoint: Outcome;
        keyInTransaction: string;
      }>('failedSavepoint');

      expect(savepoint).toMatchObject({ reached: false, error: { message: 'test' } });
      expect(keyInTransaction).toEqual('before savepoint');
      expect(await getKey()).toEqual('before savepoint');
    });

    test('a released savepoint commits with the transaction', async () => {
      const result = await run('releasedSavepoint');

      expect(result).toEqual('result');
      expect(await getKey()).toEqual('in savepoint');
    });

    test('the transaction stays usable after a database error in a savepoint', async () => {
      const { savepoint } = await run<{ savepoint: Outcome }>('databaseErrorInSavepoint');

      expect(savepoint).toMatchObject({
        reached: false,
        error: { message: expect.stringContaining('table_that_does_not_exist') },
      });
      expect(await getKey()).toEqual('after error');
    });

    test('fails the transaction when the database already rolled it back', async () => {
      await run('setKey', { key: 'before transaction' });

      await expect(run('transactionRolledBackByDatabase')).rejects.toMatchObject({
        name: 'SavepointError',
        message: 'Failed to release the savepoint',
      });

      expect(await getKey()).toEqual('before transaction');
    });

    test('commit callbacks of a failed savepoint are dropped, those of a released one kept', async () => {
      const { rolledBackAtSavepoint, committedBeforeEnd, committed } = await run<{
        rolledBackAtSavepoint: string[];
        committedBeforeEnd: string[];
        committed: string[];
      }>('savepointCallbacks');

      // Rolled back at the savepoint, not at the end of the transaction
      expect(rolledBackAtSavepoint).toEqual(['failed']);
      // Released callbacks wait for the transaction's commit
      expect(committedBeforeEnd).toEqual([]);
      expect(committed).toEqual(['released']);
    });

    test('cannot be used outside a transaction', async () => {
      await expect(run('savepointOutsideTransaction')).rejects.toThrow(
        'A savepoint can only be created inside a transaction'
      );
    });
  });

  describe('using a transaction object', () => {
    test('commits successfully', async () => {
      const { reached, error } = await run<Outcome>('transactionObjectCommit', { originalKey });

      expect(error).toBeUndefined();
      expect(reached).toBe(true);
      expect(await getKey()).toEqual(originalKey);
    });

    test('rollback successfully', async () => {
      const { reached } = await run<Outcome>('transactionObjectRollback');

      expect(reached).toBe(false);
      expect(await getKey()).toEqual(originalKey);
    });
  });
});
