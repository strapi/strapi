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
 * The familiar set of first-party server plugins that the legacy runtime always
 * loaded (the former `INTERNAL_PLUGINS`), keyed by canonical plugin name. These
 * are imported and added explicitly — nothing is scanned.
 *
 * Note: auto-CRUD route generation currently reads `strapi.plugin('i18n')`, so
 * `i18n` is required whenever a programmatic content type uses the default
 * `api: true`. See the zero-plugin boot note in the RFC.
 */
export const recommendedPlugins = (): Record<string, PluginEntry> => ({
  'content-manager': lazy('@strapi/content-manager/strapi-server') as unknown as PluginEntry,
  'content-type-builder': lazy(
    '@strapi/content-type-builder/strapi-server'
  ) as unknown as PluginEntry,
  email: lazy('@strapi/email/strapi-server') as unknown as PluginEntry,
  upload: lazy('@strapi/upload/strapi-server') as unknown as PluginEntry,
  i18n: lazy('@strapi/i18n/strapi-server') as unknown as PluginEntry,
  'content-releases': lazy('@strapi/content-releases/strapi-server') as unknown as PluginEntry,
  'review-workflows': lazy('@strapi/review-workflows/strapi-server') as unknown as PluginEntry,
});
