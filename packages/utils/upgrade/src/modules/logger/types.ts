export interface LoggerOptions {
  silent?: boolean;
  debug?: boolean;
}

export interface Logger {
  isSilent: boolean;
  isDebug: boolean;

  setSilent(silent: boolean): this;
  setDebug(enabled: boolean): this;

  get warnings(): number;
  get errors(): number;

  debug(...args: unknown[]): this;
  info(...args: unknown[]): this;
  warn(...args: unknown[]): this;
  error(...args: unknown[]): this;

  raw(...args: unknown[]): this;
}
