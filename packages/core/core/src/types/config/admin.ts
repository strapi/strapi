import type { Core } from '@strapi/types';

/**
 * The `admin` config that `strapi.config.get('admin')` returns, with loader defaults.
 * Input type, what applications write in `config/admin.ts`: {@link Core.Config.Admin}.
 * `loadConfiguration` (`src/configuration/index.ts`) always defines the required fields:
 * `serveAdminPanel` from the root config (option `serveAdminPanel`, default `true`), then `url`,
 * `path` and `absoluteUrl` from `src/configuration/urls.ts` (`url` defaults to `/admin`).
 * Every other field keeps its input type.
 */
export type ResolvedAdminConfig = Core.Config.Admin &
  Required<Pick<Core.Config.Admin, 'serveAdminPanel' | 'url' | 'path' | 'absoluteUrl'>>;
