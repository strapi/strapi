import { isFunction } from 'lodash/fp';
import type { Core } from '@strapi/types';
import type { Cron } from 'croner';

export type CronRuleOptions = {
  rule: string | Date;
  tz?: string;
  start?: Date | number;
  end?: Date | number;
};

export type CronSchedule = string | number | Date | CronRuleOptions;

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

const isRuleOptions = (value: CronSchedule): value is CronRuleOptions =>
  typeof value === 'object' && value !== null && !(value instanceof Date) && 'rule' in value;

const toDate = (value: Date | number): Date => (value instanceof Date ? value : new Date(value));

const toCronerArgs = (
  options: CronSchedule
): { pattern: string | Date; cronerOptions: Record<string, unknown> } => {
  if (typeof options === 'number') {
    return { pattern: new Date(options), cronerOptions: { maxRuns: 1 } };
  }

  if (options instanceof Date) {
    return { pattern: options, cronerOptions: { maxRuns: 1 } };
  }

  if (typeof options === 'string') {
    return { pattern: options, cronerOptions: {} };
  }

  if (isRuleOptions(options)) {
    const cronerOptions: Record<string, unknown> = {};

    if (options.tz) {
      cronerOptions.timezone = options.tz;
    }
    if (options.start != null) {
      cronerOptions.startAt = toDate(options.start);
    }
    if (options.end != null) {
      cronerOptions.stopAt = toDate(options.end);
    }
    if (options.rule instanceof Date) {
      cronerOptions.maxRuns = 1;
    }

    return { pattern: options.rule, cronerOptions };
  }

  throw new Error('Unsupported cron schedule');
};

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

        try {
          const { pattern, cronerOptions } = toCronerArgs(options);

          // Do not pass `name` into Croner: it requires unique names and throws
          // on duplicates, while this façade keys identity on JobSpec.name.
          const job: Cron = new CronJob(
            pattern,
            {
              paused: !running,
              ...cronerOptions,
              catch(error: unknown) {
                strapi.log.error(`Cron job "${jobLabel}" failed`, error);
              },
            },
            fnWithStrapi
          );

          jobsSpecs.push({ job, options, name: taskName });
        } catch (error) {
          strapi.log.error(`Could not schedule cron job "${jobLabel}": invalid schedule`, error);
        }
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
