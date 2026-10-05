import type { Core } from '@strapi/types';

/**
 * The `features` config that `strapi.config.get('features')` returns, with loader defaults.
 * Input type, what applications write in `config/features.ts`: {@link Core.Config.Features}.
 * Loader defaults: none. `loadConfiguration` (`src/configuration/index.ts`) has no `features`
 * entry in `defaultConfig`, so every field stays as optional as in the input type.
 *
 * TODO @Nico Without `config/features.*`, `get('features')` returns `undefined`, not `{}`;
 * this type does not say so. Decide at the `PackageConfigs` level for all no-default namespaces.
 */
export type ResolvedFeaturesConfig = Core.Config.Features;
