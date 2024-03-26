import { Job, RecurrenceRule, RecurrenceSpecDateRange, RecurrenceSpecObjLit } from 'node-schedule';
import { isFunction } from 'lodash/fp';
import type { Strapi } from '@strapi/types';

interface JobSpec {
  job: Job;
  options: RecurrenceRule | RecurrenceSpecDateRange | RecurrenceSpecObjLit | Date | string | number;
  name: string | null;
}

type TaskFn = ({ strapi }: { strapi: Strapi }, ...args: unknown[]) => Promise<unknown>;

type Task =
  | TaskFn
  | {
      task: TaskFn;
      options:
        | RecurrenceRule
        | RecurrenceSpecDateRange
        | RecurrenceSpecObjLit
        | Date
        | string
        | number;
    };

interface Tasks {
  [key: string]: Task;
}

const createCronService = () => {
  let jobsSpecs: JobSpec[] = [];
  let running = false;

  return {
    add(tasks: Tasks = {}) {
      for (const taskExpression of Object.keys(tasks)) {
        const taskValue = tasks[taskExpression];

        let fn: TaskFn;
        let options:
          | RecurrenceRule
          | RecurrenceSpecDateRange
          | RecurrenceSpecObjLit
          | Date
          | string
          | number;
        let taskName: string | null;
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

        const fnWithStrapi = (...args: unknown[]) => fn({ strapi }, ...args);

        // const job = new Job(null, fnWithStrapi);
        const job = new Job(fnWithStrapi);
        jobsSpecs.push({ job, options, name: taskName });

        if (running) {
          // @ts-ignore - can be undone if https://github.com/DefinitelyTyped/DefinitelyTyped/pull/68941 has been accepted
          job.schedule(options);
        }
      }
      return this;
    },

    remove(name: string) {
      if (!name) {
        throw new Error('You must provide a name to remove a cron job.');
      }

      jobsSpecs
        .filter(({ name: jobSpecName }) => jobSpecName === name)
        .forEach(({ job }) => job.cancel());

      jobsSpecs = jobsSpecs.filter(({ name: jobSpecName }) => jobSpecName !== name);
      return this;
    },

    start() {
      // @ts-ignore - can be undone if https://github.com/DefinitelyTyped/DefinitelyTyped/pull/68941 has been accepted
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

export default createCronService;
