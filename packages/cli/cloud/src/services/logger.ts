import chalk from 'chalk';
import stringify from 'fast-safe-stringify';

import ora from 'ora';
import * as cliProgress from 'cli-progress';

export interface LoggerOptions {
  silent?: boolean;
  debug?: boolean;
  timestamp?: boolean;
}

export interface Logger {
  warnings: number;
  errors: number;
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  success: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  log: (...args: unknown[]) => void;
  spinner: (text: string) => Pick<ora.Ora, 'succeed' | 'fail' | 'start' | 'text' | 'isSpinning'>;
  progressBar: (
    totalSize: number,
    text: string
  ) => Pick<cliProgress.SingleBar, 'start' | 'stop' | 'update'>;
}

const stringifyArg = (arg: unknown) => {
  return typeof arg === 'object' ? stringify(arg) : arg;
};

const createLogger = (options: LoggerOptions = {}): Logger => {
  const { silent = false, debug = false, timestamp = true } = options;

  const state = { errors: 0, warning: 0 };

  return {
    get warnings() {
      return state.warning;
    },

    get errors() {
      return state.errors;
    },

    async debug(...args) {
      if (silent || !debug) {
        return;
      }

      console.log(
        chalk.cyan(`[DEBUG]${timestamp ? `\t[${new Date().toISOString()}]` : ''}`),
        ...args.map(stringifyArg)
      );
    },

    info(...args) {
      if (silent) {
        return;
      }

      console.info(
        chalk.blue(`[INFO]${timestamp ? `\t[${new Date().toISOString()}]` : ''}`),
        ...args.map(stringifyArg)
      );
    },

    log(...args) {
      if (silent) {
        return;
      }

      console.info(
        chalk.blue(`${timestamp ? `\t[${new Date().toISOString()}]` : ''}`),
        ...args.map(stringifyArg)
      );
    },

    success(...args) {
      if (silent) {
        return;
      }

      console.info(
        chalk.green(`[SUCCESS]${timestamp ? `\t[${new Date().toISOString()}]` : ''}`),
        ...args.map(stringifyArg)
      );
    },

    warn(...args) {
      state.warning += 1;

      if (silent) {
        return;
      }

      console.warn(
        chalk.yellow(`[WARN]${timestamp ? `\t[${new Date().toISOString()}]` : ''}`),
        ...args.map(stringifyArg)
      );
    },

    error(...args) {
      state.errors += 1;

      if (silent) {
        return;
      }

      console.error(
        chalk.red(`[ERROR]${timestamp ? `\t[${new Date().toISOString()}]` : ''}`),
        ...args.map(stringifyArg)
      );
    },

    // @ts-expect-error – returning a subpart of ora is fine because the types tell us what is what.
    spinner(text: string) {
      if (silent) {
        return {
          succeed() {
            return this;
          },
          fail() {
            return this;
          },
          start() {
            return this;
          },
          text: '',
          isSpinning: false,
        };
      }

      return ora(text);
    },

    progressBar(totalSize: number, text: string) {
      if (silent) {
        return {
          start() {
            return this;
          },
          stop() {
            return this;
          },
          update() {
            return this;
          },
        };
      }

      const progressBar = new cliProgress.SingleBar({
        format: `${text ? `${text} |` : ''}${chalk.green('{bar}')}| {percentage}%`,
        barCompleteChar: '\u2588',
        barIncompleteChar: '\u2591',
        hideCursor: true,
        forceRedraw: true,
      });

      progressBar.start(totalSize, 0);

      return progressBar;
    },
  };
};

export { createLogger };
