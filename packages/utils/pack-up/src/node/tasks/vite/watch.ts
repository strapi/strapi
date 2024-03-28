import chalk from 'chalk';
import os from 'os';
import path from 'path';
import { Observable } from 'rxjs';

import { isError } from '../../core/errors';

import { resolveViteConfig } from './config';

import type { ViteBaseTask } from './types';
import type { TaskHandler } from '../index';

export type InputOption = string | string[] | { [entryAlias: string]: string };

/**
 * This is a copy because it can't be imported from `vite`.
 */
export type RollupWatcherEvent =
  | { code: 'START' }
  | { code: 'BUNDLE_START'; input?: InputOption; output: readonly string[] }
  | {
      code: 'BUNDLE_END';
      duration: number;
      input?: InputOption;
      output: readonly string[];
      result: object;
    }
  | { code: 'END' }
  | { code: 'ERROR'; error: object; result: object | null };

interface ViteWatchTask extends ViteBaseTask {
  type: 'watch:js';
}

const viteWatchTask: TaskHandler<ViteWatchTask, RollupWatcherEvent> = {
  print(ctx, task) {
    const msg = [
      `Building Javascript (runtime: ${task.runtime} – target: ${task.format})`,
      task.entries
        .map(
          (e) => `    ${chalk.blue(path.join(ctx.pkg.name, e.path))}: ${e.entry} -> ${task.output}`
        )
        .join(os.EOL),
    ];

    ctx.logger.success(msg.join(os.EOL));
  },
  run$(ctx, task) {
    /**
     * We need to return an observable here, but vite build
     * is an async function which the observable does not want,
     * so we do some classic let definition with if to workaround.
     */
    return new Observable((subscriber) => {
      let watcher: object | null = null;

      resolveViteConfig(ctx, task).then((config) => {
        ctx.logger.debug(`Vite config:${os.EOL}`, config);
        import('vite').then(({ build }) => {
          build({
            ...config,
            mode: 'development',
            build: {
              ...config.build,
              watch: {},
            },
          }).then((rollupWatcher) => {
            watcher = rollupWatcher;

            if ('on' in watcher && typeof watcher.on === 'function') {
              watcher.on('event', (ev: any) => {
                subscriber.next(ev);
              });
            }
          });
        });
      });

      return () => {
        if (watcher !== null && 'close' in watcher && typeof watcher.close === 'function') {
          watcher.close();
        }
      };
    });
  },
  success(ctx, task, result) {
    switch (result.code) {
      case 'BUNDLE_END':
        this.print(ctx, task);
        break;
      case 'ERROR':
        ctx.logger.error(result.error);
        break;
      default:
        break;
    }
  },
  fail(ctx, task, err) {
    if (isError(err)) {
      ctx.logger.error(err);
    }
  },
};

export { viteWatchTask };
export type { ViteWatchTask };
