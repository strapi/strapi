import chalk from 'chalk';
import { Observable } from 'rxjs';
import ts from 'typescript';

import { printDiagnostic } from './diagnostic';
import { DtsBaseTask } from './types';

import type { TaskHandler } from '../index';

interface DtsWatchTask extends DtsBaseTask {
  type: 'watch:dts';
}

const dtsWatchTask: TaskHandler<DtsWatchTask, ts.Diagnostic> = {
  print(ctx, task) {
    const msg = [
      `Building Types, entries:`,
      task.entries
        .map(
          (entry) =>
            `    ${chalk.blue(`${entry.importId}`)}: ${entry.sourcePath} -> ${entry.targetPath}`
        )
        .join('\n'),
    ];

    ctx.logger.success(msg.join('\n'));
  },
  run$(ctx, task) {
    let programs: Array<
      ts.WatchOfConfigFile<ts.EmitAndSemanticDiagnosticsBuilderProgram> | undefined
    > = [];

    return new Observable((subscriber) => {
      Promise.all(
        task.entries.map(async (entry) => {
          if (!ctx.ts) {
            ctx.logger.warn(
              `You've added a types entry but no tsconfig.json was found for ${entry.targetPath}. Skipping...`
            );

            return;
          }

          const compilerHost = ts.createWatchCompilerHost(
            'tsconfig.build.json',
            ctx.ts.config.options,
            ts.sys,
            ts.createEmitAndSemanticDiagnosticsBuilderProgram,
            (diagnostic) => {
              subscriber.next(diagnostic);
            },
            (diagnostic) => {
              subscriber.next(diagnostic);
            }
          );

          return ts.createWatchProgram(compilerHost);
        })
      )
        .then((progs) => {
          programs = progs;
        })
        .catch((err) => {
          subscriber.error(err);
        });

      return () => {
        programs.forEach((prog) => {
          prog?.close();
        });
      };
    });
  },
  async success(ctx, task, diagnostic) {
    const { logger, cwd } = ctx;

    /**
     * This code is "Found 0 errors. Watching for file changes."
     * which is equivalent to "BUNDLE_END" code with rollup/vite.
     *
     * So we use this to say, hey we've built your types again!
     */
    if (diagnostic.code === 6194) {
      this.print(ctx, task);
    }

    /**
     * We don't want to print messages or suggestions.
     * Only errors and warnings in watch mode.
     */
    if (
      diagnostic.category === ts.DiagnosticCategory.Message ||
      diagnostic.category === ts.DiagnosticCategory.Suggestion
    ) {
      return;
    }

    printDiagnostic(diagnostic, { logger, cwd });
  },
  async fail(ctx, task, err) {
    if (err instanceof Error) {
      ctx.logger.error(err);
    }
  },
};

export { dtsWatchTask };

export type { DtsWatchTask };
