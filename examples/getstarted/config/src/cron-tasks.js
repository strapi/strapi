'use strict';

/**
 * Cron config that gives you an opportunity
 * to run scheduled jobs.
 *
 * The cron format consists of:
 * [MINUTE] [HOUR] [DAY OF MONTH] [MONTH OF YEAR] [DAY OF WEEK] [YEAR (optional)]
 *
 * It uses https://github.com/node-schedule/node-schedule under the hood
 */

module.exports = {
  /**
   * Simple example.
   * Every monday at 1am.
   */
  // '0 0 1 * * 1': async function({ strapi }) {
  //   // Add your own logic here (e.g. send a queue of email, create a database backup, etc.).
  // },
  // 'myJob': {
  //   task: ({ strapi }) => { /* Add your own logic here */ },
  //   options: {
  //     rule: '* * * * * *',
  //     end: new Date().getTime() + 6000,
  //   }
  // }
};
