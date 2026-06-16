import path from 'node:path';
import type { AppDefinition } from '@strapi/core';

import { createLogger, type Logger } from '../cli/utils/logger';
import { getTimer, prettyTime } from './core/timer';
import { createBuildContext } from './create-build-context';
import { writeStaticClientFiles } from './staticFiles';

interface BuildAdminOptions {
  /**
   * The programmatic app definition (a `defineApp(...)` result). The build
   * derives its config, dirs, and frontend plugin set from this — no file scan
   * (ADR-0006, Phase 2).
   */
  app: AppDefinition;
  /**
   * The working directory the panel is built into. The compiled assets land in
   * `<dir>/build` (matching `strapi.dirs.dist.root`), which is what the admin
   * server serves from at runtime. Defaults to `process.cwd()`.
   */
  dir?: string;
  /**
   * Bundler to use. Defaults to `vite` (webpack is deprecated).
   */
  bundler?: 'webpack' | 'vite';
  /** Minify the output. @default true */
  minify?: boolean;
  /** Generate sourcemaps. @default false */
  sourcemaps?: boolean;
  /** Print build statistics. @default false */
  stats?: boolean;
  /**
   * Provide a logger. Defaults to a CLI logger; pass `{ silent: true }`-built
   * logger to quiet the build (handy in tests).
   */
  logger?: Logger;
}

/**
 * Async façade over the node admin build pipeline for **programmatic apps**
 * (Phase 2). Unlike `strapi build` — which scaffolds a Strapi instance by
 * scanning `appDir` and reads plugins from `package.json` — this accepts a
 * `defineApp(...)` definition directly and feeds the existing build pipeline
 * with object input.
 *
 * The compiled panel is written to `<dir>/build`. Start the app with the admin
 * panel served by passing `serveAdminPanel: true` to `startStrapi` (or rely on
 * its build auto-detection when a build exists at `<dir>/build`).
 *
 * TypeScript execution and dependency installation are the caller's
 * responsibility in programmatic mode (ADR-0009 / ADR-0017), so this skips the
 * `strapi build` TS-compile and admin-dependency steps.
 *
 * @example
 * ```ts
 * import { buildAdmin } from '@strapi/strapi';
 * import app from './app';
 *
 * await buildAdmin({ app });
 * ```
 */
export const buildAdmin = async ({
  app,
  dir = process.cwd(),
  bundler = 'vite',
  minify = true,
  sourcemaps = false,
  stats = false,
  logger = createLogger({ debug: process.argv.includes('--debug') }),
}: BuildAdminOptions): Promise<void> => {
  const timer = getTimer();
  const cwd = path.resolve(dir);

  timer.start('createBuildContext');
  const contextSpinner = logger.spinner('Building build context').start();

  const ctx = await createBuildContext({
    cwd,
    logger,
    options: { bundler, minify, sourcemaps, stats },
    app,
  });

  const contextDuration = timer.end('createBuildContext');
  contextSpinner.text = `Building build context (${prettyTime(contextDuration)})`;
  contextSpinner.succeed();

  timer.start('buildAdmin');
  const buildingSpinner = logger.spinner('Building admin panel').start();

  try {
    await writeStaticClientFiles(ctx);

    if (ctx.bundler === 'webpack') {
      const { build: buildWebpack } = await import('./webpack/build');
      await buildWebpack(ctx);
    } else {
      const { build: buildVite } = await import('./vite/build');
      await buildVite(ctx);
    }

    const buildDuration = timer.end('buildAdmin');
    buildingSpinner.text = `Building admin panel (${prettyTime(buildDuration)})`;
    buildingSpinner.succeed();
  } catch (err) {
    buildingSpinner.fail();
    throw err;
  }
};

export type { BuildAdminOptions };
