'use strict';

const path = require('path');
const chalk = require('chalk');
const ora = require('ora');
const ts = require('typescript');

/**
 * @description Load a tsconfig.json file and return the parsed config
 *
 * @internal
 *
 * @type {(args: { cwd: string; path: string }) => Promise<ts.ParsedCommandLine>)}
 */
const loadTsConfig = async ({ cwd, path }) => {
  const configPath = ts.findConfigFile(cwd, ts.sys.fileExists, path);

  if (!configPath) {
    throw new TSConfigNotFoundError(`could not find a valid '${path}'`);
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  return ts.parseJsonConfigFileContent(configFile.config, ts.sys, cwd);
};

class TSConfigNotFoundError extends Error {
  // eslint-disable-next-line no-useless-constructor
  constructor(message, options) {
    super(message, options);
  }

  get code() {
    return 'TS_CONFIG_NOT_FOUND';
  }
}

/**
 * @description
 *
 * @internal
 *
 * @type {(args: { cwd: string; logger: import('../../utils/logger').Logger; outDir: string; tsconfig: ts.ParsedCommandLine }) => Promise<void>}
 */
const buildTypes = ({ cwd, logger, outDir, tsconfig }) => {
  const compilerOptions = {
    ...tsconfig.options,
    declaration: true,
    declarationDir: outDir,
    emitDeclarationOnly: true,
    noEmit: false,
    outDir,
  };

  const program = ts.createProgram(tsconfig.fileNames, compilerOptions);

  const emitResult = program.emit();

  const allDiagnostics = ts.getPreEmitDiagnostics(program).concat(emitResult.diagnostics);

  for (const diagnostic of allDiagnostics) {
    if (diagnostic.file && diagnostic.start) {
      const { line, character } = ts.getLineAndCharacterOfPosition(
        diagnostic.file,
        diagnostic.start
      );
      const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');

      const file = path.relative(cwd, diagnostic.file.fileName);

      const output = [
        `${chalk.cyan(file)}:${chalk.cyan(line + 1)}:${chalk.cyan(character + 1)} - `,
        `${chalk.gray(`TS${diagnostic.code}:`)} ${message}`,
      ].join('');

      if (diagnostic.category === ts.DiagnosticCategory.Error) {
        logger.error(output);
      }

      if (diagnostic.category === ts.DiagnosticCategory.Warning) {
        logger.warn(output);
      }

      if (diagnostic.category === ts.DiagnosticCategory.Message) {
        logger.info(output);
      }

      if (diagnostic.category === ts.DiagnosticCategory.Suggestion) {
        logger.info(output);
      }
    } else {
      logger.info(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    }
  }

  if (emitResult.emitSkipped) {
    const errors = allDiagnostics.filter((diag) => diag.category === ts.DiagnosticCategory.Error);

    if (errors.length) {
      throw new Error('Failed to compile TypeScript definitions');
    }
  }
};

/**
 * @typedef {Object} DtsTaskEntry
 * @property {string} exportPath
 * @property {string} sourcePath
 * @property {string} targetPath
 */

/**
 * @typedef {Object} DtsTask
 * @property {"build:dts"} type
 * @property {DtsTaskEntry[]} entries
 */

/**
 * @type {import('./index').TaskHandler<DtsTask>}
 */
const dtsTask = {
  _spinner: null,
  print(ctx, task) {
    const entries = [
      '   entries:',
      ...task.entries.map((entry) =>
        [
          `    – `,
          chalk.green(`${entry.importId} `),
          `${chalk.cyan(entry.sourcePath)} ${chalk.gray('→')} ${chalk.cyan(entry.targetPath)}`,
        ].join('')
      ),
      '',
    ];

    this._spinner = ora(`Building type files:\n`).start();

    ctx.logger.log([...entries].join('\n'));
  },
  async run(ctx, task) {
    await Promise.all(
      task.entries.map(async (entry) => {
        const config = await loadTsConfig({
          /**
           * TODO: this will not scale and assumes all project sourcePaths are `src/index.ts`
           * so we can go back to the "root" of the project...
           */
          cwd: path.join(ctx.cwd, entry.sourcePath, '..', '..'),
          path: 'tsconfig.dist.json',
        }).catch((err) => {
          if (err instanceof TSConfigNotFoundError) {
            return undefined;
          }

          throw err;
        });

        if (config) {
          ctx.logger.debug(`TS config for '${entry.sourcePath}': \n`, config);
        } else {
          ctx.logger.warn(
            `You've added a types entry but no tsconfig.json was found for ${entry.targetPath}. Skipping...`
          );

          return;
        }

        const { outDir } = config.raw.compilerOptions;

        if (!outDir) {
          throw new Error("tsconfig.json is missing 'compilerOptions.outDir'");
        }

        await buildTypes({
          cwd: ctx.cwd,
          logger: ctx.logger,
          outDir: path.relative(ctx.cwd, outDir),
          tsconfig: config,
        });
      })
    );
  },
  async success() {
    this._spinner.succeed('Built type files');
  },
  async fail() {
    this._spinner.fail('Failed to build type files');
  },
};

module.exports = { dtsTask };
