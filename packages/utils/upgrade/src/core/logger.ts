import chalk from 'chalk';

export interface LoggerOptions {
  silent: boolean;
  debug: boolean;
}

export interface Logger {
  isSilent: boolean;
  isDebug: boolean;

  get warnings(): number;
  get errors(): number;

  debug(...args: unknown[]): void;
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;

  raw(...args: unknown[]): void;
}

export const createLogger = (options: Partial<LoggerOptions> = {}): Logger => {
  const { silent = false, debug = false } = options;

  const state = { errors: 0, warning: 0 };

  return {
    isSilent: silent,
    isDebug: debug,

    get warnings() {
      return state.warning;
    },

    get errors() {
      return state.errors;
    },

    raw(...args) {
      if (silent) {
        return;
      }

      console.log(...args);
    },

    debug(...args) {
      if (silent || !debug) {
        return;
      }

      console.log(chalk.cyan(`[DEBUG]\t[${new Date().toISOString()}]`), ...args);
    },

    info(...args) {
      if (silent) {
        return;
      }

      console.info(chalk.blue(`[INFO]\t[${new Date().toISOString()}]`), ...args);
    },

    warn(...args) {
      state.warning += 1;

      if (silent) {
        return;
      }

      console.warn(chalk.yellow(`[WARN]\t[${new Date().toISOString()}]`), ...args);
    },

    error(...args) {
      state.errors += 1;

      if (silent) {
        return;
      }

      console.error(chalk.red(`[ERROR]\t[${new Date().toISOString()}]`), ...args);
    },
  };
};
