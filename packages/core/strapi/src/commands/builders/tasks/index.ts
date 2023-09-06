import type { Ora } from 'ora';
import { dtsTask, DtsTask } from './dts';
import { viteTask, ViteTask } from './vite';
import type { BuildContext, BuildTask } from '../packages';

export interface TaskHandler<Task extends BuildTask> {
  print: (ctx: BuildContext, task: Task) => void;
  run: (ctx: BuildContext, task: Task) => Promise<void>;
  success: (ctx: BuildContext, task: Task) => Promise<void>;
  fail: (ctx: BuildContext, task: Task, err: unknown) => Promise<void>;
  _spinner: Ora | null;
}

const handlers = {
  'build:js': viteTask,
  'build:dts': dtsTask,
};

const buildTaskHandlers = <T extends ViteTask | DtsTask>(t: T): TaskHandler<T> => {
  return handlers[t.type] as TaskHandler<T>;
};

export { buildTaskHandlers };
