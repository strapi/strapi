import chalk from 'chalk';
import ora from 'ora';
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
  _spinner: null,
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

    this._spinner = ora(`Building javascript files:\n`).start();

    ctx.logger.log([`  format: ${task.format}`, ...targetLines, ...entries].join('\n'));
  },
  run(ctx, task) {
    return new Observable((subsciber) => {
      const config = resolveViteConfig(ctx, task);
      ctx.logger.debug('Vite config: \n', config);
      build(config)
        .then(() => {
          subsciber.next();
          subsciber.complete();
        })
        .catch((err) => {
          subsciber.error(err);
        });
    });
  },
  async success() {
    this._spinner?.succeed('Built javascript files');
  },
  async fail() {
    this._spinner?.fail('Failed to build javascript files');
  },
};

export { viteBuildTask };
export type { ViteBuildTask };
