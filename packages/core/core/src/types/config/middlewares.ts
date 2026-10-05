import type { Core } from '@strapi/types';

/**
 * The `middlewares` config that `strapi.config.get('middlewares')` returns, with loader defaults.
 * Input type, what applications write in `config/middlewares.ts`: {@link Core.Config.Middlewares}.
 * Loader defaults: none. `loadConfiguration` (`src/configuration/index.ts`) has no `middlewares`
 * entry in `defaultConfig`, and the value is a list, so no field can be marked required.
 * `src/services/server/register-middlewares.ts` passes its default list to `get` instead.
 *
 * TODO @Nico Without `config/middlewares.*`, `get('middlewares')` returns `undefined`;
 * this type does not say so. Decide at the `PackageConfigs` level for all no-default namespaces.
 */
export type ResolvedMiddlewaresConfig = Core.Config.Middlewares;
