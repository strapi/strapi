import chalk from 'chalk';

import type { Logger as LoggerInterface, LoggerOptions } from './types';

export class Logger implements LoggerInterface {
  isDebug: boolean;

  isSilent: boolean;

  private nbErrorsCalls: number;

  private nbWarningsCalls: number;

  constructor(options: LoggerOptions = {}) {
    // Set verbosity options
    this.isDebug = options.debug ?? false;
    this.isSilent = options.silent ?? false;

    // Initialize counters
    this.nbErrorsCalls = 0;
    this.nbWarningsCalls = 0;
  }

  private get isNotSilent(): boolean {
    return !this.isSilent;
  }

  get errors(): number {
    return this.nbErrorsCalls;
  }

  get warnings(): number {
    return this.nbWarningsCalls;
  }

  get stdout(): (NodeJS.WriteStream & { fd: 1 }) | undefined {
    return this.isSilent ? undefined : process.stdout;
  }

  get stderr(): (NodeJS.WriteStream & { fd: 2 }) | undefined {
    return this.isSilent ? undefined : process.stderr;
  }

  setDebug(debug: boolean): this {
    this.isDebug = debug;
    return this;
  }

  setSilent(silent: boolean): this {
    this.isSilent = silent;
    return this;
  }

  debug(...args: unknown[]): this {
    const isDebugEnabled = this.isNotSilent && this.isDebug;

    if (isDebugEnabled) {
      console.log(chalk.cyan(`[DEBUG]\t[${nowAsISO()}]`), ...args);
    }

    return this;
  }

  error(...args: unknown[]): this {
    this.nbErrorsCalls += 1;

    if (this.isNotSilent) {
      console.error(chalk.red(`[ERROR]\t[${nowAsISO()}]`), ...args);
    }

    return this;
  }

  info(...args: unknown[]): this {
    if (this.isNotSilent) {
      console.info(chalk.blue(`[INFO]\t[${new Date().toISOString()}]`), ...args);
    }

    return this;
  }

  raw(...args: unknown[]): this {
    if (this.isNotSilent) {
      console.log(...args);
    }

    return this;
  }

  warn(...args: unknown[]): this {
    this.nbWarningsCalls += 1;

    if (this.isNotSilent) {
      console.warn(chalk.yellow(`[WARN]\t[${new Date().toISOString()}]`), ...args);
    }

    return this;
  }
}

const nowAsISO = () => new Date().toISOString();

export const loggerFactory = (options: LoggerOptions = {}) => new Logger(options);
