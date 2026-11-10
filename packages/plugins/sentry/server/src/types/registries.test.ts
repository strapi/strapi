// Compile-only assertions. The server tsconfig includes this file; declaration builds exclude it.
import type * as Sentry from '@sentry/node';
import type { Core } from '@strapi/types';
import type config from '../config';
import type services from '../services';
import type { SentryConfig } from './config';
import type { SentryService } from './services';

// The runtime maps implement exactly the registered contracts.
/* eslint-disable @typescript-eslint/no-unused-vars */
type ServiceNames = Core.Assert<
  Core.SameNames<
    keyof typeof services,
    keyof Core.RegisteredFor<Strapi.Registries.PackageServices, 'plugin::sentry'>
  >
>;
type DefaultConfigNames = Core.Assert<
  Core.SameNames<keyof (typeof config)['default'], keyof SentryConfig>
>;
/* eslint-enable @typescript-eslint/no-unused-vars */

const sentry = strapi.plugin('sentry').service('sentry');
sentry.init() satisfies SentryService;
sentry.getInstance() satisfies typeof Sentry | null;
sentry.sendError(new Error('Failure'), (scope) => {
  scope satisfies Sentry.Scope;
}) satisfies void;
// @ts-expect-error Errors are sent as `Error` instances.
sentry.sendError('Failure');
// @ts-expect-error Registered services have no arbitrary members.
sentry.missing();
strapi.service('plugin::sentry.sentry') satisfies SentryService;

const sentryConfig = strapi.config.get('plugin::sentry');
sentryConfig satisfies SentryConfig;
sentryConfig.dsn satisfies string | null;
// @ts-expect-error Registered configs have no arbitrary keys.
sentryConfig.missing satisfies unknown;
const sendMetadata = strapi.plugin('sentry').config('sendMetadata');
sendMetadata satisfies boolean;
// @ts-expect-error Plugin-scoped lookups keep the registered value type.
strapi.plugin('sentry').config('dsn') satisfies string;
