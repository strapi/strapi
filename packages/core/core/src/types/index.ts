import type * as Config from './config';

export type * from './config';

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
        server: Config.ResolvedServerConfig;
        admin: Config.ResolvedAdminConfig;
        api: Config.ResolvedApiConfig;
        database: Config.ResolvedDatabaseConfig;
        middlewares: Config.ResolvedMiddlewaresConfig;
        features: Config.ResolvedFeaturesConfig;
        typescript: Config.ResolvedTypeScriptConfig;
      }
    }
  }
}
