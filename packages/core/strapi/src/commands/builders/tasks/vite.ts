/* eslint-disable @typescript-eslint/ban-ts-comment */
import path from 'path';
// @ts-ignore
import { build, createLogger, InlineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import ora from 'ora';
import chalk from 'chalk';

import type { TaskHandler } from '.';
import type { BuildContext, Target } from '../packages';

/**
 * @internal
 */
const resolveViteConfig = (ctx: BuildContext, task: ViteTask): InlineConfig => {
  const { cwd, distPath, targets, external, extMap, pkg } = ctx;
  const { entries, format, output, runtime } = task;
  const outputExt = extMap[pkg.type || 'commonjs'][format];
  const outDir = path.relative(cwd, distPath);

  const customLogger = createLogger();
  customLogger.warn = (msg) => ctx.logger.warn(msg);
  customLogger.warnOnce = (msg) => ctx.logger.warn(msg);
  customLogger.error = (msg) => ctx.logger.error(msg);

  const config: InlineConfig = {
    configFile: false,
    root: cwd,
    mode: 'production',
    logLevel: 'warn',
    clearScreen: false,
    customLogger,
    build: {
      sourcemap: true,
      /**
       * The task runner will clear this for us
       */
      emptyOutDir: false,
      target: targets[runtime],
      outDir,
      lib: {
        entry: entries.map((e) => e.entry).filter((v): v is string => Boolean(v)),
        formats: [format],
        /**
         * this enforces the file name to match what the output we've
         * determined from the package.json exports.
         */
        fileName() {
          return `${path.relative(outDir, output).replace(/\.[^/.]+$/, '')}${outputExt}`;
        },
      },
      rollupOptions: {
        external,
        output: {
          chunkFileNames() {
            const parts = outputExt.split('.');

            if (parts.length === 3) {
              return `_chunks/[name]-[hash].${parts[2]}`;
            }

            return `_chunks/[name]-[hash]${outputExt}`;
          },
        },
      },
    },
    /**
     * We _could_ omit this, but we'd need to introduce the
     * concept of a custom config for the scripts straight away
     *
     * and since this is isolated to the Strapi CLI, we can make
     * some assumptions and add some weight until we move it outside.
     */
    plugins: runtime === 'node' ? [] : [react()],
  };

  return config;
};

interface ViteTaskEntry {
  path: string;
  entry?: string;
}

export interface ViteTask {
  type: 'build:js';
  entries: ViteTaskEntry[];
  format: 'cjs' | 'es';
  output: string;
  runtime: Target;
}

const viteTask: TaskHandler<ViteTask> = {
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
  async run(ctx, task) {
    try {
      const config = resolveViteConfig(ctx, task);
      ctx.logger.debug('Vite config: \n', config);
      await build(config);
      await this.success(ctx, task);
    } catch (err) {
      this.fail(ctx, task, err);
    }
  },
  async success() {
    this._spinner?.succeed('Built javascript files');
  },
  async fail(ctx, task, err) {
    this._spinner?.fail('Failed to build javascript files');

    throw err;
  },
};

export { viteTask };
