import type { Job } from 'node-schedule';

import type { Strapi } from '..';

interface JobSpec {
  job: Job;
  options: string | number | Date;
  name: string | null;
}

type TaskFn = ({ strapi }: { strapi: Strapi }, ...args: unknown[]) => Promise<unknown>;

type Task =
  | TaskFn
  | {
      task: TaskFn;
      options: string;
    };

interface Tasks {
  [key: string]: Task;
}

export interface CronService {
  add(tasks: Tasks): CronService;
  remove(name: string): CronService;
  start(): CronService;
  stop(): CronService;
  destroy(): CronService;
  jobs: JobSpec[];
}
