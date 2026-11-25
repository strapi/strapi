'use strict';

const ITEM_UID = 'api::timeout-item.timeout-item';
// Long enough that a query only finishes early if it really was cancelled
const SLEEP_SECONDS = 5;

const pool = (strapi) => strapi.db.connection.client.pool;

// A query builder query that sleeps on the database side, so execute() applies the timeout
const sleepingQuery = (strapi) =>
  strapi.db
    .queryBuilder(ITEM_UID)
    .select(['id', strapi.db.connection.raw(`pg_sleep(${SLEEP_SECONDS})`)])
    .execute({ mapResults: false });

module.exports = {
  actions: {
    // Set after boot: the setting is read per query, and this keeps boot itself unaffected
    setQueryTimeout({ strapi }, { queryTimeout }) {
      strapi.db.config.settings.queryTimeout = queryTimeout ?? undefined;
    },

    sleepingQuery({ strapi }) {
      return sleepingQuery(strapi);
    },

    sleepingQueryInTransaction({ strapi }) {
      return strapi.db.transaction(() => sleepingQuery(strapi));
    },

    async runningSleeps({ strapi }) {
      const rows = await strapi.db.connection
        .select('pid')
        .from('pg_stat_activity')
        .where('query', 'like', '%pg_sleep(%')
        .andWhere('state', 'active')
        .andWhereRaw('pid <> pg_backend_pid()');

      return rows.length;
    },

    poolUsed({ strapi }) {
      return pool(strapi).numUsed();
    },

    async countItems({ strapi }) {
      const rows = await strapi.db.queryBuilder(ITEM_UID).select('*').execute();
      return rows.length;
    },

    async rawSleep({ strapi }, { seconds }) {
      await strapi.db.connection.raw(`select pg_sleep(${Number(seconds)})`);
      return true;
    },
  },
};
