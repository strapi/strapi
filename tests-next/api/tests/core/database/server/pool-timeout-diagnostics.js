'use strict';

const os = require('node:os');

const ITEM_UID = 'api::pool-item.pool-item';
// Privileged and never bound in a test environment, so connecting to it is refused
const REFUSED_PORT = 1;

/** knex as @strapi/database loads it, for `instanceof` checks on its errors. */
const knex = require(require.resolve('knex', { paths: [require.resolve('@strapi/database')] }));

let barrier;
// The first timed-out query rolls its transaction back and frees a connection.
// Hold every connection until the other queries have timed out too, or one of
// them acquires that connection and the create succeeds.
let release;

/** Calls to the logger methods, while a capture runs. */
let captured;
let restoreLog;

const createBarrier = (parties) => {
  let arrived = 0;
  let open = () => {};
  const opened = new Promise((resolve) => {
    open = resolve;
  });

  return async () => {
    arrived += 1;
    if (arrived >= parties) {
      open();
    }
    await opened;
  };
};

async function rawQueryOutsideTransaction(strapi) {
  const rows = await strapi.db.connection('strapi_core_store_settings').select('id').limit(1);
  return rows;
}

/** A logged value as JSON: errors keep what the test checks. */
const serializeLogged = (value, serializeError) => {
  if (value instanceof Error) {
    return { ...serializeError(value), isKnexTimeoutError: value instanceof knex.KnexTimeoutError };
  }
  return typeof value === 'string' ? value : String(value);
};

module.exports = {
  bootstrap({ strapi }) {
    strapi.db.lifecycles.subscribe({
      models: [ITEM_UID],
      async beforeCreate() {
        if (barrier) {
          // Wait until every request holds its transaction, then query outside it
          await barrier();
          try {
            await rawQueryOutsideTransaction(strapi);
          } finally {
            if (release) {
              await release();
            }
          }
        }
      },
    });
  },

  actions: {
    poolMax({ strapi }) {
      return strapi.db.connection.client.pool.max;
    },

    /** The next `parties` creates wait for each other, then query outside their transaction. */
    arm(_, { parties }) {
      barrier = createBarrier(parties);
      release = createBarrier(parties);
    },

    disarm() {
      barrier = undefined;
      release = undefined;
    },

    /** Record the calls to `strapi.log.error` and `strapi.log.warn` (the old test spied on them). */
    captureLogs({ strapi }) {
      const { error, warn } = strapi.log;
      captured = { error: [], warn: [] };
      strapi.log.error = (...args) => {
        captured.error.push(args);
        return error.apply(strapi.log, args);
      };
      strapi.log.warn = (...args) => {
        captured.warn.push(args);
        return warn.apply(strapi.log, args);
      };
      restoreLog = () => {
        strapi.log.error = error;
        strapi.log.warn = warn;
      };
    },

    /** Stop recording; returns the first argument of each call. */
    capturedLogs({ serializeError }) {
      restoreLog?.();
      restoreLog = undefined;
      const calls = captured ?? { error: [], warn: [] };
      captured = undefined;
      return {
        error: calls.error.map(([value]) => serializeLogged(value, serializeError)),
        warn: calls.warn.map(([value]) => serializeLogged(value, serializeError)),
      };
    },

    hostname() {
      return os.hostname();
    },

    /** A second Database on a port that refuses connections, with a recording logger. */
    async refusedConnection({ strapi, serializeError }) {
      const { Database } = require('@strapi/database');

      const base = strapi.config.get('database.connection');
      const warnings = [];
      const noop = () => {};
      const logger = {
        info: noop,
        warn: (message) => warnings.push(String(message)),
        error: noop,
        debug: noop,
      };
      const db = new Database({
        connection: {
          ...base,
          connection: { ...base.connection, host: '127.0.0.1', port: REFUSED_PORT },
          pool: { min: 0, max: 2 },
          acquireConnectionTimeout: 1500,
        },
        settings: { migrations: { dir: os.tmpdir() } },
        logger,
      });

      try {
        // With propagateCreateError (the default) each failed attempt rejects one caller directly;
        // only the callers beyond that wait and time out, so it takes dozens of callers
        const results = await Promise.allSettled(
          Array.from({ length: 50 }, () => db.connection.raw('select 1'))
        );
        const timeouts = results
          .filter((result) => result.status === 'rejected')
          .map((result) => result.reason)
          .filter((reason) => reason?.name === 'KnexTimeoutError')
          .map((reason) => serializeError(reason));

        return { timeouts, warnings };
      } finally {
        await db.destroy();
      }
    },
  },
};
