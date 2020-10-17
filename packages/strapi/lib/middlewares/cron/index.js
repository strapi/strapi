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
      if (strapi.config.get('server.cron.enabled', false) === true) {
        _.forEach(_.keys(strapi.config.get('functions.cron', {})), taskExpression => {
          const taskValue = strapi.config.functions.cron[taskExpression];
          const isFunctionValue = _.isFunction(taskValue);

          if (isFunctionValue) {
            cron.scheduleJob(taskExpression, strapi.config.functions.cron[taskExpression]);

            return;
          }

          const options = _.get(strapi.config.functions.cron[taskExpression], 'options', {});

          cron.scheduleJob(
            {
              rule: taskExpression,
              ...options,
            },
            strapi.config.functions.cron[taskExpression]['task']
          );
        });
      }
    },
  };
};
