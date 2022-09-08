'use strict';

const { Job } = require('node-schedule');
const { isFunction } = require('lodash/fp');

const createCronService = () => {
  let jobsSpecs = [];
  let running = false;

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

        if (running) {
          job.schedule(options);
        }
      }
      return this;
    },
    start() {
      jobsSpecs.forEach(({ job, options }) => job.schedule(options));
      running = true;
      return this;
    },
    stop() {
      jobsSpecs.forEach(({ job }) => job.cancel());
      running = false;
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
