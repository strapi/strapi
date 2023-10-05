import react from '@vitejs/plugin-react';
import path from 'path';
import { InlineConfig, createLogger } from 'vite';

import type { ViteBaseTask } from './types';
import type { BuildContext } from '../../createBuildContext';

/**
 * @internal
 */
const resolveViteConfig = (ctx: BuildContext, task: ViteBaseTask) => {
  const { cwd, distPath, targets, external, extMap, pkg, config: packUpConfig } = ctx;
  const { entries, format, output, runtime } = task;
  const outputExt = extMap[pkg.type || 'commonjs'][format];
  const outDir = path.relative(cwd, distPath);

  const customLogger = createLogger();
  customLogger.warn = (msg) => ctx.logger.warn(msg);
  customLogger.warnOnce = (msg) => ctx.logger.warn(msg);
  customLogger.error = (msg) => ctx.logger.error(msg);
  customLogger.info = () => {};

  const config = {
    configFile: false,
    root: cwd,
    mode: 'production',
    logLevel: 'warn',
    clearScreen: false,
    customLogger,
    build: {
      minify: packUpConfig?.minify ?? false,
      sourcemap: packUpConfig?.sourcemap ?? true,
      /**
       * The task runner will clear this for us
       */
      emptyOutDir: false,
      target: targets[runtime],
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
    plugins: runtime === 'node' ? [] : [react()],
  } satisfies InlineConfig;

  return config;
};

export { resolveViteConfig };
