import type { Job, Spec } from 'node-schedule';

import type { Strapi } from '../core';

interface JobSpec {
  job: Job;
  options: Spec;
  name: string | null;
}

type TaskFn = ({ strapi }: { strapi: Strapi }, ...args: unknown[]) => Promise<unknown>;

export type CronTask =
  | TaskFn
  | {
      task: TaskFn;
      options: Spec;
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
