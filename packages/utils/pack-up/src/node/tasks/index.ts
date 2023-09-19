import { Ora } from 'ora';

import { ViteTask, viteTask } from './vite';
import { DtsTask, dtsTask } from './dts';
import { BuildContext } from '../createBuildContext';

interface TaskHandler<Task> {
  print(ctx: BuildContext, task: Task): void;
  run(ctx: BuildContext, task: Task): Promise<void>;
  success(ctx: BuildContext, task: Task): Promise<void>;
  fail(ctx: BuildContext, task: Task, err: unknown): Promise<void>;
  _spinner: Ora | null;
}

interface TaskHandlers {
  'build:js': TaskHandler<ViteTask>;
  'build:dts': TaskHandler<DtsTask>;
}

const taskHandlers: TaskHandlers = {
  'build:js': viteTask,
  'build:dts': dtsTask,
};

export { taskHandlers };
export type { TaskHandler, TaskHandlers };
