import chalk from 'chalk';
import { Observable } from 'rxjs';
import ts from 'typescript';

import { printDiagnostic } from './diagnostic';
import { DtsBaseTask } from './types';

import type { TaskHandler } from '../index';

interface DtsBuildTask extends DtsBaseTask {
  type: 'build:dts';
}

const dtsBuildTask: TaskHandler<DtsBuildTask> = {
  print(ctx, task) {
    const entries = [
      '   entries:',
      ...task.entries.map((entry) =>
        [
          `    – `,
          chalk.green(`${entry.importId} `),
          `${chalk.cyan(entry.sourcePath)} ${chalk.gray('->')} ${chalk.cyan(entry.targetPath)}`,
        ].join('')
      ),
    ];

    ctx.logger.log(['Building type files:', ...entries].join('\n'));
  },
  run$(ctx, task) {
    return new Observable((subscriber) => {
      Promise.all(
        task.entries.map(async (entry) => {
          if (!ctx.ts) {
            ctx.logger.warn(
              `You've added a types entry but no tsconfig.json was found for ${entry.targetPath}. Skipping...`
            );

            return;
          }

          const program = ts.createProgram(ctx.ts.config.fileNames, ctx.ts.config.options);

          const emitResult = program.emit();

          const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

          for (const diagnostic of allDiagnostics) {
            printDiagnostic(diagnostic, { logger: ctx.logger, cwd: ctx.cwd });
          }

          if (emitResult.emitSkipped) {
            const errors = allDiagnostics.filter(
              (diag) => diag.category === ts.DiagnosticCategory.Error
            );

            if (errors.length) {
              throw new Error('Failed to compile TypeScript definitions');
            }
          }
        })
      )
        .then(() => {
          subscriber.complete();
        })
        .catch((err) => {
          subscriber.error(err);
        });
    });
  },
  async success(ctx, task) {
    const msg = [
      `Built types, entries:`,
      task.entries
        .map(
          (entry) =>
            `    ${chalk.blue(`${entry.importId}`)}: ${entry.sourcePath} -> ${entry.targetPath}`
        )
        .join('\n'),
    ];

    ctx.logger.success(msg.join('\n'));
  },
  async fail(ctx, task, err) {
    if (err instanceof Error) {
      ctx.logger.error(err.message);
    }

    process.exit(1);
  },
};

export { dtsBuildTask };

export type { DtsBuildTask };
