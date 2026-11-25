'use strict';

/**
 * The transactions run in the server: each action does what one test of the old suite did with
 * `strapi.db`, and returns what it saw for the test to assert. An action records the outcome of
 * a call the test expected to throw instead of asserting it here.
 */

const CORE_STORE = 'strapi::core-store';

const setKey = (strapi, key, trx) => {
  const query = strapi.db.queryBuilder(CORE_STORE).update({ key }).where({ id: 1 });
  return (trx ? query.transacting(trx) : query).execute();
};

const getKey = async (strapi) => {
  const [row] = await strapi.db.queryBuilder(CORE_STORE).select(['key']).where({ id: 1 }).execute();

  return row.key;
};

/** A query on an unknown uid: it throws. */
const invalidUpdate = (strapi, data, trx) => {
  const query = strapi.db.queryBuilder('invalid_uid').update(data).where({ id: 1 });
  return (trx ? query.transacting(trx) : query).execute();
};

/** `{ reached: true }` when `run` resolved, `{ reached: false, error }` when it threw. */
const outcome = async (run, serializeError) => {
  try {
    const result = await run();
    return { reached: true, result: result ?? null };
  } catch (error) {
    return { reached: false, error: serializeError(error) };
  }
};

module.exports = {
  actions: {
    getKey({ strapi }) {
      return getKey(strapi);
    },

    setKey({ strapi }, { key }) {
      return setKey(strapi, key);
    },

    // using a transaction method

    async commit({ strapi }) {
      await strapi.db.transaction(async () => {
        await setKey(strapi, 'wrong key');
        await setKey(strapi, 'new key');
      });
    },

    rollback({ strapi, serializeError }) {
      return outcome(
        () =>
          strapi.db.transaction(async () => {
            // this is valid
            await setKey(strapi, 'wrong key');

            // this throws
            await invalidUpdate(strapi, { key: 'bad key', invalid_key: 'error' });
          }),
        serializeError
      );
    },

    async nestedRollbackThenRollback({ strapi, serializeError }, { originalKey }) {
      let keyAfterNested;
      const result = await outcome(
        () =>
          strapi.db.transaction(async () => {
            // this is valid
            await setKey(strapi, 'changed key');

            // here we'll make a nested transaction that throws and then confirm we still have "changed key" from above
            try {
              await strapi.db.transaction(async () => {
                await setKey(strapi, 'changed key - nested');

                // this should throw and roll back
                await invalidUpdate(strapi, { invalid_key: 'error' });
              });
            } catch (e) {
              // do nothing
            }

            keyAfterNested = await getKey(strapi);

            // this throws
            await invalidUpdate(strapi, { key: originalKey, invalid_key: 'error' });
          }),
        serializeError
      );
      return { ...result, keyAfterNested };
    },

    async nestedCommitThenRollback({ strapi, serializeError }, { originalKey }) {
      let keyAfterNested;
      const result = await outcome(
        () =>
          strapi.db.transaction(async () => {
            // this is valid
            await setKey(strapi, 'changed key');

            // here we'll make a nested transaction that works, and then later we'll rollback the outer transaction
            try {
              await strapi.db.transaction(async () => {
                await setKey(strapi, 'changed key - nested');
              });
            } catch (e) {
              // do nothing
            }

            keyAfterNested = await getKey(strapi);

            // this throws
            await invalidUpdate(strapi, { key: originalKey, invalid_key: 'error' });
          }),
        serializeError
      );
      return { ...result, keyAfterNested };
    },

    async onCommit({ strapi }) {
      let count = 0;
      await strapi.db.transaction(({ onCommit }) => {
        onCommit(() => {
          count += 1;
        });
      });
      await strapi.db.settleTransactionHooks();
      return count;
    },

    async onCommitNested({ strapi }) {
      let count = 0;
      await strapi.db.transaction(({ onCommit }) => {
        onCommit(() => {
          count += 1;
        });
        return strapi.db.transaction(({ onCommit: onNestedCommit }) => {
          onNestedCommit(() => {
            count += 1;
          });
        });
      });
      await strapi.db.settleTransactionHooks();
      return count;
    },

    async onRollback({ strapi }) {
      let count = 0;
      try {
        await strapi.db.transaction(({ onRollback }) => {
          onRollback(() => {
            count += 1;
          });
          throw new Error('test');
        });
      } catch (e) {
        // do nothing
      }
      await strapi.db.settleTransactionHooks();
      return count;
    },

    async onRollbackNested({ strapi }) {
      let count = 0;
      try {
        await strapi.db.transaction(({ onRollback }) => {
          onRollback(() => {
            count += 1;
          });
          return strapi.db.transaction(({ onRollback: onNestedRollback }) => {
            onNestedRollback(() => {
              count += 1;
            });
            throw new Error('test');
          });
        });
      } catch (e) {
        // do nothing
      }
      await strapi.db.settleTransactionHooks();
      return count;
    },

    async rollbackAndReturn({ strapi }) {
      await strapi.db.transaction(async ({ rollback }) => {
        await rollback();
      });
    },

    async queryWithTrxThenRollback({ strapi }) {
      await strapi.db.transaction(async ({ trx, rollback }) => {
        await strapi.db
          .queryBuilder(CORE_STORE)
          .select(['id'])
          .where({ id: 1 })
          .transacting(trx)
          .execute();
        await rollback();
      });
    },

    async queryWithTrxThenTrxRollback({ strapi }) {
      await strapi.db.transaction(async ({ trx }) => {
        await strapi.db
          .queryBuilder(CORE_STORE)
          .select(['id'])
          .where({ id: 1 })
          .transacting(trx)
          .execute();
        await trx.rollback();
      });
    },

    // using a savepoint

    async failedSavepoint({ strapi, serializeError }) {
      let savepoint;
      let keyInTransaction;
      await strapi.db.transaction(async () => {
        await setKey(strapi, 'before savepoint');

        savepoint = await outcome(
          () =>
            strapi.db.savepoint(async () => {
              await setKey(strapi, 'in savepoint');
              throw new Error('test');
            }),
          serializeError
        );

        keyInTransaction = await getKey(strapi);
      });
      return { savepoint, keyInTransaction };
    },

    releasedSavepoint({ strapi }) {
      return strapi.db.transaction(() =>
        strapi.db.savepoint(async () => {
          await setKey(strapi, 'in savepoint');
          return 'result';
        })
      );
    },

    async databaseErrorInSavepoint({ strapi, serializeError }) {
      let savepoint;
      await strapi.db.transaction(async () => {
        savepoint = await outcome(
          () =>
            strapi.db.savepoint(async () => {
              // The current transaction, here the savepoint's
              const { get } = await strapi.db.transaction();
              await strapi.db.connection
                .raw('SELECT * FROM table_that_does_not_exist')
                .transacting(get());
            }),
          serializeError
        );

        // On Postgres, the error would otherwise abort the transaction
        await setKey(strapi, 'after error');
      });
      return { savepoint };
    },

    async transactionRolledBackByDatabase({ strapi }) {
      await strapi.db.transaction(async () => {
        await setKey(strapi, 'in transaction');

        await strapi.db.savepoint(async () => {
          // What MySQL does on a deadlock: the savepoint is gone with the whole transaction
          const { get } = await strapi.db.transaction();
          await strapi.db.connection.raw('ROLLBACK').transacting(get());
        });

        // Would otherwise run without a transaction, and be kept
        await setKey(strapi, 'after savepoint');
      });
    },

    async savepointCallbacks({ strapi }) {
      const committed = [];
      const rolledBack = [];
      let rolledBackAtSavepoint;
      let committedBeforeEnd;

      await strapi.db.transaction(async () => {
        await strapi.db
          .savepoint(() =>
            strapi.db.transaction(({ onCommit, onRollback }) => {
              onCommit(() => committed.push('failed'));
              onRollback(() => rolledBack.push('failed'));
              throw new Error('test');
            })
          )
          .catch(() => {});

        // Rolled back at the savepoint, not at the end of the transaction
        rolledBackAtSavepoint = [...rolledBack];

        await strapi.db.savepoint(() =>
          strapi.db.transaction(({ onCommit }) => {
            onCommit(() => committed.push('released'));
          })
        );

        // Released callbacks wait for the transaction's commit
        committedBeforeEnd = [...committed];
      });

      return { rolledBackAtSavepoint, committedBeforeEnd, committed };
    },

    savepointOutsideTransaction({ strapi }) {
      return strapi.db.savepoint(() => {});
    },

    // using a transaction object

    async transactionObjectCommit({ strapi, serializeError }, { originalKey }) {
      const trx = await strapi.db.transaction();

      try {
        await setKey(strapi, 'wrong key', trx.get());
        await setKey(strapi, originalKey, trx.get());

        await trx.commit();
        return { reached: true };
      } catch (e) {
        await trx.rollback();
        return { reached: false, error: serializeError(e) };
      }
    },

    async transactionObjectRollback({ strapi, serializeError }) {
      const trx = await strapi.db.transaction();

      try {
        await setKey(strapi, 'wrong key', trx.get());

        // this query should throw because it has errors
        await strapi.db
          .queryBuilder('invalid_uid')
          .update({
            key: 123,
            key_not_here: 'this should error',
          })
          .where({ id: 'this should error' })
          .transacting(trx.get())
          .execute();

        await trx.commit();
        return { reached: true };
      } catch (e) {
        await trx.rollback();
        return { reached: false, error: serializeError(e) };
      }
    },
  },
};
