import type { ProviderSendmailOptions } from './types';

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

function noop() {}

/**
 * Matches guileen/node-sendmail: `options.logger` wins over `silent` — if a custom logger is
 * set, it is used as-is. Only when there is no custom logger does `silent` suppress output.
 * Strapi merges `{ silent: true, ...providerOptions }` so explicit `silent: false` still applies.
 */
export function createLogger(options: ProviderSendmailOptions): Logger {
  if (options.logger) {
    const l = options.logger;
    return {
      debug: l.debug ? l.debug.bind(l) : noop,
      info: l.info ? l.info.bind(l) : noop,
      warn: l.warn ? l.warn.bind(l) : noop,
      error: l.error ? l.error.bind(l) : noop,
    };
  }

  const silent = options.silent === true;
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
