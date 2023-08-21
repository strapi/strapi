'use strict';

const path = require('path');
const { build, createLogger } = require('vite');
const react = require('@vitejs/plugin-react');
const ora = require('ora');
const chalk = require('chalk');

/**
 * @internal
 *
 * @type {(ctx: import('../packages').BuildContext, task: ViteTask) => import('vite').UserConfig}
 */
const resolveViteConfig = (ctx, task) => {
  const { cwd, distPath, target, external, extMap, pkg } = ctx;
  const { entries, format, output } = task;
  const outputExt = extMap[pkg.type || 'commonjs'][format];
  const outDir = path.relative(cwd, distPath);

  const customLogger = createLogger();
  customLogger.warn = (msg) => ctx.logger.warn(msg);
  customLogger.warnOnce = (msg) => ctx.logger.warn(msg);
  customLogger.error = (msg) => ctx.logger.error(msg);

  /**
   * @type {import('vite').InlineConfig}
   */
  const config = {
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
      target,
      outDir,
      lib: {
        entry: entries.map((e) => e.entry),
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
    plugins: [react()],
  };

  return config;
};

/**
 * @typedef {Object} ViteTaskEntry
 * @property {string} path
 * @property {string} entry
 */

/**
 * @typedef {Object} ViteTask
 * @property {"build:js"} type
 * @property {ViteTaskEntry[]} entries
 * @property {string} format
 * @property {string} output
 */

/**
 * @type {import('./index').TaskHandler<ViteTask>}
 */
const viteTask = {
  _spinner: null,
  print(ctx, task) {
    const targetLines = ['   target:', ...ctx.target.map((t) => chalk.cyan(`    - ${t}`))];
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
    const config = resolveViteConfig(ctx, task);
    ctx.logger.debug('Vite config: \n', config);
    await build(config);
  },
  async success() {
    this._spinner.succeed('Built javascript files');
  },
  async fail() {
    this._spinner.fail('Failed to build javascript files');
  },
};

module.exports = {
  viteTask,
};
