import type { Core } from '@strapi/types';

import isDevelopmentModeHandler from './is-development-mode';

/**
 * Registered as `plugin::content-type-builder.isDevelopmentMode`. Runtime calls a middleware
 * referenced by name as a factory, so the registered value returns the handler; the plugin routes
 * use the handler inline.
 */
const isDevelopmentMode = (() =>
  isDevelopmentModeHandler) satisfies Core.MiddlewareFactory<undefined>;

export { isDevelopmentMode };
