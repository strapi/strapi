'use strict';

const { createStrapiInstance } = require('api-tests/strapi');

let strapi;

const createGate = () => {
  let release;
  const promise = new Promise((resolve) => {
    release = resolve;
  });
  return { promise, release };
};

describe('transaction context ownership', () => {
  let original;
  beforeAll(async () => {
    strapi = await createStrapiInstance();
    original = await strapi.db
      .queryBuilder('strapi::core-store')
      .select(['*'])
      .where({ id: 1 })
      .execute();
  });

  afterAll(async () => {
    await strapi.destroy();
  });

  afterEach(async () => {
    await strapi.db
      .queryBuilder('strapi::core-store')
      .update({
        key: original[0].key,
      })
      .where({ id: 1 })
      .execute();
  });

  describe('transaction callback ownership', () => {
    test('does not emit a failed transaction commit hook when recovery commits', async () => {
      const failedCommit = jest.fn();
      const recoveryCommit = jest.fn();
      const failure = new Error('original transaction failed');
      let recovery;

      await expect(
        strapi.db.transaction(async ({ onCommit, onRollback }) => {
          onCommit(failedCommit);
          onRollback(() => {
            recovery = strapi.db.transaction(async ({ onCommit }) => {
              await strapi.db
                .queryBuilder('strapi::core-store')
                .update({ key: 'recovery key' })
                .where({ id: 1 })
                .execute();
              onCommit(recoveryCommit);
            });
          });
          await strapi.db
            .queryBuilder('strapi::core-store')
            .update({ key: 'rolled back key' })
            .where({ id: 1 })
            .execute();
          throw failure;
        })
      ).rejects.toBe(failure);

      expect(recovery).toBeDefined();
      await recovery;
      expect(failedCommit).not.toHaveBeenCalled();
      expect(recoveryCommit).toHaveBeenCalledTimes(1);
      const rows = await strapi.db
        .queryBuilder('strapi::core-store')
        .select(['key'])
        .where({ id: 1 })
        .execute();
      expect(rows[0].key).toEqual('recovery key');
    });

    test('does not emit a committed transaction rollback hook when a follow-up rolls back', async () => {
      const originalRollback = jest.fn();
      const followUpRollback = jest.fn();
      let followUp;

      await strapi.db.transaction(async ({ onCommit, onRollback }) => {
        onRollback(originalRollback);
        onCommit(() => {
          followUp = strapi.db.transaction(async ({ onRollback, rollback }) => {
            onRollback(followUpRollback);
            await strapi.db
              .queryBuilder('strapi::core-store')
              .update({ key: 'follow-up key' })
              .where({ id: 1 })
              .execute();
            await rollback();
          });
        });
        await strapi.db
          .queryBuilder('strapi::core-store')
          .update({ key: 'committed key' })
          .where({ id: 1 })
          .execute();
      });

      expect(followUp).toBeDefined();
      await followUp;
      expect(originalRollback).not.toHaveBeenCalled();
      expect(followUpRollback).toHaveBeenCalledTimes(1);
      const rows = await strapi.db
        .queryBuilder('strapi::core-store')
        .select(['key'])
        .where({ id: 1 })
        .execute();
      expect(rows[0].key).toEqual('committed key');
    });

    test.each(['commit', 'rollback'])(
      'rejects work in closed scopes after calling the outer %s helper inside a nested callback',
      async (finalization) => {
        const freshCommit = jest.fn();
        await strapi.db.transaction(async (outer) => {
          await strapi.db.transaction(async () => {
            await outer[finalization]();
            await expect(
              strapi.db
                .queryBuilder('strapi::core-store')
                .update({ key: 'unexpected detached key' })
                .where({ id: 1 })
                .execute()
            ).rejects.toThrow('Transaction is closed');
          });
          await expect(strapi.db.transaction(async () => {})).rejects.toThrow(
            'Transaction is closed'
          );
        });
        await strapi.db.transaction(async ({ onCommit }) => {
          await strapi.db
            .queryBuilder('strapi::core-store')
            .update({ key: 'fresh transaction key' })
            .where({ id: 1 })
            .execute();
          onCommit(freshCommit);
        });

        expect(freshCommit).toHaveBeenCalledTimes(1);
        const rows = await strapi.db
          .queryBuilder('strapi::core-store')
          .select(['key'])
          .where({ id: 1 })
          .execute();
        expect(rows[0].key).toEqual('fresh transaction key');
      }
    );

    test('rolls back a failed commit and keeps recovery transaction hooks isolated', async () => {
      const failedCommit = jest.fn();
      const failedRollback = jest.fn();
      const recoveryCommit = jest.fn();
      const failure = new Error('commit failed before completion');
      let recovery;

      await expect(
        strapi.db.transaction(async ({ trx, onCommit, onRollback }) => {
          // Fail before Knex sends COMMIT, leaving a real transaction for the catch path to roll back.
          trx.commit = jest.fn().mockRejectedValue(failure);
          onCommit(failedCommit);
          onRollback(() => {
            failedRollback();
            recovery = strapi.db.transaction(async ({ onCommit }) => {
              const rows = await strapi.db
                .queryBuilder('strapi::core-store')
                .select(['key'])
                .where({ id: 1 })
                .execute();
              expect(rows[0].key).toEqual(original[0].key);
              await strapi.db
                .queryBuilder('strapi::core-store')
                .update({ key: 'recovery after failed commit' })
                .where({ id: 1 })
                .execute();
              onCommit(recoveryCommit);
            });
          });
          await strapi.db
            .queryBuilder('strapi::core-store')
            .update({ key: 'uncommitted key' })
            .where({ id: 1 })
            .execute();
        })
      ).rejects.toBe(failure);

      expect(recovery).toBeDefined();
      await recovery;
      expect(failedCommit).not.toHaveBeenCalled();
      expect(failedRollback).toHaveBeenCalledTimes(1);
      expect(recoveryCommit).toHaveBeenCalledTimes(1);
      const rows = await strapi.db
        .queryBuilder('strapi::core-store')
        .select(['key'])
        .where({ id: 1 })
        .execute();
      expect(rows[0].key).toEqual('recovery after failed commit');
    });
  });

  test('a nested scope cannot commit independently while the outer commit is in flight', async () => {
    const failure = new Error('commit failed before completion');
    let rejectCommit;
    const pendingCommit = new Promise((resolve, reject) => {
      rejectCommit = reject;
    });
    const resume = createGate();
    let nested;
    let nestedError;
    const startTransaction = jest.spyOn(strapi.db.connection.context, 'transaction');
    const nestedCallback = jest.fn(async () => {
      await strapi.db
        .queryBuilder('strapi::core-store')
        .update({ key: 'nested key' })
        .where({ id: 1 })
        .execute();
    });

    try {
      await expect(
        strapi.db.transaction(async (outer) => {
          await strapi.db.transaction(() => {
            nested = resume.promise.then(() => strapi.db.transaction(nestedCallback));
          });
          // Reject before a driver COMMIT, not a simulated Knex executionPromise failure.
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
        })
      ).rejects.toBe(failure);

      const rows = await strapi.db
        .queryBuilder('strapi::core-store')
        .select(['key'])
        .where({ id: 1 })
        .execute();
      expect(rows[0].key).toEqual(original[0].key);
      expect(nestedError).toBeInstanceOf(Error);
      expect(nestedError.message).toContain('Transaction is finalizing');
      expect(nestedCallback).not.toHaveBeenCalled();
      expect(startTransaction).toHaveBeenCalledTimes(1);
    } finally {
      startTransaction.mockRestore();
    }
  });

  test.each(['commit', 'rollback'])(
    'rejects a detached query while %s is in flight',
    async (finalization) => {
      const finish = createGate();
      const resume = createGate();
      let detached;

      await strapi.db.transaction(async (outer) => {
        await strapi.db.transaction(() => {
          detached = resume.promise.then(() =>
            strapi.db
              .queryBuilder('strapi::core-store')
              .update({ key: 'unexpected mid-finalization key' })
              .where({ id: 1 })
              .execute()
          );
        });
        const finishTransaction = outer.trx[finalization].bind(outer.trx);
        outer.trx[finalization] = async () => {
          await finish.promise;
          return finishTransaction();
        };
        const finalizing = outer[finalization]();
        try {
          resume.release();
          await expect(detached).rejects.toThrow('Transaction is finalizing');
        } finally {
          finish.release();
          await finalizing;
        }
      });

      const rows = await strapi.db
        .queryBuilder('strapi::core-store')
        .select(['key'])
        .where({ id: 1 })
        .execute();
      expect(rows[0].key).toEqual(original[0].key);
    }
  );

  test.each(['commit', 'rollback'])(
    'rejects a detached query after %s instead of silently autocommitting',
    async (finalization) => {
      const resume = createGate();
      let detached;

      await strapi.db.transaction(async (outer) => {
        await strapi.db.transaction(() => {
          detached = resume.promise.then(() =>
            strapi.db
              .queryBuilder('strapi::core-store')
              .update({ key: 'unexpected stale key' })
              .where({ id: 1 })
              .execute()
          );
        });
        await outer[finalization]();
      });

      resume.release();
      // Capture the result so the row read-back proves no write escaped, even on the old branch.
      let queryError;
      try {
        await detached;
      } catch (error) {
        queryError = error;
      }
      const rows = await strapi.db
        .queryBuilder('strapi::core-store')
        .select(['key'])
        .where({ id: 1 })
        .execute();
      expect(rows[0].key).toEqual(original[0].key);
      expect(queryError).toBeInstanceOf(Error);
      expect(queryError.message).toContain('Transaction is closed');
    }
  );
});
