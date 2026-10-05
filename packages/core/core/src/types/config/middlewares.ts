import type { Core } from '@strapi/types';

/**
 * The `middlewares` config that `strapi.config.get('middlewares')` returns, with loader defaults.
 * Input type, what applications write in `config/middlewares.ts`: {@link Core.Config.Middlewares}.
 * Loader defaults: none in `src/configuration/index.ts`.
 * `src/services/server/register-middlewares.ts` passes its list as the `get` default instead.
 *
 * First version: the input type as is.
 * TODO @Nico Mark the fields the loader always defines as required, and test them at runtime.
 */
export type ResolvedMiddlewaresConfig = Core.Config.Middlewares;
