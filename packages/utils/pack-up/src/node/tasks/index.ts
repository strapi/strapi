import { dtsBuildTask } from './dts/build';
import { dtsWatchTask } from './dts/watch';
import { viteBuildTask } from './vite/build';
import { viteWatchTask } from './vite/watch';

import type { DtsBuildTask } from './dts/build';
import type { DtsWatchTask } from './dts/watch';
import type { ViteBuildTask } from './vite/build';
import type { RollupWatcherEvent, ViteWatchTask } from './vite/watch';
import type { BuildContext } from '../createBuildContext';
import type { Observable } from 'rxjs';
import type ts from 'typescript';

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
