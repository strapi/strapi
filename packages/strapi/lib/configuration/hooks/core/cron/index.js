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
     * Default options
     */

    defaults: {
      cron: {}
    },

    /**
     * Initialize the hook
     */

    initialize: cb => {
      if (_.isPlainObject(strapi.config.cron) && !_.isEmpty(strapi.config.cron)) {
        _.forEach(_.keys(strapi.config.cron), task => {
          cron.scheduleJob(task, strapi.config.cron[task]);
        });
      }

      cb();
    }
  };
};
