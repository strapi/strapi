import type { Logger } from '@strapi/logger';
import type { Database } from '@strapi/database';

import type { PropertyPath } from 'lodash';
import type * as Core from '.';
import type * as Modules from '../modules';
import type * as Schema from '../schema';

import type * as UID from '../uid';

import type { Container } from './container';
import type { ControllerLookup, ControllerMap } from './controller';
import type { ApiMap } from './module';
import type { PluginMap } from './plugin';
import type { PolicyMap } from './policy';
import type { ServiceLookup, ServiceMap } from './service';
import type { SuggestedString } from '../utils/string';
import type { IsStrict } from './strictness';

export interface Strapi extends Container {
  server: Modules.Server.Server;
  log: Logger;
  fs: StrapiFS;
  eventHub: Modules.EventHub.EventHub;
  startupLogger: StartupLogger;
  cron: Modules.Cron.CronService;
  store: Modules.CoreStore.CoreStore;
  /**
   * @deprecated Use the Document Service (`strapi.documents`) instead. Will be removed in the next major version.
   */
  entityValidator: Modules.EntityValidator.EntityValidator;
  /**
   * @deprecated Use the Document Service (`strapi.documents`) instead. Will be removed in the next major version.
   * @see {@link https://docs.strapi.io/dev-docs/api/document-service} Document Service API
   */
  entityService: Modules.EntityService.EntityService;
  /**
   * The Document Service is the primary API to interact with content in Strapi v5+.
   * It replaces the deprecated `entityService` and provides full support for Draft & Publish and internationalization.
   *
   * @see {@link https://docs.strapi.io/dev-docs/api/document-service} Document Service API
   */
  documents: Modules.Documents.Service;
  localization: Core.Localization;
  telemetry: Modules.Metrics.TelemetryService;
  requestContext: Modules.RequestContext.RequestContext;
  customFields: Modules.CustomFields.CustomFields;
  fetch: Modules.Fetch.Fetch;
  dirs: StrapiDirectories;
  admin: Core.Module;
  isLoaded: boolean;
  db: Database;
  app: any;
  EE?: boolean;
  ai: Modules.AI.AiNamespace;
  ee: {
    seats: number | null | undefined;
    type: string | null | undefined;
    isEE: boolean;
    isTrial: boolean;
    subscriptionId?: string | null | undefined;
    planPriceId?: string | null | undefined;
    getTrialEndDate: ({
      strapi,
    }: {
      strapi: Core.Strapi;
    }) => Promise<{ trialEndsAt: string } | null>;
    features: {
      isEnabled: (feature: string) => boolean;
      list: () => { name: string; [key: string]: any }[];
      get: (feature: string) => string | { name: string; [key: string]: any } | undefined;
    };
  };
  features: Modules.Features.FeaturesService;
  components: Schema.Components;
  reload: Reloader;
  config: ConfigProvider;
  /**
   * Services keyed by UID. With strict types enabled, registered UIDs resolve to their contracts;
   * other keys keep the legacy service.
   */
  services: ServiceMap;
  /**
   * Resolves the registered contract of `uid`. An explicit type argument (`service<MyService>(uid)`)
   * wins over the registries, including for unregistered names with strict types enabled.
   */
  service<T extends Core.Service = Core.Service, TUID extends UID.Service = UID.Service>(
    uid: TUID
  ): ServiceLookup<TUID, T>;
  /**
   * Controllers keyed by UID. With strict types enabled, registered UIDs resolve to their contracts;
   * other keys keep the legacy controller.
   */
  controllers: ControllerMap;
  /**
   * Resolves the registered contract of `uid`. An explicit type argument (`controller<MyController>(uid)`)
   * wins over the registries, including for unregistered names with strict types enabled.
   */
  controller<
    T extends Core.Controller = Core.Controller,
    TUID extends UID.Controller = UID.Controller,
  >(
    uid: TUID
  ): ControllerLookup<TUID, T>;
  contentTypes: Schema.ContentTypes;
  contentType<TContentTypeUID extends UID.ContentType>(
    name: TContentTypeUID
  ): Schema.ContentType<TContentTypeUID>;
  /**
   * Policies keyed by UID. With strict types enabled, registered UIDs receive their config contract;
   * other keys keep the legacy policy.
   */
  policies: PolicyMap;
  policy(name: string): Core.Policy;
  middlewares: Record<string, Core.MiddlewareFactory>;
  middleware(name: string): Core.MiddlewareFactory;
  /**
   * Plugins keyed by name. With strict types enabled, a plugin with registered contracts resolves to
   * `Plugin<name>`, like `plugin(name)`; other names keep the legacy plugin.
   */
  plugins: PluginMap;
  plugin<TName extends string>(name: TName): Core.Plugin<TName>;
  hooks: Record<string, any>;
  hook(name: string): any;
  /**
   * APIs keyed by name. With strict types enabled, an API with registered contracts resolves to
   * `Module<'api::<name>'>`, like `api(name)`; other names keep the legacy module.
   */
  apis: ApiMap;
  api<TName extends string>(name: TName): Core.Module<`api::${TName}`>;
  auth: Modules.Auth.AuthenticationService;
  /** Content API: permissions, route map, sanitize/validate, and registration of extra query/input params (see addQueryParams, addInputParams). */
  contentAPI: Modules.ContentAPI.ContentApi;
  /**
   * Per-application store of named Zod schemas built for content-API route validation.
   *
   * @internal Not a plugin API. Content-API validation writes during schema construction;
   * OpenAPI generation reads the same instance-owned store.
   */
  contentAPISchemaRegistry: Core.ContentAPISchemaRegistry;
  sanitizers: Modules.Sanitizers.SanitizersRegistry;
  validators: Modules.Validators.ValidatorsRegistry;
  sessionManager: Modules.SessionManager.SessionManagerService;
  load(): Promise<Strapi>;
  start(): Promise<Strapi>;
  destroy(): Promise<void>;
  sendStartupTelemetry(): void;
  openAdmin({ isInitialized }: { isInitialized: boolean }): void;
  postListen(): Promise<void>;
  listen(): Promise<void>;
  stopWithError(err: unknown, customMessage?: string): never;
  stop(exitCode?: number): never;
  register(): Promise<Strapi>;
  bootstrap(): Promise<Strapi>;
  runPluginsLifecycles(lifecycleName: 'register' | 'bootstrap' | 'destroy'): Promise<void>;
  runUserLifecycles(lifecycleName: 'register' | 'bootstrap' | 'destroy'): Promise<void>;
  getModel<TSchemaUID extends UID.Schema>(
    uid: TSchemaUID
  ): TSchemaUID extends UID.ContentType
    ? Schema.ContentType<TSchemaUID>
    : TSchemaUID extends UID.Component
      ? Schema.Component<TSchemaUID>
      : never;
  query(uid: UID.Schema): ReturnType<Database['query']>;
}

