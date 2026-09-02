import type { Strapi } from '../core';

/**
 * Object schedule previously accepted via node-schedule `Spec`
 * (`rule` + optional `tz` / `start` / `end`).
 */
export interface CronRuleOptions {
  rule: string | Date;
  tz?: string;
  start?: Date | number;
  end?: Date | number;
}

export type CronSchedule = string | number | Date | CronRuleOptions;

type CronJob = import('croner').Cron;

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
