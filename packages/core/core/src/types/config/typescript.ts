import type { Core } from '@strapi/types';

/**
 * The `typescript` config that `strapi.config.get('typescript')` returns, with loader defaults.
 * Input type, what applications write in `config/typescript.ts`: {@link Core.Config.TypeScript}.
 * Loader defaults: none in `src/configuration/index.ts`.
 *
 * First version: the input type as is.
 * TODO @Nico Mark the fields the loader always defines as required, and test them at runtime.
 */
export type ResolvedTypeScriptConfig = Core.Config.TypeScript;
