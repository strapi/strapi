import ts from 'typescript';

import { BuildContext } from '../createBuildContext';

import { dtsBuildTask, DtsBuildTask } from './dts/build';
import { dtsWatchTask, DtsWatchTask } from './dts/watch';
import { viteBuildTask, ViteBuildTask } from './vite/build';
import { RollupWatcherEvent, viteWatchTask, ViteWatchTask } from './vite/watch';

import type { Observable } from 'rxjs';

interface TaskHandler<Task, Result = void> {
  print(ctx: BuildContext, task: Task): void;
  run$(ctx: BuildContext, task: Task): Observable<Result>;
  success(ctx: BuildContext, task: Task, result: Result): void;
  fail(ctx: BuildContext, task: Task, err: unknown): void;
}

interface TaskHandlers {
  'build:js': TaskHandler<ViteBuildTask>;
  'build:dts': TaskHandler<DtsBuildTask>;
  'watch:js': TaskHandler<ViteWatchTask, RollupWatcherEvent>;
  'watch:dts': TaskHandler<DtsWatchTask, ts.Diagnostic>;
}

const taskHandlers: TaskHandlers = {
  'build:js': viteBuildTask,
  'build:dts': dtsBuildTask,
  'watch:js': viteWatchTask,
  'watch:dts': dtsWatchTask,
};

export { taskHandlers };
export type { TaskHandler, TaskHandlers };
