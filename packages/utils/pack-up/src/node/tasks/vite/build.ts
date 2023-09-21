import chalk from 'chalk';
import path from 'path';
import { Observable } from 'rxjs';
import { build } from 'vite';

import { resolveViteConfig } from './config';
import { ViteBaseTask } from './types';

import type { TaskHandler } from '../index';

interface ViteBuildTask extends ViteBaseTask {
  type: 'build:js';
}

const viteBuildTask: TaskHandler<ViteBuildTask> = {
  print(ctx, task) {
    const targetLines = [
      '   target:',
      ...ctx.targets[task.runtime].map((t) => chalk.cyan(`    - ${t}`)),
    ];
    const entries = [
      '   entries:',
      ...task.entries.map((entry) =>
        [
          `    – `,
          chalk.green(`${path.join(ctx.pkg.name, entry.path)}: `),
          `${chalk.cyan(entry.entry)} ${chalk.gray('→')} ${chalk.cyan(task.output)}`,
        ].join('')
      ),
    ];

    ctx.logger.log(
      [`Building javascript files:`, `  format: ${task.format}`, ...targetLines, ...entries].join(
        '\n'
      )
    );
  },
  run$(ctx, task) {
    return new Observable((subscriber) => {
      const config = resolveViteConfig(ctx, task);
      ctx.logger.debug('Vite config: \n', config);
      build(config)
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
      `Built javascript (runtime: ${task.runtime} – target: ${task.format})`,
      task.entries
        .map(
          (e) => `    ${chalk.blue(path.join(ctx.pkg.name, e.path))}: ${e.entry} -> ${task.output}`
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

export { viteBuildTask };
export type { ViteBuildTask };
