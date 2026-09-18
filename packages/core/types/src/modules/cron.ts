import type { Strapi } from '../core';

/**
 * node-schedule RecurrenceSpecObjLit / RecurrenceRule-shaped objects
 * (`month` is 0–11).
 */
export interface RecurrenceRange {
  start: number;
  end: number;
  step?: number;
}

export type RecurrenceSegment =
  | number
  | string
  | RecurrenceRange
  | Array<number | string | RecurrenceRange>;
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
  rule: CronDate | RecurrenceSpecObjLit;
  tz?: string;
  start?: CronDate;
  end?: CronDate;
}

export type CronSchedule = string | number | Date | CronRuleOptions | RecurrenceSpecObjLit;

export type CronJob = import('croner').Cron & {
  invoke: () => Promise<unknown>;
  cancel: () => boolean;
  nextInvocation: () => Date | null;
  reschedule: (spec: CronSchedule) => boolean;
};

export interface JobSpec {
  job: CronJob;
  options: CronSchedule;
  name: string | null;
}

export type CronTaskFn = ({ strapi }: { strapi: Strapi }, ...args: unknown[]) => Promise<unknown>;

export type CronTask =
  | CronTaskFn
  | {
      task: CronTaskFn;
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
