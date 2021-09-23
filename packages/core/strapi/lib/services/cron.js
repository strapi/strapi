'use strict';

const cron = require('node-schedule');
const { isFunction, getOr } = require('lodash/fp');

const createCronService = () => {
  const groupsOfTasks = [];
  let jobs = [];

  return {
    add(newTasks = {}) {
      if (!strapi.config.get('server.cron.enabled')) {
        return;
      }

      groupsOfTasks.push(newTasks);
    },
    start() {
      for (const tasks of groupsOfTasks) {
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
      }
    },
    stop() {
      jobs.forEach(job => job.cancel());
    },
    destroy() {
      this.stop();
    },
  };
};

module.exports = createCronService;
