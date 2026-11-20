import { finished } from 'node:stream/promises';

import chalk from 'chalk';
import execa from 'execa';
import ora from 'ora';

import type { Scope } from '../types';
import { getInstallArgs } from './get-package-manager-args';
import { logger } from './logger';
import { trackUsage } from './usage';

/**
 * Number of characters of install output that are kept to show when the install fails.
 * Package managers print the error at the end, so only the end of the output is kept.
 */
export const MAX_INSTALL_OUTPUT_LENGTH = 64 * 1024;

/**
 * Keeps the last `maxLength` characters of a stream of text, so memory stays bounded
 * whatever the package manager or a lifecycle script prints.
 */
export const createOutputTail = (maxLength: number) => {
  let tail = '';
  let truncated = false;

  return {
    append(chunk: string) {
      tail += chunk;

      if (tail.length > maxLength) {
        tail = tail.slice(-maxLength);
        truncated = true;
      }
    },
    read() {
      if (!truncated) {
        return tail;
      }

      // Start on a full line, so the output does not begin in the middle of a line
      const firstLineBreak = tail.indexOf('\n');
      return firstLineBreak === -1 ? tail : tail.slice(firstLineBreak + 1);
    },
  };
};

/**
 * Error thrown when the install command fails. `output` holds the end of what the
 * package manager printed on stdout and stderr.
 */
export class InstallError extends Error {
  readonly output: string;

  constructor(cause: unknown, output: string) {
    super(getErrorMessage(cause));
    this.name = 'InstallError';
    this.output = output;
  }
}

const getErrorMessage = (error: unknown): string => {
  // execa errors carry a short message without the command output
  if (
    typeof error === 'object' &&
    error !== null &&
    'shortMessage' in error &&
    typeof error.shortMessage === 'string'
  ) {
    return error.shortMessage;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return typeof error === 'string' ? error : '';
};

export async function runInstall({ rootPath, packageManager }: Scope) {
  // include same cwd and env to ensure version check returns same version we use below
  const { envArgs, cmdArgs } = await getInstallArgs(packageManager, {
    cwd: rootPath,
    env: {
      ...process.env,
      NODE_ENV: 'development',
    },
  });

  const options: execa.Options = {
    cwd: rootPath,
    // Ignore stdin so that a prompt or a script that reads stdin gets EOF and cannot hang the install.
    // Pipe stdout and stderr, and merge them in `all` to show them if the install fails.
    stdio: ['ignore', 'pipe', 'pipe'],
    all: true,
    // Do not let execa buffer the full output: it fails the install above `maxBuffer`.
    // The tail below keeps only the end of the output.
    buffer: false,
    env: {
      ...process.env,
      ...envArgs,
      NODE_ENV: 'development',
    },
  };

  const proc = execa(packageManager, cmdArgs, options);

  const tail = createOutputTail(MAX_INSTALL_OUTPUT_LENGTH);

  proc.stdout?.setEncoding('utf8');
  proc.stderr?.setEncoding('utf8');
  // Reading `all` also reads stdout and stderr, so the process cannot block on a full pipe
  proc.all?.on('data', (chunk: string | Buffer) => tail.append(chunk.toString()));
  const outputDone = proc.all ? finished(proc.all).catch(() => {}) : Promise.resolve();

  try {
    await proc;
  } catch (error) {
    // The process can exit before the last output is read
    await outputDone;
    throw new InstallError(error, tail.read());
  }
}

export async function installProjectDependencies(scope: Scope) {
  const { packageManager, rootPath } = scope;

  logger.title('deps', `Installing dependencies with ${chalk.cyan(packageManager)}`);

  // Show a spinner instead of the package manager output
  const spinner = ora({ text: 'Installing dependencies', indent: 7 });

  try {
    await trackUsage({ event: 'willInstallProjectDependencies', scope });

    spinner.start();
    await runInstall(scope);
    spinner.stop();

    await trackUsage({ event: 'didInstallProjectDependencies', scope });

    logger.success(`Dependencies installed`);
  } catch (error) {
    spinner.fail('Dependencies could not be installed');

    // The output was hidden during the install, so show it now to help the user fix the error.
    // If the package manager printed nothing, show why the install failed.
    const output = error instanceof InstallError ? error.output : '';
    const details = output.trim() ? output : getErrorMessage(error);

    if (details) {
      console.error(`\n${details}`);
    }

    await trackUsage({
      event: 'didNotInstallProjectDependencies',
      scope,
      // The install output can hold local paths and user names, so it is not sent to telemetry.
      // TODO: send a classified value, such as the exit code or the package manager error code.
      error: '',
    });

    logger.fatal([
      chalk.bold(
        'Oh, it seems that you encountered an error while installing dependencies in your project'
      ),
      '',
      `Don't give up, your project was created correctly`,
      '',
      `Fix the issues mentioned in the installation errors and try to run the following command:`,
      '',
      `cd ${chalk.green(rootPath)} && ${chalk.cyan(packageManager)} install`,
    ]);
  }
}
