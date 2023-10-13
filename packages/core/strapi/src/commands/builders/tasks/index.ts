import type { Ora } from 'ora';
import { dtsTask, DtsTask } from './dts';
import { viteTask, ViteTask } from './vite';
import type { BuildContext } from '../packages';

export type Task = ViteTask | DtsTask;

export interface TaskHandler<TTask extends Task> {
  print: (ctx: BuildContext, task: TTask) => void;
  run: (ctx: BuildContext, task: TTask) => Promise<void>;
  success: (ctx: BuildContext, task: TTask) => Promise<void>;
  fail: (ctx: BuildContext, task: TTask, err: unknown) => Promise<void>;
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
