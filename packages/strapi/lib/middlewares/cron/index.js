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

          if (_.isFunction(taskValue)) {
            return cron.scheduleJob(taskExpression, taskValue);
          }

          const options = _.get(taskValue, 'options', {});

          cron.scheduleJob(
            {
              rule: taskExpression,
              ...options,
            },
            taskValue.task
          );
        });

        _.forEach(_.keys(strapi.plugins), pluginName => {
          const pluginCron = strapi.plugins[pluginName].config.functions.cron;

          if (pluginCron) {
            _.forEach(_.entries(pluginCron), ([taskExpression, taskValue]) => {
              if (_.isFunction(taskValue)) {
                return cron.scheduleJob(taskExpression, taskValue);
              }

              const options = _.get(taskValue, 'options', {});

              cron.scheduleJob(
                {
                  rule: taskExpression,
                  ...options,
                },
                taskValue.task
              );
            });
          }
        });
      }
    },
  };
};