export interface Reloader {
  isReloading: boolean;
  isWatching: boolean;
  (): void;
}

export interface StartupLogger {
  logStats(): void;
  logFirstStartupMessage(): void;
  logDefaultStartupMessage(): void;
  logStartupMessage({ isInitialized }: { isInitialized: boolean }): void;
}

export interface StrapiFS {
  writeAppFile(optPath: string | string[], data: string): Promise<void>;
  writePluginFile(plugin: string, optPath: string | string[], data: string): Promise<void>;
  removeAppFile(optPath: string | string[]): Promise<void>;
  appendFile(optPath: string | string[], data: string): void;
}

/** Config namespaces that have a registered contract, e.g. `'plugin::my-plugin'`. */
export type ConfigNamespace =
  | keyof Strapi.Registries.AppConfigs
  | keyof Strapi.Registries.PackageConfigs;

/** Resolves application overrides before package defaults. */
export type ConfigFor<TNamespace extends ConfigNamespace> =
  TNamespace extends keyof Strapi.Registries.AppConfigs
    ? Strapi.Registries.AppConfigs[TNamespace]
    : TNamespace extends keyof Strapi.Registries.PackageConfigs
      ? Strapi.Registries.PackageConfigs[TNamespace]
      : never;

/** `undefined` when `TValue` can be `null` or `undefined`: lodash `get` resolves through them to `undefined`. */
type Nullish<TValue> = [Extract<TValue, null | undefined>] extends [never] ? never : undefined;

/**
 * The value at one path segment of `TValue`, or `never` when the segment does not exist.
 * A numeric segment into an array resolves to the element or `undefined`, since the element may be absent.
 */
