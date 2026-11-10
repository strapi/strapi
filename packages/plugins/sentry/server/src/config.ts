import type { NodeOptions } from '@sentry/node';

/**
 * The Sentry plugin configuration, published here as on develop. The registered contract is
 * `SentryConfig` in `./types/config`.
 */
export interface Config {
  dsn: string | null;
  sendMetadata: boolean;
  init: NodeOptions;
}

export default {
  default: {
    dsn: null,
    sendMetadata: true,
    init: {},
  } satisfies Config,
  validator() {},
};
