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

module.exports = function (strapi) {
  const hook = {

    /**
     * Default options
     */

    defaults: {
      cron: {}
    },

    /**
     * Initialize the hook
     */

    initialize: function (cb) {
      if (_.isPlainObject(strapi.config.cron) && !_.isEmpty(strapi.config.cron)) {
        _.forEach(_.keys(strapi.config.cron), function (task) {
          cron.scheduleJob(task, strapi.config.cron[task]);
        });
      }

      cb();
    }
  };

  return hook;
};
