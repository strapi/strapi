/**
 * `@strapi/strapi/plugins` — convenience presets for the programmatic plugins
 * map (ADR-0006).
 *
 * This is *just imports* under the hood — no `package.json` scan, no
 * `INTERNAL_PLUGINS` magic. The returned map can be spread and overridden, and
 * stays tree-shakeable:
 *
 * @example
 * ```ts
 * import { recommendedPlugins } from '@strapi/strapi/plugins';
 * defineApp({ plugins: { ...recommendedPlugins(), 'my-plugin': myPlugin } });
 * ```
 */
import { createRequire } from 'node:module';
import { env } from '@strapi/utils';

import type { Core } from '@strapi/types';
import type { PluginEntry } from '@strapi/core';

const req = createRequire(__filename);

/**
 * First-party server plugins resolve their `strapi-server` export **lazily**:
 * some (e.g. `content-manager`) run `global.strapi`-dependent code at module
 * evaluation, so they must not be `import`ed until the register phase. The
 * returned thunk is invoked by the programmatic plugin loader once `strapi`
 * exists, mirroring how the legacy loader `require`s plugin modules on demand.
 */
const lazy =
  (specifier: string): (() => Core.Plugin) =>
  () => {
    const mod = req(specifier);
    const resolved = mod && mod.__esModule ? mod.default : (mod?.default ?? mod);

    return typeof resolved === 'function' ? resolved({ env }) : resolved;
  };

/**
 * Build a plugin entry from a first-party package base (e.g.
 * `@strapi/content-manager`): the server module is resolved lazily from
 * `<base>/strapi-server`, and the `resolve` hint lets `buildAdmin` import the
 * matching `<base>/strapi-admin` frontend entry without scanning `package.json`.
 */
const firstParty = (base: string): PluginEntry =>
  ({
    plugin: lazy(`${base}/strapi-server`),
    resolve: base,
  }) as unknown as PluginEntry;

/**
 * The familiar set of first-party server plugins that the legacy runtime always
 * loaded (the former `INTERNAL_PLUGINS`), keyed by canonical plugin name. These
 * are imported and added explicitly — nothing is scanned.
 *
 * Each entry carries a `resolve` hint (the npm package base) so the admin build
 * (`buildAdmin`) can import the plugin's `strapi-admin` frontend entry.
 *
 * Note: auto-CRUD route generation currently reads `strapi.plugin('i18n')`, so
 * `i18n` is required whenever a programmatic content type uses the default
 * `api: true`. See the zero-plugin boot note in the RFC.
 */
export const recommendedPlugins = (): Record<string, PluginEntry> => ({
  'content-manager': firstParty('@strapi/content-manager'),
  'content-type-builder': firstParty('@strapi/content-type-builder'),
  email: firstParty('@strapi/email'),
  upload: firstParty('@strapi/upload'),
  i18n: firstParty('@strapi/i18n'),
  'content-releases': firstParty('@strapi/content-releases'),
  'review-workflows': firstParty('@strapi/review-workflows'),
});
