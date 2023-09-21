import path from 'path';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import { parseExports, PackageJson, ExtMap, Export } from '../utils/pkg';
import type { Logger } from '../utils/logger';
import type { ViteTask } from './tasks/vite';
import type { DtsTask } from './tasks/dts';
import type { Task } from './tasks';

interface BuildContextArgs {
  cwd: string;
  extMap: ExtMap;
  logger: Logger;
  pkg: PackageJson;
}

export type Target = 'node' | 'web' | '*';

export type Targets = {
  [target in Target]: string[];
};

export interface BuildContext {
  cwd: string;
  exports: Record<string, Export>;
  external: string[];
  extMap: ExtMap;
  logger: Logger;
  pkg: PackageJson;
  targets: Targets;
  distPath: string;
}

const DEFAULT_BROWSERS_LIST_CONFIG = [
  'last 3 major versions',
  'Firefox ESR',
  'last 2 Opera  versions',
  'not dead',
  'node 16.0.0',
];

/**
 * @description Create a build context for the pipeline we're creating,
 * this is shared among tasks so they all use the same settings for core pieces
 * such as a target, distPath, externals etc.
 */
const createBuildContext = async ({
  cwd,
  extMap,
  logger,
  pkg,
}: BuildContextArgs): Promise<BuildContext> => {
  const targets = {
    '*': browserslistToEsbuild(pkg.browserslist ?? DEFAULT_BROWSERS_LIST_CONFIG),
    node: browserslistToEsbuild(['node 16.0.0']),
    web: ['esnext'],
  };

  const exportsArray = parseExports({ extMap, pkg }).reduce((acc, x) => {
    const { _path: exportPath, ...exportEntry } = x;

    return { ...acc, [exportPath]: exportEntry };
  }, {} as Record<string, Export>);

  const external = [
    ...(pkg.dependencies ? Object.keys(pkg.dependencies) : []),
    ...(pkg.peerDependencies ? Object.keys(pkg.peerDependencies) : []),
  ];

  const outputPaths = Object.values(exportsArray)
    .flatMap((exportEntry) => {
      return [exportEntry.import, exportEntry.require].filter((v): v is string => Boolean(v));
    })
    .map((p) => path.resolve(cwd, p));

  const distPath = findCommonDirPath(outputPaths);

  if (distPath === cwd) {
    throw new Error(
      'all output files must share a common parent directory which is not the root package directory'
    );
  }

  if (!distPath) {
    throw new Error("could not detect 'dist' path");
  }

  return {
    logger,
    cwd,
    pkg,
    exports: exportsArray,
    external,
    distPath,
    targets,
    extMap,
  };
};

const pathContains = (containerPath: string, itemPath: string): boolean => {
  return !path.relative(containerPath, itemPath).startsWith('..');
};

const findCommonDirPath = (filePaths: string[]) => {
  /**
   * @type {string | undefined}
   */
  let commonPath;

  for (const filePath of filePaths) {
    let dirPath = path.dirname(filePath);

    if (!commonPath) {
      commonPath = dirPath;
      // eslint-disable-next-line no-continue
      continue;
    }

    while (dirPath !== commonPath) {
      dirPath = path.dirname(dirPath);

      if (dirPath === commonPath) {
        break;
      }

      if (pathContains(dirPath, commonPath)) {
        commonPath = dirPath;
        break;
      }

      if (dirPath === '.') return undefined;
    }
  }

  return commonPath;
};

/**
 * @description Create the build tasks for the pipeline, this
 * comes from the exports map we've created in the build context.
 * But handles each export line uniquely with space to add more
 * as the standard develops.
 */
const createBuildTasks = async (ctx: BuildContext): Promise<Task[]> => {
  const tasks: Task[] = [];

  const dtsTask: DtsTask = {
    type: 'build:dts',
    entries: [],
  };

  const viteTasks: Record<string, ViteTask> = {};

  const createViteTask = (
    format: 'cjs' | 'es',
    runtime: Target,
    {
      output,
      ...restEntry
    }: {
      output: string;
      path: string;
      entry?: string;
    }
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

    // eslint-disable-next-line no-nested-ternary
    const runtime: Target = exp._path.includes('strapi-admin')
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

export { createBuildContext, createBuildTasks };
