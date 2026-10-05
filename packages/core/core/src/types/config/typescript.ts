import type { Core } from '@strapi/types';

/**
 * The `typescript` config that `strapi.config.get('typescript')` returns, with loader defaults.
 * Input type, what applications write in `config/typescript.ts`: {@link Core.Config.TypeScript}.
 * Loader defaults: none, `loadConfiguration` in `src/configuration/index.ts` sets no `typescript`
 * key, so every field stays optional. Readers apply their own fallback: `autogenerate` is treated
 * as `true` unless `false` (`strapi/src/node/develop.ts`), `strictTypes` as off unless `true`
 * (`strapi/src/cli/utils/typescript-artifacts.ts`).
 */
export type TypeScript = Core.Config.TypeScript;
