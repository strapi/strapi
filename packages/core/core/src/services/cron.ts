import { isFunction } from 'lodash/fp';
import type { Core } from '@strapi/types';
import type { Cron } from 'croner';

export type RecurrenceSegment = number | string | number[];

/**
 * node-schedule RecurrenceSpecObjLit / RecurrenceRule-shaped objects
 * (`month` is 0–11, matching Date / node-schedule).
 */
export type RecurrenceSpecObjLit = {
  date?: RecurrenceSegment | null;
  dayOfWeek?: RecurrenceSegment | null;
  hour?: RecurrenceSegment | null;
  minute?: RecurrenceSegment | null;
  month?: RecurrenceSegment | null;
  second?: RecurrenceSegment | null;
  year?: RecurrenceSegment | null;
  tz?: string;
  start?: Date | number | string;
  end?: Date | number | string;
  recurs?: boolean;
};

export type CronRuleOptions = {
  rule: string | Date | RecurrenceSpecObjLit;
  tz?: string;
  start?: Date | number | string;
  end?: Date | number | string;
};

export type CronSchedule = string | number | Date | CronRuleOptions | RecurrenceSpecObjLit;

export type CronJobHandle = Cron & {
  invoke: () => Promise<unknown>;
  cancel: () => boolean;
  nextInvocation: () => Date | null;
  reschedule: (spec: CronSchedule) => boolean;
};

let lazyCroner: typeof import('croner') | undefined;
const getCroner = (): typeof import('croner') => {
  if (!lazyCroner) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    lazyCroner = require('croner');
  }
  return lazyCroner as typeof import('croner');
};

interface JobSpec {
  job: CronJobHandle;
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

const RECURRENCE_KEYS = [
  'date',
  'dayOfWeek',
  'hour',
  'minute',
  'month',
  'second',
  'year',
  'recurs',
] as const;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !(value instanceof Date);

const isRuleOptions = (value: unknown): value is CronRuleOptions =>
  isPlainObject(value) && 'rule' in value;

const isRecurrenceSpec = (value: unknown): value is RecurrenceSpecObjLit =>
  isPlainObject(value) && !('rule' in value) && RECURRENCE_KEYS.some((key) => key in value);

const toDate = (value: Date | number | string): Date =>
  value instanceof Date ? value : new Date(value);

const segmentToField = (segment: unknown, fallback = '*'): string => {
  if (segment == null) {
    return fallback;
  }

  if (typeof segment === 'number' || typeof segment === 'string') {
    return String(segment);
  }

  if (Array.isArray(segment)) {
    return segment.map((part) => String(part)).join(',');
  }

  if (isPlainObject(segment)) {
    const start = segment.start ?? segment.from;
    const end = segment.end ?? segment.to;
    if (start != null && end != null) {
      const step = segment.step;
      return step != null ? `${start}-${end}/${step}` : `${start}-${end}`;
    }
  }

  return fallback;
};

const bumpMonth = (segment: unknown): unknown => {
  if (segment == null) {
    return segment;
  }
  if (typeof segment === 'number') {
    return segment + 1;
  }
  if (Array.isArray(segment)) {
    return segment.map((part) => (typeof part === 'number' ? part + 1 : part));
  }
  return segment;
};

const recurrenceToCron = (spec: RecurrenceSpecObjLit): string => {
  if (spec.year != null) {
    throw new Error('Unsupported cron schedule: year is not supported');
  }

  const second = segmentToField(spec.second, '0');
  const minute = segmentToField(spec.minute);
  const hour = segmentToField(spec.hour);
  const date = segmentToField(spec.date);
  const month = segmentToField(bumpMonth(spec.month));
  const dayOfWeek = segmentToField(spec.dayOfWeek);

  return `${second} ${minute} ${hour} ${date} ${month} ${dayOfWeek}`;
};

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

  if (isRecurrenceSpec(options)) {
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
    return { pattern: recurrenceToCron(options), cronerOptions };
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

    let pattern: string | Date = options.rule as string | Date;
    if (isRecurrenceSpec(options.rule)) {
      pattern = recurrenceToCron(options.rule);
    } else if (options.rule instanceof Date) {
      cronerOptions.maxRuns = 1;
      pattern = options.rule;
    }

    return { pattern, cronerOptions };
  }

  throw new Error('Unsupported cron schedule');
};

const createCronService = () => {
  let jobsSpecs: JobSpec[] = [];
  let running = false;

  const attachHandle = (job: Cron, fn: TaskFn, jobLabel: string): CronJobHandle => {
    const handle = job as CronJobHandle;

    handle.invoke = async () => {
      const fireDate = handle.currentRun() ?? new Date();
      return fn({ strapi }, fireDate);
    };

    handle.cancel = () => {
      handle.stop();
      return true;
    };
    handle.nextInvocation = () => handle.nextRun();

    handle.reschedule = (spec: CronSchedule) => {
      try {
        const idx = jobsSpecs.findIndex((jobSpec) => jobSpec.job === handle);
        if (idx === -1) {
          return false;
        }

        const { Cron: CronJob } = getCroner();
        const { pattern, cronerOptions } = toCronerArgs(spec);
        handle.stop();

        const next = new CronJob(
          pattern,
          {
            paused: !running,
            ...cronerOptions,
            catch(error: unknown) {
              strapi.log.error(`Cron job "${jobLabel}" failed`, error);
            },
          },
          createRunner(fn)
        );

        const nextHandle = attachHandle(next, fn, jobLabel);
        jobsSpecs[idx] = {
          ...jobsSpecs[idx],
          job: nextHandle,
          options: spec,
        };
        return true;
      } catch (error) {
        strapi.log.error(`Could not reschedule cron job "${jobLabel}"`, error);
        return false;
      }
    };

    return handle;
  };

  const createRunner = (fn: TaskFn) => {
    return async (self?: Cron): Promise<void> => {
      const fireDate = self?.currentRun() ?? new Date();
      await fn({ strapi }, fireDate);
    };
  };

  return {
    add(tasks: Tasks = {}) {
      const { Cron: CronJob } = getCroner();

      for (const taskExpression of Object.keys(tasks)) {
        const taskValue = tasks[taskExpression];

        let fn: TaskFn;
        let options: CronSchedule;
        let taskName: string | null;
        if (isFunction(taskValue)) {
          taskName = null;
          fn = taskValue.bind(tasks);
          options = taskExpression;
        } else if (isFunction(taskValue.task)) {
          taskName = taskExpression;
          fn = taskValue.task.bind(taskValue);
          options = taskValue.options;
        } else {
          throw new Error(
            `Could not schedule a cron job for "${taskExpression}": no function found.`
          );
        }

        const jobLabel = taskName ?? taskExpression;

        try {
          const { pattern, cronerOptions } = toCronerArgs(options);

          const job: Cron = new CronJob(
            pattern,
            {
              paused: !running,
              ...cronerOptions,
              catch(error: unknown) {
                strapi.log.error(`Cron job "${jobLabel}" failed`, error);
              },
            },
            createRunner(fn)
          );

          jobsSpecs.push({
            job: attachHandle(job, fn, jobLabel),
            options,
            name: taskName,
          });
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
