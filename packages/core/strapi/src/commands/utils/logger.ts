import chalk from 'chalk';

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
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  log: (...args: unknown[]) => void;
}

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

    debug(...args) {
      if (silent || !debug) {
        return;
      }

      console.log(
        chalk.cyan(`[DEBUG]${timestamp ? `\t[${new Date().toISOString()}]` : ''}`),
        ...args
      );
    },

    info(...args) {
      if (silent) {
        return;
      }

      console.info(
        chalk.blue(`[INFO]${timestamp ? `\t[${new Date().toISOString()}]` : ''}`),
        ...args
      );
    },

    log(...args) {
      if (silent) {
        return;
      }

      console.info(chalk.blue(`${timestamp ? `\t[${new Date().toISOString()}]` : ''}`), ...args);
    },

    warn(...args) {
      state.warning += 1;

      if (silent) {
        return;
      }

      console.warn(
        chalk.yellow(`[WARN]${timestamp ? `\t[${new Date().toISOString()}]` : ''}`),
        ...args
      );
    },

    error(...args) {
      state.errors += 1;

      if (silent) {
        return;
      }

      console.error(
        chalk.red(`[ERROR]${timestamp ? `\t[${new Date().toISOString()}]` : ''}`),
        ...args
      );
    },
  };
};

export { createLogger };
