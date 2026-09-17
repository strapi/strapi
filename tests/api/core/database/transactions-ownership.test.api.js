'use strict';

const { createStrapiInstance } = require('api-tests/strapi');

let strapi;

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
      'can start a fresh transaction after calling the outer %s helper inside a nested callback',
      async (finalization) => {
        const freshCommit = jest.fn();
        await strapi.db.transaction(async (outer) => {
          await strapi.db.transaction(() => outer[finalization]());
          expect(strapi.db.inTransaction()).toBe(false);
          await strapi.db.transaction(async ({ trx, onCommit }) => {
            expect(trx).not.toBe(outer.trx);
            await strapi.db
              .queryBuilder('strapi::core-store')
              .update({ key: 'fresh transaction key' })
              .where({ id: 1 })
              .execute();
            onCommit(freshCommit);
          });
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
});
