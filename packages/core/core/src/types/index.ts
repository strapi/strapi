import type { Modules, Struct, UID } from '@strapi/types';
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

/** The payload of the `entry.*` events of the Document Service. */
type EntryEvent = {
  model: string;
  uid: UID.Schema;
  entry: Modules.Documents.AnyDocument;
};

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
        // Set at startup, with no config file.
        launchedAt: ResolvedConfig.LaunchedAt;
        autoReload: ResolvedConfig.AutoReload;
        environment: ResolvedConfig.Environment;
        uuid: ResolvedConfig.Uuid;
        installId: ResolvedConfig.InstallId;
        packageJsonStrapi: ResolvedConfig.PackageJsonStrapi;
        info: ResolvedConfig.Info;
        dirs: ResolvedConfig.Dirs;
        enabledPlugins: ResolvedConfig.EnabledPlugins;
      }

      /**
       * The core store rows of the Strapi instance. `strapi_content_types_schema` holds the
       * content-type schemas of the last start, written after the database schema sync and read by
       * the next start: they may differ from the schemas of this start, so they are keyed by any UID. `strapi_unidirectional-join-table-repair-ran` records that the one-time join
       * table repair ran.
       */
      interface Stores {
        strapi_content_types_schema: Record<string, Struct.ContentTypeSchema>;
        'strapi_unidirectional-join-table-repair-ran': boolean;
      }

      /**
       * Events `@strapi/core` emits on the event hub.
       *
       * The `entry.*` events are emitted by the Document Service after the transaction commits, one
       * per entry: `model` is the model name, `uid` its UID, `entry` the entry sanitized as a default
       * output (private fields removed). It is fetched again with a deep populate, except for
       * `entry.delete` and `entry.unpublish`, which pass the entry as it was before. `entry.*` events
       * are also forwarded to webhooks with the same payload.
       *
       * The `ee.*` events report a license change, with no payload.
       */
      interface Events {
        'entry.create': [EntryEvent];
        'entry.update': [EntryEvent];
        'entry.delete': [EntryEvent];
        'entry.publish': [EntryEvent];
        'entry.unpublish': [EntryEvent];
        'entry.draft-discard': [EntryEvent];
        'ee.enable': [];
        'ee.disable': [];
        'ee.update': [];
      }

      /**
       * Configs of the `strapi::*` middlewares, registered from `../middlewares`. Factories typed
       * without a config (`Core.MiddlewareFactory`) register what they read: nothing (`undefined`),
       * or the options they merge with their defaults.
       */
      interface PackageMiddlewares {
        'strapi::body': FactoryConfig<typeof body>;
        'strapi::compression': FactoryConfig<typeof compression>;
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
