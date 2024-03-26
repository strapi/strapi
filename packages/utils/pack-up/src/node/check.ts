import chalk from 'chalk';
import esbuild, { BuildFailure, Format, Message } from 'esbuild';
import ora from 'ora';
import os from 'os';
import { resolve } from 'path';

import { CommonCLIOptions } from '../types';

import { loadConfig } from './core/config';
import { isError } from './core/errors';
import { getExportExtensionMap, validateExportsOrdering } from './core/exports';
import { pathExists } from './core/files';
import { Logger, createLogger } from './core/logger';
import { loadPkg, validatePkg } from './core/pkg';
import { createBuildContext } from './createBuildContext';

export interface CheckOptions extends CommonCLIOptions {
  cwd?: string;
}

export const check = async (opts: CheckOptions = {}) => {
  const { silent, debug, cwd = process.cwd() } = opts;

  const logger = createLogger({ silent, debug });

  /**
   * Load the closest package.json and then verify the structure against what we expect.
   */
  const packageJsonLoader = ora(`Verifying package.json ${os.EOL}`).start();

  const rawPkg = await loadPkg({ cwd, logger }).catch((err) => {
    packageJsonLoader.fail();
    logger.error(err.message);
    logger.debug(`Path checked – ${cwd}`);
    process.exit(1);
  });

  const validatedPkg = await validatePkg({
    pkg: rawPkg,
  }).catch((err) => {
    packageJsonLoader.fail();
    logger.error(err.message);
    process.exit(1);
  });

  /**
   * Validate the exports of the package incl. the order of the
   * exports within the exports map if applicable
   */
  const packageJson = await validateExportsOrdering({ pkg: validatedPkg, logger }).catch((err) => {
    packageJsonLoader.fail();
    logger.error(err.message);
    process.exit(1);
  });

  packageJsonLoader.succeed('Verified package.json');

  /**
   * We create tasks based on the exports of the package.json
   * their handlers are then ran in the order of the exports map
   * and results are logged to see gradual progress.
   */
  const config = await loadConfig({ cwd, logger });

  const extMap = getExportExtensionMap();

  const ctx = await createBuildContext({
    config: { ...config },
    cwd,
    extMap,
    logger,
    pkg: packageJson,
  }).catch((err) => {
    logger.error(err.message);
    process.exit(1);
  });

  logger.debug(`Build context: ${os.EOL}`, ctx);

  const missingExports: string[] = [];

  const checkingFilePathsLoader = ora(`Checking files for exports`).start();

  /**
   * This is arguably verbose but realistically it's clearer what we're checking here
   * which is _every_ export option you've declared in your package.json is a real file.
   */
  for (const exp of Object.values(ctx.exports)) {
    if (exp.source && !(await pathExists(resolve(ctx.cwd, exp.source)))) {
      missingExports.push(exp.source);
    }

    if (exp.types && !(await pathExists(resolve(ctx.cwd, exp.types)))) {
      missingExports.push(exp.types);
    }

    if (exp.require && !(await pathExists(resolve(ctx.cwd, exp.require)))) {
      missingExports.push(exp.require);
    }

    if (exp.import && !(await pathExists(resolve(ctx.cwd, exp.import)))) {
      missingExports.push(exp.import);
    }

    if (exp.module && !(await pathExists(resolve(ctx.cwd, exp.module)))) {
      missingExports.push(exp.module);
    }

    if (exp.default && !(await pathExists(resolve(ctx.cwd, exp.default)))) {
      missingExports.push(exp.default);
    }

    if (exp.browser) {
      if (exp.browser.source && !(await pathExists(resolve(ctx.cwd, exp.browser.source)))) {
        missingExports.push(exp.browser.source);
      }

      if (exp.browser.import && !(await pathExists(resolve(ctx.cwd, exp.browser.import)))) {
        missingExports.push(exp.browser.import);
      }

      if (exp.browser.require && !(await pathExists(resolve(ctx.cwd, exp.browser.require)))) {
        missingExports.push(exp.browser.require);
      }
    }

    if (exp.node) {
      if (exp.node.source && !(await pathExists(resolve(ctx.cwd, exp.node.source)))) {
        missingExports.push(exp.node.source);
      }

      if (exp.node.import && !(await pathExists(resolve(ctx.cwd, exp.node.import)))) {
        missingExports.push(exp.node.import);
      }

      if (exp.node.require && !(await pathExists(resolve(ctx.cwd, exp.node.require)))) {
        missingExports.push(exp.node.require);
      }

      if (exp.node.module && !(await pathExists(resolve(ctx.cwd, exp.node.module)))) {
        missingExports.push(exp.node.module);
      }
    }
  }

  if (missingExports.length) {
    checkingFilePathsLoader.fail('');
    logger.error(
      [
        'Missing files for exports:',
        ...missingExports.map((str) => `    ${chalk.blue(str)} -> ${resolve(ctx.cwd, str)}`),
      ].join(os.EOL)
    );
    process.exit(1);
  }

  checkingFilePathsLoader.succeed('');

  /**
   * Now we know the files exist, we want to double check that they can be accurately resolved.
   */
  const exportPaths = Object.values(ctx.exports).reduce<{ require: string[]; import: string[] }>(
    (acc, exp) => {
      if (exp.require) {
        acc.require.push(exp.require);
      }
      if (exp.import) {
        acc.import.push(exp.import);
      }

      return acc;
    },
    {
      require: [],
      import: [],
    }
  );

  if (exportPaths.import.length > 0) {
    await resolveExports(exportPaths.import, {
      cwd: ctx.cwd,
      external: ctx.external,
      format: 'esm',
      logger,
    });
  }
  if (exportPaths.require.length > 0) {
    await resolveExports(exportPaths.require, {
      cwd: ctx.cwd,
      external: ctx.external,
      format: 'cjs',
      logger,
    });
  }
};

