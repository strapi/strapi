import type { Core } from '@strapi/types';

/**
 * The `features` config that `strapi.config.get('features')` returns, with loader defaults.
 * Input type, what applications write in `config/features.ts`: {@link Core.Config.Features}.
 * Loader defaults: none in `src/configuration/index.ts`.
 *
 * First version: the input type as is.
 * TODO @Nico Mark the fields the loader always defines as required, and test them at runtime.
 */
export type ResolvedFeaturesConfig = Core.Config.Features;
