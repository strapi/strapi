import type { NodeOptions } from '@sentry/node';

interface Config {
  dsn: string | null;
  sendMetadata: boolean;
  init: NodeOptions;
}

export type { Config };

export default {
  default: {
    dsn: null,
    sendMetadata: true,
    init: {},
  } as Config,
  validator() {},
};