interface ResolveExportsOptions {
  cwd: string;
  external: string[];
  format: Format;
  logger: Logger;
}

const resolveExports = async (
  paths: string[],
  { cwd, format, external, logger }: ResolveExportsOptions
) => {
  const esbuildLoader = ora(`Resolving ${format} exports`).start();

  const code = paths
    .map((id) => (format === 'esm' ? `import('${id}');` : `require('${id}');`))
    .join(os.EOL);

  try {
    const esbuildResult = await esbuild.build({
      bundle: true,
      external,
      format,
      logLevel: 'silent',
      // otherwise output maps to stdout as we're using stdin
      outfile: '/dev/null',
      platform: 'node',
      stdin: {
        contents: code,
        loader: 'js',
        resolveDir: cwd,
      },
    });

    if (esbuildResult.errors.length > 0) {
      for (const msg of esbuildResult.errors) {
        printESBuildMessage(msg, logger.error);
      }

      esbuildLoader.fail();
      process.exit(1);
    }

    const esbuildWarnings = esbuildResult.warnings.filter(
      (msg) => !(msg.detail || msg.text).includes(`does not affect esbuild's own target setting`)
    );

    for (const msg of esbuildWarnings) {
      printESBuildMessage(msg, logger.warn);
    }

    esbuildLoader.succeed();
  } catch (err) {
    if (isESBuildError(err)) {
      for (const msg of err.errors) {
        printESBuildMessage(msg, logger.error);
      }
    }

    esbuildLoader.fail();
    process.exit(1);
  }
};

const isESBuildError = (err: unknown): err is BuildFailure => {
  return isError(err) && 'errors' in err && 'warnings' in err;
};

const printESBuildMessage = (msg: Message, log: Logger['error']) => {
  if (msg.location) {
    log(
      [
        `${msg.detail || msg.text}`,
        `${msg.location.line} | ${msg.location.lineText}`,
        `in ./${msg.location.file}:${msg.location.line}:${msg.location.column}`,
      ].join(os.EOL)
    );
  } else {
    log(msg.detail || msg.text);
  }
};
