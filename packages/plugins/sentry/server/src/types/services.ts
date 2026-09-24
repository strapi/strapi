import type * as Sentry from '@sentry/node';

/** The Sentry service instance. */
export type SentryService = {
  /** Initializes Sentry once from the plugin configuration. */
  init(): SentryService;
  /** Returns the Sentry instance, or null when Sentry is not initialized. */
  getInstance(): typeof Sentry | null;
  /** Sends an exception event to Sentry. */
  sendError(error: Error, configureScope?: (scope: Sentry.Scope) => void): void;
};
