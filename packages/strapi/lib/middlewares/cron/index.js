'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const cron = require('node-schedule');

/**
 * CRON hook
 */

module.exports = strapi => {
  return {
    /**
     * Initialize the hook
     */

    initialize() {
      _.forEach(_.keys(strapi.config.functions.cron), task => {
        cron.scheduleJob(task, strapi.config.functions.cron[task]);
      });
    },
  };
};
