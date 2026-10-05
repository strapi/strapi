import type { Core } from '@strapi/types';

type ServerConfig = Core.Config.Server;
type OpenAPIConfig = NonNullable<ServerConfig['openapi']>;
type OpenAPIEndpoint = NonNullable<OpenAPIConfig[keyof OpenAPIConfig]>;
type Enabled = { enabled: boolean };

/** One `server.openapi.<endpoint>` entry with the `defaultServerConfig.openapi` fields required. */
type ResolvedOpenAPIEndpoint<TEndpoint extends OpenAPIEndpoint> = TEndpoint & {
  access: NonNullable<TEndpoint['access']>;
  route: NonNullable<TEndpoint['route']> & { path: string };
  cache: NonNullable<TEndpoint['cache']> & { enabled: boolean; maxAgeMs: number; filePath: string };
};

/**
 * The `server` config that `strapi.config.get('server')` returns, with loader defaults.
 * Input type, what applications write in `config/server.ts`: {@link Core.Config.Server}.
 * `loadConfiguration` (`src/configuration/index.ts`) merges `defaultServerConfig` under the user
 * config (`host`, `port`, `proxy`, `cron.enabled`, `dirs.public`, `transfer.remote.enabled`,
 * `logger.{updates,startup}.enabled`, `openapi.{content-api,admin}.*`), then sets `url` and
 * `absoluteUrl` from `src/configuration/urls.ts`. Every other field keeps its input type.
 */
export type ResolvedServerConfig = Omit<
  ServerConfig,
  'url' | 'absoluteUrl' | 'proxy' | 'cron' | 'dirs' | 'transfer' | 'logger' | 'openapi'
> & {
  url: string;
  absoluteUrl: string;
  proxy: NonNullable<ServerConfig['proxy']>;
  cron: NonNullable<ServerConfig['cron']> & Enabled;
  dirs: NonNullable<ServerConfig['dirs']> & { public: string };
  transfer: NonNullable<ServerConfig['transfer']> & {
    remote: NonNullable<NonNullable<ServerConfig['transfer']>['remote']> & Enabled;
  };
  logger: NonNullable<ServerConfig['logger']> & {
    updates: NonNullable<NonNullable<ServerConfig['logger']>['updates']> & Enabled;
    startup: NonNullable<NonNullable<ServerConfig['logger']>['startup']> & Enabled;
  };
  openapi: OpenAPIConfig & {
    'content-api': ResolvedOpenAPIEndpoint<NonNullable<OpenAPIConfig['content-api']>>;
    admin: ResolvedOpenAPIEndpoint<NonNullable<OpenAPIConfig['admin']>>;
  };
};
