import type { ProviderSendmailOptions } from './types';

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

function noop() {}

/**
 * Legacy `sendmail` factory merged `{ silent: true, ...providerOptions }`.
 * `silent` defaults to true but can be overridden by `providerOptions`.
 */
export function createLogger(options: ProviderSendmailOptions): Logger {
  const silent = options.silent === true;

  if (options.logger) {
    const l = options.logger;
    return {
      debug: silent || !l.debug ? noop : l.debug.bind(l),
      info: silent || !l.info ? noop : l.info.bind(l),
      warn: silent || !l.warn ? noop : l.warn.bind(l),
      error: silent || !l.error ? noop : l.error.bind(l),
    };
  }

  if (silent) {
    return { debug: noop, info: noop, warn: noop, error: noop };
  }

  return {
    debug: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  };
}
