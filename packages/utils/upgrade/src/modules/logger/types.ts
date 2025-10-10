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

  get stdout(): (NodeJS.WriteStream & { fd: 1 }) | undefined;
  get stderr(): (NodeJS.WriteStream & { fd: 2 }) | undefined;

  debug(...args: unknown[]): this;
  info(...args: unknown[]): this;
  warn(...args: unknown[]): this;
  error(...args: unknown[]): this;

  raw(...args: unknown[]): this;
}
