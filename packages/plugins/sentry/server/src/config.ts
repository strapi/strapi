import type { SentryConfig } from './types/config';

export default {
  default: {
    dsn: null,
    sendMetadata: true,
    init: {},
  } satisfies SentryConfig,
  validator() {},
};
