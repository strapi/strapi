import { isFunction } from 'lodash/fp';
import type { Core } from '@strapi/types';
import type { Cron } from 'croner';

export type CronSchedule = string | Date;

// Lazy: only required when a cron task is actually scheduled
let lazyCroner: typeof import('croner') | undefined;
const getCroner = (): typeof import('croner') => {
  if (!lazyCroner) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    lazyCroner = require('croner');
  }
  return lazyCroner as typeof import('croner');
};

interface JobSpec {
  job: Cron;
  options: CronSchedule;
  name: string | null;
}

type TaskFn = ({ strapi }: { strapi: Core.Strapi }, ...args: unknown[]) => Promise<unknown>;

type Task =
  | TaskFn
  | {
      task: TaskFn;
      options: CronSchedule;
    };

interface Tasks {
  [key: string]: Task;
}

const createCronService = () => {
  let jobsSpecs: JobSpec[] = [];
  let running = false;

  return {
    add(tasks: Tasks = {}) {
      const { Cron: CronJob } = getCroner();

      for (const taskExpression of Object.keys(tasks)) {
        const taskValue = tasks[taskExpression];

        let fn: TaskFn;
        let options: CronSchedule;
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

        const jobLabel = taskName ?? taskExpression;
        const fnWithStrapi = async (): Promise<void> => {
          await fn({ strapi });
        };

        const job: Cron = new CronJob(
          options,
          {
            name: taskName ?? undefined,
            paused: !running,
            ...(options instanceof Date ? { maxRuns: 1 } : {}),
            catch(error) {
              strapi.log.error(`Cron job "${jobLabel}" failed`, error);
            },
          },
          fnWithStrapi
        );

        jobsSpecs.push({ job, options, name: taskName });
      }
      return this;
    },

    remove(name: string) {
      if (!name) throw new Error('You must provide a name to remove a cron job.');
      const remaining: JobSpec[] = [];
      for (const jobSpec of jobsSpecs) {
        if (jobSpec.name === name) {
          jobSpec.job.stop();
        } else {
          remaining.push(jobSpec);
        }
      }
      jobsSpecs = remaining;
      return this;
    },

    start() {
      jobsSpecs.forEach(({ job }) => job.resume());
      running = true;
      return this;
    },

    stop() {
      jobsSpecs.forEach(({ job }) => job.pause());
      running = false;
      return this;
    },

    destroy() {
      this.stop();
      jobsSpecs.forEach(({ job }) => job.stop());
      jobsSpecs = [];
      return this;
    },

    get jobs() {
      return jobsSpecs;
    },
  };
};

export default createCronService;
