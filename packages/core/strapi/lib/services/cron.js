'use strict';

const { Job } = require('node-schedule');
const { isFunction, forEach } = require('lodash/fp');

const createCronService = () => {
  let jobsSpecsMap = {};

  return {
    add(tasks = {}, namespace) {
      if (!namespace) {
        throw new Error('Tasks should be attached to a namespace.');
      }
      jobsSpecsMap[namespace] = jobsSpecsMap[namespace] || [];

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
        jobsSpecsMap[namespace].push({ job, options });
      }
      return this;
    },

    start(namespace) {
      if (namespace && !jobsSpecsMap[namespace]) {
        throw new Error('namespace not found');
      }

      if (!namespace) {
        forEach(jobs => jobs.forEach(({ job, options }) => job.schedule(options)))(jobsSpecsMap);
        return this;
      }

      jobsSpecsMap[namespace].forEach(({ job, options }) => job.schedule(options));
      return this;
    },

    stop(namespace) {
      if (namespace && !jobsSpecsMap[namespace]) {
        throw new Error('namespace not found');
      }

      if (!namespace) {
        forEach(jobs => jobs.forEach(({ job }) => job.cancel()))(jobsSpecsMap);
        return this;
      }

      jobsSpecsMap[namespace].forEach(({ job }) => job.cancel());
      return this;
    },

    destroy() {
      this.stop();
      jobsSpecsMap = {};
      return this;
    },
  };
};

module.exports = createCronService;
