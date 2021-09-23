'use strict';

const cron = require('node-schedule');
const { isFunction, getOr } = require('lodash/fp');

const cronRegistry = () => {
  let jobs = [];

  return {
    add(tasks = {}) {
      if (!strapi.config.get('server.cron.enabled')) {
        return;
      }

      for (const taskExpression in tasks) {
        const taskValue = tasks[taskExpression];

        if (isFunction(taskValue)) {
          const instanciatedTask = taskValue(strapi);
          return cron.scheduleJob(taskExpression, instanciatedTask);
        }

        const options = getOr({}, 'options', taskValue);

        const job = cron.scheduleJob(
          {
            rule: taskExpression,
            ...options,
          },
          taskValue.task(strapi)
        );
        jobs.push(job);
      }
    },
    cancelAll() {
      jobs.forEach(job => job.cancel());
      jobs = [];
    },
  };
};

module.exports = cronRegistry;
