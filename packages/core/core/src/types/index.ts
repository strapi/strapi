import type * as ResolvedConfig from './config';
import type { body } from '../middlewares/body';
import type { compression } from '../middlewares/compression';
import type { cors } from '../middlewares/cors';
import type { favicon } from '../middlewares/favicon';
import type { ip } from '../middlewares/ip';
import type { poweredBy } from '../middlewares/powered-by';
import type { Config as PublicConfig } from '../middlewares/public';
import type { Config as QueryConfig } from '../middlewares/query';
import type { responses } from '../middlewares/responses';
import type { security } from '../middlewares/security';
import type { session } from '../middlewares/session';

/** The config a middleware factory declares as its first parameter. */
type FactoryConfig<TFactory extends (...args: never[]) => unknown> = Parameters<TFactory>[0];

/** Resolved config contracts, e.g. `ResolvedConfig.Server`. Input types are `Core.Config.*` in `@strapi/types`. */
export type * as ResolvedConfig from './config';

/**
 * Config contracts of the namespaces `@strapi/core` loads, keyed as `strapi.config.get` reads them.
 * Each namespace's contract lives in its own file under `./config`.
 * Middleware contracts of the `strapi::*` middlewares, keyed by UID.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageConfigs {
        server: ResolvedConfig.Server;
        admin: ResolvedConfig.Admin;
        api: ResolvedConfig.Api;
        database: ResolvedConfig.Database;
        middlewares: ResolvedConfig.Middlewares;
        features: ResolvedConfig.Features;
        typescript: ResolvedConfig.TypeScript;
      }

      /**
       * Configs of the `strapi::*` middlewares, registered from `../middlewares`. Factories typed
       * without a config (`Core.MiddlewareFactory`) register what they read: nothing (`undefined`),
       * or the options they merge with their defaults.
       */
      interface PackageMiddlewares {
        'strapi::body': FactoryConfig<typeof body>;
        'strapi::compression': FactoryConfig<typeof compression>;
        // TODO @Nico `origin` is required by the factory's `Config`, but runtime merges defaults and
        // passes `{}` for a bare `'strapi::cors'`. Typed routes need `{ name, config: { origin } }`.
        'strapi::cors': FactoryConfig<typeof cors>;
        'strapi::errors': undefined;
        'strapi::favicon': FactoryConfig<typeof favicon>;
        'strapi::ip': FactoryConfig<typeof ip>;
        'strapi::logger': undefined;
        'strapi::poweredBy': FactoryConfig<typeof poweredBy>;
        'strapi::public': PublicConfig;
        'strapi::query': Partial<QueryConfig>;
        'strapi::responseTime': undefined;
        'strapi::responses': FactoryConfig<typeof responses>;
        'strapi::security': FactoryConfig<typeof security>;
        'strapi::session': FactoryConfig<typeof session>;
      }
    }
  }
}
