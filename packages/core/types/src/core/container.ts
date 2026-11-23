import type { Logger } from '@strapi/logger';

import type * as Modules from '../modules';
import type { SuggestedString } from '../utils/string';
import type { ContentAPISchemaRegistry } from './content-api-schema-registry';
import type * as Contracts from './container-contracts';
import type { StrictHooksRegistry } from './hook';
import type { AdminModule } from './module';
import type { ConfigProvider, Reloader, StartupLogger, StrapiFS } from './strapi';

export interface Container {
  add<T, U extends string>(name: U, resolver: T): Container;
  get<T = any>(name: string, args?: unknown): T;
  has(name: string): boolean;
}

/** Container names that have a registered value. */
export type RegisteredContainerName = Extract<keyof Strapi.Registries.ContainerEntries, string>;

/** A name accepted by `strapi.get(name)` and `strapi.add(name)`. Registered names are listed for completion. */
export type ContainerLookupName = SuggestedString<RegisteredContainerName>;

/**
 * The registered value of a container name. An unregistered name resolves to `unknown`: nothing tells
 * what, if anything, is added under it.
 */
export type ContainerFor<TName extends string> = TName extends RegisteredContainerName
  ? Strapi.Registries.ContainerEntries[TName]
  : unknown;

/**
 * The result of `strapi.get(name)` with strict types: `T` when the name is not inferred, that is when
 * the caller passes an explicit type argument (TypeScript then does not infer the name) or a dynamic
 * name; the registered lookup otherwise.
 */
export type ContainerLookup<
  TName extends ContainerLookupName,
  T,
> = ContainerLookupName extends TName ? T : ContainerFor<TName>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      /**
       * The names `@strapi/core` adds to the container, and `'ai.admin'` and `'audit-logs-lifecycle'`,
       * which `@strapi/admin` adds and other packages read. They are registered here, next to the `Strapi`
       * interface, so that packages depending only on `@strapi/types` see them. A name a `strapi.*`
       * getter reads has the getter's type, the strict view included (`eventHub`, `coreStore`,
       * `hooks`, `db`, `admin`).
       */
      interface ContainerEntries {
        config: ConfigProvider;
        'query-params': Contracts.QueryParamsService;
        'content-api': Modules.ContentAPI.ContentApi;
        /** @internal Not a plugin API, see `strapi.contentAPISchemaRegistry`. */
        'content-api-schema-registry': ContentAPISchemaRegistry;
        auth: Modules.Auth.AuthenticationService;
        server: Modules.Server.Server;
        fs: StrapiFS;
        eventHub: Modules.EventHub.StrictEventHub;
        startupLogger: StartupLogger;
        logger: Logger;
        fetch: Modules.Fetch.Fetch;
        features: Modules.Features.FeaturesService;
        requestContext: Modules.RequestContext.RequestContext;
        customFields: Modules.CustomFields.CustomFields;
        entityValidator: Modules.EntityValidator.EntityValidator;
        entityService: Modules.EntityService.EntityService;
        documents: Modules.Documents.Service;
        localization: Modules.Localization.Service;
        db: Modules.Lifecycles.StrictDatabase;
        reload: Reloader;
        'content-source-maps': Contracts.ContentSourceMapsService;
        /** @internal Not a plugin API, see {@link Contracts.ContentTypesRegistry}. */
        'content-types': Contracts.ContentTypesRegistry;
        /** @internal Not a plugin API, see {@link Contracts.ComponentsRegistry}. */
        components: Contracts.ComponentsRegistry;
        /** @internal Not a plugin API, see {@link Contracts.ServicesRegistry}. */
        services: Contracts.ServicesRegistry;
        /** @internal Not a plugin API, see {@link Contracts.PoliciesRegistry}. */
        policies: Contracts.PoliciesRegistry;
        /** @internal Not a plugin API, see {@link Contracts.MiddlewaresRegistry}. */
        middlewares: Contracts.MiddlewaresRegistry;
        hooks: StrictHooksRegistry;
        /** @internal Not a plugin API, see {@link Contracts.ControllersRegistry}. */
        controllers: Contracts.ControllersRegistry;
        /** @internal Not a plugin API, see {@link Contracts.ModulesRegistry}. */
        modules: Contracts.ModulesRegistry;
        /** @internal Not a plugin API, see {@link Contracts.PluginsRegistry}. */
        plugins: Contracts.PluginsRegistry;
        /** @internal Not a plugin API, see {@link Contracts.CustomFieldsRegistry}. */
        'custom-fields': Contracts.CustomFieldsRegistry;
        /** @internal Not a plugin API, see {@link Contracts.ApisRegistry}. */
        apis: Contracts.ApisRegistry;
        /** @internal Not a plugin API, see {@link Contracts.ModelsRegistry}. */
        models: Contracts.ModelsRegistry;
        sanitizers: Modules.Sanitizers.SanitizersRegistry;
        validators: Modules.Validators.ValidatorsRegistry;
        'ai.mcp': Modules.MCP.McpService;
        ai: Modules.AI.AiNamespace;
        'ai.admin': Modules.AI.AiAdminService;
        'content-structure': Contracts.ContentStructureService;
        sessionManager: Modules.SessionManager.SessionManagerService;
        webhookStore: Modules.WebhookStore.WebhookStore;
        webhookRunner: Modules.WebhookRunner.WebhookRunner;
        telemetry: Modules.Metrics.TelemetryService;
        coreStore: Modules.CoreStore.StrictCoreStore;
        admin: AdminModule;
        cron: Modules.Cron.CronService;
        /**
         * Added by `@strapi/admin` EE when the license lists `audit-logs` and
         * `admin.auditLogs.enabled` is not `false`. `get` throws when it is not added: check
         * `strapi.has('audit-logs-lifecycle')` first.
         */
        'audit-logs-lifecycle': Modules.AuditLogs.AuditLogsLifecycleService;
      }
    }
  }
}
