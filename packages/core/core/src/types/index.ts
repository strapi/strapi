import type * as ResolvedConfig from './config';

/** Resolved config contracts, e.g. `ResolvedConfig.Server`. Input types are `Core.Config.*` in `@strapi/types`. */
export type * as ResolvedConfig from './config';

/**
 * Config contracts of the namespaces `@strapi/core` loads, keyed as `strapi.config.get` reads them.
 * Each namespace's contract lives in its own file under `./config`.
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
    }
  }
}
