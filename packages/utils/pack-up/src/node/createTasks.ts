import path from 'path';

import { DtsWatchTask } from './tasks/dts/watch';
import { ViteBaseTask, ViteTaskEntry } from './tasks/vite/types';
import { ViteWatchTask } from './tasks/vite/watch';

import type { Extensions } from './core/exports';
import type { BuildContext, Runtime } from './createBuildContext';
import type { DtsBuildTask } from './tasks/dts/build';
import type { DtsBaseTask } from './tasks/dts/types';
import type { ViteBuildTask } from './tasks/vite/build';

type BuildTask = DtsBuildTask | ViteBuildTask;
type WatchTask = ViteWatchTask | DtsWatchTask;

type BaseTask = ViteBaseTask | DtsBaseTask;

/**
 * @description Create the build tasks for the pipeline, this
 * comes from the exports map we've created in the build context.
 * But handles each export line uniquely with space to add more
 * as the standard develops.
 */
const createTasks =
  <TMode extends 'build' | 'watch'>(mode: TMode) =>
  async (ctx: BuildContext): Promise<TMode extends 'build' ? BuildTask[] : WatchTask[]> => {
    const tasks: Array<BaseTask> = [];

    const dtsTask: DtsBaseTask = {
      type: `${mode}:dts`,
      entries: [],
    };

    const viteTasks: Record<string, ViteBaseTask> = {};

    const createViteTask = (
      format: Extensions,
      runtime: Runtime,
      { output, ...restEntry }: ViteTaskEntry & Pick<ViteWatchTask | ViteBuildTask, 'output'>
    ) => {
      const buildId = `${format}:${output}`;

      if (viteTasks[buildId]) {
        viteTasks[buildId].entries.push(restEntry);

        if (output !== viteTasks[buildId].output) {
          ctx.logger.warn(
            'Multiple entries with different outputs for the same format are not supported. The first output will be used.'
          );
        }
      } else {
        viteTasks[buildId] = {
          type: `${mode}:js`,
          format,
          output,
          runtime,
          entries: [restEntry],
        };
      }
    };

    const exps = Object.entries(ctx.exports).map(([exportPath, exportEntry]) => ({
      ...exportEntry,
      _path: exportPath,
    }));

    for (const exp of exps) {
      if (exp.types) {
        const importId = path.join(ctx.pkg.name, exp._path);

        dtsTask.entries.push({
          importId,
          exportPath: exp._path,
          sourcePath: exp.source,
          targetPath: exp.types,
        });
      }

      if (exp.require) {
        /**
         * register CJS task
         */
        createViteTask('cjs', ctx.runtime ?? '*', {
          path: exp._path,
          entry: exp.source,
          output: exp.require,
        });
      }

      if (exp.import) {
        /**
         * register ESM task
         */
        createViteTask('es', ctx.runtime ?? '*', {
          path: exp._path,
          entry: exp.source,
          output: exp.import,
        });
      }

      if (exp.browser?.require) {
        createViteTask('cjs', 'web', {
          path: exp._path,
          entry: exp.browser?.source || exp.source,
          output: exp.browser.require,
        });
      }

      if (exp.browser?.import) {
        createViteTask('cjs', 'web', {
          path: exp._path,
          entry: exp.browser?.source || exp.source,
          output: exp.browser.import,
        });
      }
    }

    const bundles = ctx.config.bundles ?? [];

    for (const bundle of bundles) {
      const idx = bundles.indexOf(bundle);

      if (bundle.require) {
        createViteTask('cjs', (bundle.runtime || ctx.runtime) ?? '*', {
          path: `bundle_cjs_${idx}`,
          entry: bundle.source,
          output: bundle.require,
        });
      }

      if (bundle.import) {
        createViteTask('es', (bundle.runtime || ctx.runtime) ?? '*', {
          path: `bundle_esm_${idx}`,
          entry: bundle.source,
          output: bundle.import,
        });
      }

      if (bundle.types) {
        const importId = path.join(ctx.pkg.name, bundle.source);

        dtsTask.entries.push({
          importId,
          exportPath: bundle.source,
          sourcePath: bundle.source,
          targetPath: bundle.types,
          tsconfig: bundle.tsconfig,
        });
      }
    }

    if (dtsTask.entries.length) {
      tasks.push(dtsTask);
    }
    if (Object.values(viteTasks).length) {
      tasks.push(...Object.values(viteTasks));
    }

    return tasks as TMode extends 'build' ? BuildTask[] : WatchTask[];
  };

const createBuildTasks = createTasks('build');
const createWatchTasks = createTasks('watch');

export { createBuildTasks, createWatchTasks };
export type { BuildTask, WatchTask, BaseTask };