type SegmentValue<TValue, TSegment extends string> = TSegment extends keyof TValue
  ? TValue[TSegment]
  : TValue extends readonly (infer TElement)[]
    ? TSegment extends `${number}`
      ? TElement | undefined
      : never
    : never;

/** The value at a dotted path such as `'a.b'` or `'items.0.port'` inside `TValue`, or `never` when the path does not exist. */
type PathValue<TValue, TPath extends string> = TPath extends `${infer THead}.${infer TRest}`
  ? [SegmentValue<NonNullable<TValue>, THead>] extends [never]
    ? never
    : PathValue<SegmentValue<NonNullable<TValue>, THead> | Nullish<TValue>, TRest>
  : [SegmentValue<NonNullable<TValue>, TPath>] extends [never]
    ? never
    : SegmentValue<NonNullable<TValue>, TPath> | Nullish<TValue>;

/**
 * The value at a dotted path inside a registered config contract, e.g. `'providerOptions.localServer'`.
 * Resolves to `TFallback` when the path is not part of the contract.
 */
export type ConfigPathValue<TNamespace extends ConfigNamespace, TPath extends string, TFallback> = [
  PathValue<ConfigFor<TNamespace>, TPath>,
] extends [never]
  ? TFallback
  : PathValue<ConfigFor<TNamespace>, TPath>;

/** Any config path. Registered namespaces are listed for completion. */
export type ConfigPath = SuggestedString<ConfigNamespace> | Exclude<PropertyPath, string>;

/**
 * Resolves a config path against the registries: a registered namespace, or a dotted path inside one.
 * Array paths, unregistered namespaces, unknown paths and the unresolved default path resolve to `T`.
 */
type ConfigLookup<TPath, T, TDefault = undefined> = IsStrict extends false
  ? T
  : [ConfigNamespace] extends [never]
    ? T
    : ConfigPath extends TPath
      ? T
      : TPath extends ConfigNamespace
        ? ConfigWithDefault<ConfigFor<TPath>, TDefault>
        : TPath extends `${infer TNamespace}.${infer TKey}`
          ? TNamespace extends ConfigNamespace
            ? ConfigPathLookup<TNamespace, TKey, T, TDefault>
            : T
          : T;

/** Applies defaults only to known config paths, preserving contextual inference for other paths. */
export type ConfigPathLookup<
  TNamespace extends ConfigNamespace,
  TPath extends string,
  T,
  TDefault,
> = [ConfigPathValue<TNamespace, TPath, never>] extends [never]
  ? T
  : ConfigWithDefault<ConfigPathValue<TNamespace, TPath, never>, TDefault>;

/** Replaces an absent config value while preserving null and defined values. */
export type ConfigWithDefault<TValue, TDefault> = undefined extends TValue
  ? Exclude<TValue, undefined> | TDefault
  : TValue;

/**
 * Preserves primitive literal inference in default argument tuples without making objects readonly.
 * The remaining members keep the constraint open to every config value, including unknown and void.
 */
export type ConfigDefaultValue =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | NonNullable<unknown>
  | null
  | undefined
  | void;

export interface ConfigProvider {
  /**
   * Reads a config value. A registered namespace, or a dotted path inside one, resolves to its contract.
   *
   * A defined default replaces `undefined` in the result; `null` values are preserved.
   * The argument tuple tracks defaults that may be omitted; the intersection preserves legacy
   * inference from their values. `NoInfer` prevents contextual return types from supplying a default
   * that was never passed.
   */
  get<
    T = unknown,
    TPath extends ConfigPath = ConfigPath,
    TArgs extends [] | [ConfigDefaultValue] = [] | [ConfigLookup<TPath, T> | undefined],
  >(
    key: TPath,
    ...args: TArgs & ([] | [defaultVal: ConfigLookup<TPath, T> | undefined])
  ): ConfigLookup<TPath, T, NoInfer<TArgs[0]>>;
  set(path: string, val: unknown): this;
  has(path: string): boolean;
  [key: string]: any;
}

export interface StrapiDirectories {
  static: {
    public: string;
  };
  app: {
    root: string;
    src: string;
    api: string;
    components: string;
    extensions: string;
    policies: string;
    middlewares: string;
    config: string;
    contentStructure: string;
  };
  dist: {
    root: string;
    src: string;
    api: string;
    components: string;
    extensions: string;
    policies: string;
    middlewares: string;
    config: string;
    contentStructure: string;
  };
}
