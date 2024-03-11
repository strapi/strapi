import type {
  Job,
  RecurrenceRule,
  RecurrenceSpecDateRange,
  RecurrenceSpecObjLit,
} from 'node-schedule';

import type { Strapi } from '..';

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

export interface CronService {
  add(tasks: Tasks): CronService;
  remove(name: string): CronService;
  start(): CronService;
  stop(): CronService;
  destroy(): CronService;
  jobs: JobSpec[];
}
