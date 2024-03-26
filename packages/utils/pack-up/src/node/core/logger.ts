import chalk from 'chalk';

interface LoggerOptions {
  silent?: boolean;
  debug?: boolean;
}

export interface Logger {
  warnings: number;
  errors: number;
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  log: (...args: any[]) => void;
  success: (...args: any[]) => void;
}

export const createLogger = (options: LoggerOptions = {}): Logger => {
  const { silent = false, debug = false } = options;

  const state = { errors: 0, warning: 0 };

  return {
    get warnings() {
      return state.warning;
    },

    get errors() {
      return state.errors;
    },

    debug(...args) {
      if (silent || !debug) {
        return;
      }

      console.debug(chalk.cyan(`[DEBUG] `), ...args);
    },

    info(...args) {
      if (silent) {
        return;
      }

      console.info(chalk.blue(`[INFO] `), ...args);
    },

    log(...args) {
      if (silent) {
        return;
      }

      console.log(...args);
    },

    warn(...args) {
      state.warning += 1;

      if (silent) {
        return;
      }

      console.warn(chalk.yellow(`[WARN] `), ...args);
    },

    error(...args) {
      state.errors += 1;

      if (silent) {
        return;
      }

      console.error(chalk.red(`[ERROR] `), ...args);
    },

    success(...args) {
      if (silent) {
        return;
      }

      console.info(chalk.green(`[SUCCESS] `), ...args);
    },
  };
};
