import chokidar from 'chokidar';
import path from 'path';
import { Observable, distinctUntilChanged, scan, startWith, switchMap } from 'rxjs';

import { CONFIG_FILE_NAMES, loadConfig } from './core/config';
import { getExportExtensionMap, validateExportsOrdering } from './core/exports';
import { createLogger } from './core/logger';
import { loadPkg, validatePkg } from './core/pkg';
import { createBuildContext } from './createBuildContext';
import { createWatchTasks } from './createTasks';
import { taskHandlers } from './tasks';

import type { Config } from './core/config';
import type { WatchTask } from './createTasks';
import type { TaskHandler } from './tasks';
import type { CommonCLIOptions } from '../types';

type WatchCLIOptions = CommonCLIOptions;

interface WatchOptionsWithoutConfig extends WatchCLIOptions {
  configFile?: true;
  config?: never;
  cwd?: string;
}

interface WatchOptionsWithConfig extends WatchCLIOptions {
  configFile: false;
  config?: Config;
  cwd?: string;
}

type WatchOptions = WatchOptionsWithConfig | WatchOptionsWithoutConfig;

const watch = async (opts: WatchOptions) => {
  const { silent, debug, cwd = process.cwd(), configFile = true, config: providedConfig } = opts;

  const logger = createLogger({ silent, debug });

  logger.debug('watching config files');

  const configFilePaths = ['package.json', ...CONFIG_FILE_NAMES].map((fileName) =>
    path.resolve(cwd, fileName).split(path.sep).join(path.posix.sep)
  );

  interface FileEvent {
    event: 'add' | 'addDir' | 'change' | 'unlink' | 'unlinkDir';
    path: string;
  }

  const watcher$ = new Observable<FileEvent>((subscriber) => {
    const watcher = chokidar.watch(configFilePaths, {
      ignoreInitial: true,
    });

    const handleEvent = (event: FileEvent['event'], filePath: FileEvent['path']) => {
      subscriber.next({
        event,
        path: filePath,
      });
    };

    watcher.on('all', handleEvent);

    return () => {
      watcher.off('all', handleEvent);
      watcher.close();
    };
  });

  const configFiles$ = watcher$.pipe(
    scan((files, { event, path: filePath }) => {
      if (event === 'add') {
        logger.debug('config file added', filePath);

        return [...files, filePath];
      }

      if (event === 'unlink') {
        logger.debug('config file removed', filePath);

        return files.filter((fPath) => fPath !== filePath);
      }

      if (event === 'change') {
        logger.log(
          '--------------------------------------------------------------------------------'
        );
        logger.info(path.relative(cwd, filePath), 'changed');

        return files.slice(0);
      }

      return files;
    }, configFilePaths),
    startWith(configFilePaths),
    distinctUntilChanged()
  );

  const ctx$ = configFiles$.pipe(
    switchMap(async (configFiles) => {
      const files = configFiles.map((f) => path.relative(cwd, f));

      const packageJsonPath = files.find((f) => f === 'package.json');

      if (!packageJsonPath) {
        throw new Error('missing package.json');
      }

      const rawPkg = await loadPkg({ cwd, logger });

      const validatedPkg = await validatePkg({
        pkg: rawPkg,
      }).catch((err) => {
        logger.error(err.message);
        process.exit(1);
      });

      /**
       * Validate the exports of the package incl. the order of the
       * exports within the exports map if applicable
       */
      const packageJson = await validateExportsOrdering({ pkg: validatedPkg, logger }).catch(
        (err) => {
          logger.error(err.message);
          process.exit(1);
        }
      );

      /**
       * If configFile is true – which is the default, atempt to load the config
       * otherwise if it's explicitly false then we suspect there might be a config passed
       * in the options, so we'll use that instead.
       */
      const config = configFile ? await loadConfig({ cwd, logger }) : providedConfig;
      /**
       * We create tasks based on the exports of the package.json
       * their handlers are then ran in the order of the exports map
       * and results are logged to see gradual progress.
       */

      const extMap = getExportExtensionMap();

      return createBuildContext({
        config: { ...config },
        cwd,
        extMap,
        logger,
        pkg: packageJson,
      }).catch((err) => {
        logger.error(err.message);
        process.exit(1);
      });
    })
  );

  ctx$.subscribe(async (ctx) => {
    const watchTasks = await createWatchTasks(ctx);

    for (const task of watchTasks) {
      const handler = taskHandlers[task.type] as TaskHandler<WatchTask, unknown>;

      const result$ = handler.run$(ctx, task);

      result$.subscribe({
        error(err) {
          handler.fail(ctx, task, err);

          process.exit(1);
        },
        next(result) {
          handler.success(ctx, task, result);
        },
      });
    }
  });
};

export { watch };
export type { WatchOptions, WatchOptionsWithConfig, WatchOptionsWithoutConfig, WatchCLIOptions };
