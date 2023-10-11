import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import ts from 'typescript';
import type { Logger } from '../../utils/logger';
import type { TaskHandler } from '.';

interface LoadTsConfigOptions {
  cwd: string;
  path: string;
}

class TSConfigNotFoundError extends Error {
  get code() {
    return 'TS_CONFIG_NOT_FOUND';
  }
}

/**
 * @description Load a tsconfig.json file and return the parsed config
 *
 * @internal
 */
const loadTsConfig = async ({ cwd, path }: LoadTsConfigOptions) => {
  const configPath = ts.findConfigFile(cwd, ts.sys.fileExists, path);

  if (!configPath) {
    throw new TSConfigNotFoundError(`could not find a valid '${path}'`);
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);

  return ts.parseJsonConfigFileContent(configFile.config, ts.sys, cwd);
};

interface BuildTypesOptions {
  cwd: string;
  logger: Logger;
  outDir: string;
  tsconfig: ts.ParsedCommandLine;
}

/**
 * @description
 *
 * @internal
 */
const buildTypes = ({ cwd, logger, outDir, tsconfig }: BuildTypesOptions) => {
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

export interface DtsTaskEntry {
  importId: string;
  exportPath: string;
  sourcePath?: string;
  targetPath: string;
}

export interface DtsTask {
  type: 'build:dts';
  entries: DtsTaskEntry[];
}

const dtsTask: TaskHandler<DtsTask> = {
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
    try {
      await Promise.all(
        task.entries.map(async (entry) => {
          const config = await loadTsConfig({
            /**
             * TODO: this will not scale and assumes all project sourcePaths are `src/index.ts`
             * so we can go back to the "root" of the project...
             */
            cwd: path.join(ctx.cwd, entry.sourcePath!, '..', '..'),
            path: 'tsconfig.build.json',
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

      await this.success(ctx, task);
    } catch (err) {
      this.fail(ctx, task, err);
    }
  },
  async success() {
    this._spinner?.succeed('Built type files');
  },
  async fail(ctx, task, err) {
    this._spinner?.fail('Failed to build type files');

    throw err;
  },
};

export { dtsTask };
