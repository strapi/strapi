import type { NodeOptions } from '@sentry/node';

/** The Sentry plugin configuration, after the application config is merged with the defaults. */
export type SentryConfig = {
  /** Sentry DSN. Sentry stays disabled while it is null. */
  dsn: string | null;
  /** Adds request and user metadata to the events sent to Sentry. */
  sendMetadata: boolean;
  /** Options passed to `Sentry.init`. */
  init: NodeOptions;
};
