import type { Core } from '@strapi/types';

/**
 * The `api` config that `strapi.config.get('api')` returns, with loader defaults.
 * Input type, what applications write in `config/api.ts`: {@link Core.Config.Api}.
 * Loader defaults: `api.rest.prefix` in `src/configuration/index.ts`.
 *
 * First version: the input type as is.
 * TODO @Nico Mark the fields the loader always defines as required, and test them at runtime.
 */
export type ResolvedApiConfig = Core.Config.Api;
