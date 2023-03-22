'use strict';

const { Job } = require('node-schedule');
const { isFunction } = require('lodash/fp');

const createCronService = () => {
  let jobsSpecs = [];
  let running = false;

  return {
    add(tasks = {}) {
      for (const taskExpression of Object.keys(tasks)) {
        const taskValue = tasks[taskExpression];

        let fn;
        let options;
        let taskName;
        if (isFunction(taskValue)) {
          // don't use task name if key is the rule
          taskName = null;
          fn = taskValue.bind(tasks);
          options = taskExpression;
        } else if (isFunction(taskValue.task)) {
          // set task name if key is not the rule
          taskName = taskExpression;
          fn = taskValue.task.bind(taskValue);
          options = taskValue.options;
        } else {
          throw new Error(
            `Could not schedule a cron job for "${taskExpression}": no function found.`
          );
        }

        const fnWithStrapi = (...args) => fn({ strapi }, ...args);

        const job = new Job(null, fnWithStrapi);
        jobsSpecs.push({ job, options, name: taskName });

        if (running) {
          job.schedule(options);
        }
      }
      return this;
    },
    remove(name) {
      if (!name) throw new Error('You must provide a name to remove a cron job.');
      const matchingJobsSpecs = jobsSpecs.filter(({ name: jobSpecName }) => jobSpecName === name);
      matchingJobsSpecs.forEach(({ job }) => job.cancel());
      jobsSpecs = jobsSpecs.filter(({ name: jobSpecName }) => jobSpecName !== name);
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
    jobs: jobsSpecs,
  };
};

module.exports = createCronService;
