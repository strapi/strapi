import type { NodeOptions } from '@sentry/node';

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
