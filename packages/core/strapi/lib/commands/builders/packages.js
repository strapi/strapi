'use strict';

const path = require('path');
const browserslistToEsbuild = require('browserslist-to-esbuild');

const { parseExports } = require('../utils/pkg');

/**
 * @typedef {Object} BuildContextArgs
 * @property {string} cwd
 * @property {import('../utils/pkg').ExtMap} extMap
 * @property {import('../utils/logger').Logger} logger
 * @property {import('../utils/pkg').PackageJson} pkg
 */

/**
 * @typedef {Object} BuildContext
 * @property {string} cwd
 * @property {import('../utils/pkg').Export[]} exports
 * @property {string[]} external
 * @property {import('../utils/pkg').ExtMap} extMap
 * @property {import('../utils/logger').Logger} logger
 * @property {import('../utils/pkg').PackageJson} pkg
 * @property {string} target
 */

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
 *
 * @type {(args: BuildContextArgs) => Promise<BuildContext>}
 */
const createBuildContext = async ({ cwd, extMap, logger, pkg }) => {
  const target = browserslistToEsbuild(pkg.browserslist ?? DEFAULT_BROWSERS_LIST_CONFIG);

  const exports = parseExports({ extMap, pkg }).reduce((acc, x) => {
    const { _path: exportPath, ...exportEntry } = x;

    return { ...acc, [exportPath]: exportEntry };
  }, {});

  const external = [
    ...(pkg.dependencies ? Object.keys(pkg.dependencies) : []),
    ...(pkg.peerDependencies ? Object.keys(pkg.peerDependencies) : []),
  ];

  const outputPaths = Object.values(exports)
    .flatMap((exportEntry) => {
      return [exportEntry.import, exportEntry.require].filter(Boolean);
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
    exports,
    external,
    distPath,
    target,
    extMap,
  };
};

/**
 * @type {(containerPath: string, itemPath: string) => boolean}
 */
const pathContains = (containerPath, itemPath) => {
  return !path.relative(containerPath, itemPath).startsWith('..');
};

/**
 * @type {(filePaths: string[]) => string | undefined}
 */
const findCommonDirPath = (filePaths) => {
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
 * @typedef {import('./tasks/vite').ViteTask | import('./tasks/dts').DtsTask} BuildTask
 */

/**
 * @description Create the build tasks for the pipeline, this
 * comes from the exports map we've created in the build context.
 * But handles each export line uniquely with space to add more
 * as the standard develops.
 *
 * @type {(args: BuildContext) => Promise<BuildTask[]>}
 */
const createBuildTasks = async (ctx) => {
  /**
   * @type {BuildTask[]}
   */
  const tasks = [];

  /**
   * @type {import('./tasks/dts').DtsTask}
   */
  const dtsTask = {
    type: 'build:dts',
    entries: [],
  };

  /**
   * @type {Record<string, import('./tasks/vite').ViteTask>}
   */
  const viteTasks = {};

  const createViteTask = (format, { output, ...restEntry }) => {
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
      createViteTask('cjs', {
        path: exp._path,
        entry: exp.source,
        output: exp.require,
      });
    }

    if (exp.import) {
      /**
       * register ESM task
       */
      createViteTask('es', {
        path: exp._path,
        entry: exp.source,
        output: exp.import,
      });
    }
  }

  tasks.push(dtsTask, ...Object.values(viteTasks));

  return tasks;
};

module.exports = {
  createBuildContext,
  createBuildTasks,
};
