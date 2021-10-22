'use strict';

const { Job } = require('node-schedule');
const { isFunction } = require('lodash/fp');

const createCronService = () => {
  let jobsSpecs = [];

  return {
    add(tasks = {}) {
      for (const taskExpression in tasks) {
        const taskValue = tasks[taskExpression];

        let fn;
        let options;
        if (isFunction(taskValue)) {
          fn = taskValue.bind(tasks);
          options = taskExpression;
        } else if (isFunction(taskValue.task)) {
          fn = taskValue.task.bind(taskValue);
          options = taskValue.options;
        } else {
          throw new Error(
            `Could not schedule a cron job for "${taskExpression}": no function found.`
          );
        }

        const fnWithStrapi = (...args) => fn({ strapi }, ...args);

        const job = new Job(null, fnWithStrapi);
        jobsSpecs.push({ job, options });
      }
      return this;
    },
    start() {
      if (!strapi.config.get('server.cron.enabled')) {
        return;
      }
      jobsSpecs.forEach(({ job, options }) => job.schedule(options));
      return this;
    },
    stop() {
      jobsSpecs.forEach(({ job }) => job.cancel());
      return this;
    },
    destroy() {
      this.stop();
      jobsSpecs = [];
      return this;
    },
  };
};

module.exports = createCronService;
