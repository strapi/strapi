import type { Strapi } from '../core';

/**
 * node-schedule RecurrenceSpecObjLit / RecurrenceRule-shaped objects
 * (`month` is 0–11).
 */
export type RecurrenceSegment = number | string | number[];
export type CronDate = Date | number | string;

export interface RecurrenceSpecObjLit {
  date?: RecurrenceSegment | null;
  dayOfWeek?: RecurrenceSegment | null;
  hour?: RecurrenceSegment | null;
  minute?: RecurrenceSegment | null;
  month?: RecurrenceSegment | null;
  second?: RecurrenceSegment | null;
  year?: RecurrenceSegment | null;
  tz?: string;
  start?: CronDate;
  end?: CronDate;
  recurs?: boolean;
}

/**
 * Object schedule previously accepted via node-schedule `Spec`
 * (`rule` + optional `tz` / `start` / `end`).
 */
export interface CronRuleOptions {
  rule: string | Date | RecurrenceSpecObjLit;
  tz?: string;
  start?: CronDate;
  end?: CronDate;
}

export type CronSchedule = string | number | Date | CronRuleOptions | RecurrenceSpecObjLit;

type CronJob = import('croner').Cron & {
  invoke: () => Promise<unknown>;
  cancel: () => boolean;
  nextInvocation: () => Date | null;
  reschedule: (spec: CronSchedule) => boolean;
};

interface JobSpec {
  job: CronJob;
  options: CronSchedule;
  name: string | null;
}

type TaskFn = ({ strapi }: { strapi: Strapi }, ...args: unknown[]) => Promise<unknown>;

export type CronTask =
  | TaskFn
  | {
      task: TaskFn;
      options: CronSchedule;
    };

export interface CronTasks {
  [key: string]: CronTask;
}

export interface CronService {
  add(tasks: CronTasks): CronService;
  remove(name: string): CronService;
  start(): CronService;
  stop(): CronService;
  destroy(): CronService;
  readonly jobs: JobSpec[];
}
