import type { Strapi } from '../core';

export type CronSchedule = string | Date;

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
  jobs: JobSpec[];
}
