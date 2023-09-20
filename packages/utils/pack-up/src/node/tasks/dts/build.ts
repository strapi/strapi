import chalk from 'chalk';
import ora from 'ora';
import { Observable } from 'rxjs';
import ts from 'typescript';

import { printDiagnostic } from './diagnostic';
import { DtsBaseTask } from './types';

import type { TaskHandler } from '../index';

interface DtsBuildTask extends DtsBaseTask {
  type: 'build:dts';
}

const dtsBuildTask: TaskHandler<DtsBuildTask> = {
  _spinner: null,
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
      '',
    ];

    this._spinner = ora(`Building type files:\n`).start();

    ctx.logger.log([...entries].join('\n'));
  },
  run(ctx, task) {
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
          subscriber.next();
          subscriber.complete();
        })
        .catch((err) => {
          subscriber.error(err);
        });
    });
  },
  async success() {
    this._spinner?.succeed('Built type files');
  },
  async fail() {
    this._spinner?.fail('Failed to build type files');
  },
};

export { dtsBuildTask };

export type { DtsBuildTask };
