import path from 'path';

import type { BuildContext, Targets } from './createBuildContext';
import type { DtsTask } from './tasks/dts';
import type { ViteTask, ViteTaskEntry } from './tasks/vite';
import type { Extensions } from './core/exports';

type BuildTask = DtsTask | ViteTask;

/**
 * @description Create the build tasks for the pipeline, this
 * comes from the exports map we've created in the build context.
 * But handles each export line uniquely with space to add more
 * as the standard develops.
 */
const createBuildTasks = async (ctx: BuildContext): Promise<BuildTask[]> => {
  const tasks: BuildTask[] = [];

  const dtsTask: DtsTask = {
    type: 'build:dts',
    entries: [],
  };

  const viteTasks: Record<string, ViteTask> = {};

  const createViteTask = (
    format: Extensions,
    runtime: keyof Targets,
    { output, ...restEntry }: ViteTaskEntry & Pick<ViteTask, 'output'>
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
        type: 'build:js',
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

    const runtime = exp._path.includes('strapi-admin')
      ? 'web'
      : exp._path.includes('strapi-server')
      ? 'node'
      : '*';

    if (exp.require) {
      /**
       * register CJS task
       */
      createViteTask('cjs', runtime, {
        path: exp._path,
        entry: exp.source,
        output: exp.require,
      });
    }

    if (exp.import) {
      /**
       * register ESM task
       */
      createViteTask('es', runtime, {
        path: exp._path,
        entry: exp.source,
        output: exp.import,
      });
    }
  }

  tasks.push(dtsTask, ...Object.values(viteTasks));

  return tasks;
};

export { createBuildTasks };
export type { BuildTask };
