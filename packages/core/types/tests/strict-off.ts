import type { Core, Modules, Public, Schema, Struct, UID, Utils } from '../src';
import type * as Internal from '../src/internal';
import type { IsStrict } from '../src/core/strictness';

interface LegacyItemSchema extends Struct.CollectionTypeSchema {
  attributes: { title: Schema.Attribute.String };
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageServices {
        'plugin::legacy.example': { count(): number };
      }
      interface AppServices {
        'plugin::legacy.example': { count(): string };
        'api::legacy.example': { count(): string };
        'api::legacy.inferred': { count(): string };
      }
      interface InferredServices {
        'api::legacy.inferred': true;
      }
      interface PackageControllers {
        'plugin::legacy.example': { list: Core.ControllerHandler };
      }
      interface AppControllers {
        'plugin::legacy.example': { find: Core.ControllerHandler };
        'api::legacy.example': { find: Core.ControllerHandler };
        'api::legacy.inferred': { find: Core.ControllerHandler };
      }
      interface InferredControllers {
        'api::legacy.inferred': true;
      }
      interface Stores {
        plugin_legacy_settings: { enabled: boolean };
      }
      interface Events {
        'legacy.event': [{ id: number }];
      }
      interface PackageConfigs {
        'plugin::legacy': { enabled: boolean };
      }
      interface AppConfigs {
        'plugin::legacy': { enabled: string };
      }
      interface PackagePolicies {
        'plugin::legacy.hasRole': { role: string };
        'api::legacy.hasRole': { apiRole: string };
      }
      interface AppPolicies {
        'plugin::legacy.hasRole': { roles: string[] };
      }
      interface PackageMiddlewares {
        'plugin::legacy.timer': { ms: number };
        'api::legacy.audit': { channel: string };
      }
      interface AppMiddlewares {
        'plugin::legacy.timer': { seconds: number };
      }
      interface PackageContentTypeSchemas {
        'plugin::legacy.item': LegacyItemSchema;
      }
      interface AppContentTypeSchemas {
        'api::strict-only.page': Struct.SingleTypeSchema;
      }
      interface ComponentSchemas {
        'strict-only.seo': Struct.ComponentSchema;
      }
    }
  }
}

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
/** Suggested names widen a type for completion without changing which values it accepts. */
type SameValues<T, U> = [T] extends [U] ? ([U] extends [T] ? true : false) : false;
declare const checks: [
  Expect<Equal<IsStrict, false>>,
  Expect<Equal<Core.ServiceFor<'plugin::legacy.example'>, Core.Service>>,
  Expect<Equal<Core.ControllerFor<'plugin::legacy.example'>, Core.Controller>>,
  Expect<SameValues<Core.PolicyReference, string | { name: string; config: unknown }>>,
  Expect<
    SameValues<
      Core.MiddlewareReference,
      | string
      | Core.MiddlewareHandler
      | { name: string; config?: unknown }
      | { resolve: string; config?: unknown }
    >
  >,
  // Registered names are still listed for completion.
  Expect<Equal<'plugin::legacy.timer' extends Core.MiddlewareReference ? true : false, true>>,
  Expect<SameValues<Core.ServiceLookupUID, UID.Service>>,
  Expect<SameValues<Core.ControllerLookupUID, UID.Controller>>,
  // Unregistered literal names keep the legacy types: only strict types close them to `never`.
  Expect<Equal<Core.ServiceFor<'plugin::unregistered.example'>, Core.Service>>,
  Expect<Equal<Core.ControllerFor<'plugin::unregistered.example'>, Core.Controller>>,
];
checks satisfies unknown;

// Global schema registries are strict-only: the Public registries keep their generic index signatures.
declare const schemaChecks: [
  Expect<Equal<UID.ContentType, Internal.UID.ContentType>>,
  Expect<Equal<UID.Component, Internal.UID.Component>>,
  Expect<Equal<UID.SingleType, Internal.UID.ContentType>>,
  Expect<Equal<Schema.ContentType<'api::strict-only.page'>, Struct.ContentTypeSchema>>,
  Expect<Equal<Schema.Component<'strict-only.seo'>, Struct.ComponentSchema>>,
];
schemaChecks satisfies unknown;

// Package content-type schemas are strict-only too: a declared UID keeps develop's generic types.
declare const packageSchemaChecks: [
  Expect<Equal<Schema.ContentTypes, Public.ContentTypeSchemas>>,
  Expect<Equal<Schema.ContentType<'plugin::legacy.item'>, Struct.ContentTypeSchema>>,
  Expect<
    Equal<
      Utils.Constants.IsSchemaRegistered<'plugin::legacy.item'>,
      Utils.Constants.AreSchemaRegistriesExtended
    >
  >,
  Expect<Equal<Utils.Constants.IsSchemaRegistered<'plugin::legacy.item'>, false>>,
  Expect<Equal<Modules.Documents.Document<'plugin::legacy.item'>, Modules.Documents.AnyDocument>>,
  Expect<Equal<Modules.Documents.Result<'plugin::legacy.item'>, Modules.Documents.AnyDocument>>,
  Expect<
    Equal<
      Modules.Documents.Params.Data.PartialInput<'plugin::legacy.item'>,
      Modules.Documents.Params.Data.Input<'plugin::legacy.item'>
    >
  >,
];
packageSchemaChecks satisfies unknown;

// Plural accessors keep the legacy records, even for registered keys.
declare const mapChecks: [
  Expect<Equal<Core.Strapi['services'], Record<string, Core.Service>>>,
  Expect<Equal<Core.Strapi['controllers'], Record<string, Core.Controller>>>,
  Expect<Equal<Core.Strapi['policies'], Record<string, Core.Policy>>>,
  Expect<Equal<Core.Strapi['plugins'], Record<string, Core.Plugin>>>,
  Expect<Equal<Core.Strapi['apis'], Record<string, Core.Module>>>,
  Expect<Equal<Core.Plugin<'legacy'>['services'], Record<string, Core.Service>>>,
  Expect<Equal<Core.Plugin<'legacy'>['controllers'], Record<string, Core.Controller>>>,
  Expect<Equal<Core.Plugin<'legacy'>['policies'], Record<string, Core.Policy>>>,
  Expect<Equal<Core.Module<'api::legacy'>['services'], Record<string, Core.Service>>>,
  Expect<Equal<Core.Strapi['services']['plugin::legacy.example'], Core.Service>>,
  Expect<Equal<Core.Strapi['controllers']['plugin::legacy.example'], Core.Controller>>,
  Expect<Equal<Core.Strapi['policies']['plugin::legacy.hasRole'], Core.Policy>>,
  Expect<Equal<Core.Strapi['middlewares'], Record<string, Core.MiddlewareFactory>>>,
  Expect<Equal<Core.Plugin<'legacy'>['middlewares'], Record<string, Core.Middleware>>>,
  Expect<Equal<Core.Module<'api::legacy'>['middlewares'], Record<string, Core.Middleware>>>,
  Expect<Equal<Core.Strapi['middlewares']['plugin::legacy.timer'], Core.MiddlewareFactory>>,
];
mapChecks satisfies unknown;

// Document Service params keep develop's types.
type HasParam<TParams, TKey extends string> = TKey extends keyof TParams ? true : false;
type Documents = Modules.Documents.ServiceInstance<UID.ContentType>;
type FindManyParams = NonNullable<Parameters<Documents['findMany']>[0]>;
type CoreFind = Awaited<ReturnType<Core.CoreAPI.Service.CollectionType['find']>>;
type PublishParams = Parameters<Modules.Documents.DraftAndPublishExtension['publish']>[0];
declare const documentParamChecks: [
  // `update` takes no `status`.
  Expect<Equal<HasParam<Modules.Documents.ServiceParams['update'], 'status'>, false>>,
  // Methods take `lookup`.
  Expect<Equal<FindManyParams['lookup'], Record<string, unknown> | undefined>>,
  Expect<Equal<PublishParams['lookup'], Record<string, unknown> | undefined>>,
  // `clone` may resolve to `null`.
  Expect<Equal<null extends Awaited<ReturnType<Documents['clone']>> ? true : false, true>>,
  // The core service's `find` may resolve to `null` results, with no `total` in its pagination.
  Expect<Equal<CoreFind['results'], Modules.Documents.AnyDocument[] | null>>,
  Expect<Equal<HasParam<CoreFind['pagination'], 'total'>, false>>,
];
documentParamChecks satisfies unknown;

// Document Service write params keep develop's types: the write inputs are strict-only.
type Pick<
  TUID extends UID.ContentType,
  TKind extends Modules.Documents.Params.Kind,
> = Modules.Documents.Params.Pick<TUID, TKind>;
type WriteParams<TUID extends UID.ContentType> = Modules.Documents.ServiceParams<TUID>;
type DocumentId = { documentId: Modules.Documents.ID };
declare const writeParamChecks: [
  Expect<
    Equal<
      WriteParams<'api::strict-only.page'>['create'],
      Pick<
        'api::strict-only.page',
        'data' | 'fields' | 'populate' | 'locale:string' | 'lookup' | 'status'
      >
    >
  >,
  Expect<
    Equal<
      WriteParams<'api::strict-only.page'>['update'],
      Pick<
        'api::strict-only.page',
        'data:partial' | 'fields' | 'populate' | 'locale:string' | 'lookup'
      > &
        DocumentId
    >
  >,
  Expect<
    Equal<
      WriteParams<'api::strict-only.page'>['clone'],
      Pick<
        'api::strict-only.page',
        'data' | 'fields' | 'populate' | 'status' | 'locale:string' | 'lookup'
      > &
        DocumentId
    >
  >,
  Expect<
    Equal<
      WriteParams<UID.ContentType>['create'],
      Pick<UID.ContentType, 'data' | 'fields' | 'populate' | 'locale:string' | 'lookup' | 'status'>
    >
  >,
  // The core service's `create` keeps its loose data.
  Expect<
    Equal<
      Parameters<Core.CoreAPI.Service.CollectionType['create']>[0],
      { data: Record<string, unknown>; [key: string]: unknown }
    >
  >,
];
writeParamChecks satisfies unknown;

// Hooks keep develop's types, even for the hooks registered by `@strapi/types`.
declare const hookStrapi: Core.Strapi;
const hook = hookStrapi.hook('strapi::content-types.beforeSync');
const hooksRegistry = hookStrapi.get('hooks');
declare const hookChecks: [
  Expect<Equal<Core.Strapi['hooks'], Record<string, any>>>,
  Expect<Equal<Core.Strapi['hook'], (name: string) => any>>,
  Expect<Equal<Core.Strapi['get'], Core.Container['get']>>,
  Expect<Equal<typeof hook, any>>,
  Expect<Equal<typeof hooksRegistry, any>>,
];
hookChecks satisfies unknown;

// The core store keeps develop's types, even for registered keys.
declare const storeStrapi: Core.Strapi;
const storeRead = storeStrapi.store.get({ type: 'plugin', name: 'legacy', key: 'settings' });
declare const storeChecks: [
  Expect<Equal<Core.Strapi['store'], Modules.CoreStore.CoreStore>>,
  Expect<Equal<typeof storeRead, Promise<unknown>>>,
];
storeChecks satisfies unknown;
storeStrapi.store.set({ type: 'plugin', name: 'legacy', key: 'settings', value: 'any' });

// The event hub keeps develop's types, even for registered names.
declare const eventStrapi: Core.Strapi;
declare const eventChecks: [
  Expect<Equal<Core.Strapi['eventHub'], Modules.EventHub.EventHub>>,
  Expect<
    Equal<Parameters<Core.Strapi['eventHub']['emit']>, [eventName: string, ...args: unknown[]]>
  >,
];
eventChecks satisfies unknown;
eventStrapi.eventHub.emit('legacy.event', { off: 'contract' });

declare const strapi: Core.Strapi;
strapi.service('plugin::legacy.example').anything();
strapi.plugin('legacy').service('example').anything();
strapi.services['plugin::legacy.example'].anything();
strapi.plugin('legacy').services.example.anything();
strapi.plugins.legacy.services.example.anything();
strapi.api('legacy').services.example.anything();

const controller = strapi.controller('plugin::legacy.example');
const pluginController = strapi.plugin('legacy').controller('example');
const config = strapi.config.get('plugin::legacy');
const pluginConfig = strapi.plugin('legacy').config('enabled');
const unregisteredService = strapi.plugin('legacy').service('unregistered');
const unregisteredController = strapi.plugin('unregistered').controller('example');
declare const results: [
  Expect<Equal<typeof unregisteredService, Core.Service>>,
  Expect<Equal<typeof unregisteredController, Core.Controller>>,
  Expect<Equal<typeof controller, Core.Controller>>,
  Expect<Equal<typeof pluginController, Core.Controller>>,
  Expect<Equal<typeof config, unknown>>,
  Expect<Equal<typeof pluginConfig, unknown>>,
];
results satisfies unknown;

const explicitConfig = strapi.config.get<number>('plugin::legacy.enabled');
const explicitPluginConfig = strapi.plugin('legacy').config<number>('enabled');
const defaultConfig = strapi.config.get('plugin::legacy.enabled', 123);
const defaultPluginConfig = strapi.plugin('legacy').config('enabled', 123);
explicitConfig satisfies number;
explicitPluginConfig satisfies number;
defaultConfig satisfies number;
defaultPluginConfig satisfies number;

// Config defaults preserve legacy contextual inference and explicit result generics.
const contextualConfig: { port: number } = strapi.config.get('plugin::legacy');
const contextualPluginConfig: { port: number } = strapi.plugin('legacy').config('enabled');
contextualConfig.port satisfies number;
contextualPluginConfig.port satisfies number;
const explicitDefaultConfig = strapi.config.get<number>('plugin::legacy.enabled', 123);
const explicitDefaultPluginConfig = strapi.plugin('legacy').config<number>('enabled', 123);
const explicitUndefinedConfig = strapi.config.get<number>('plugin::legacy.enabled', undefined);
const explicitUndefinedPluginConfig = strapi.plugin('legacy').config<number>('enabled', undefined);
const nullableConfig = strapi.config.get<number | null>('plugin::legacy.enabled', null);
declare const configDefaultChecks: [
  Expect<Equal<typeof explicitDefaultConfig, number>>,
  Expect<Equal<typeof explicitDefaultPluginConfig, number>>,
  Expect<Equal<typeof explicitUndefinedConfig, number>>,
  Expect<Equal<typeof explicitUndefinedPluginConfig, number>>,
  Expect<Equal<typeof nullableConfig, number | null>>,
];
configDefaultChecks satisfies unknown;
const fallbackBoolean = strapi.config.get('plugin::legacy.enabled', false);
const fallbackString = strapi.config.get('unregistered.label', 'fallback');
const fallbackNumber = strapi.config.get('unregistered.limit', 42);
const pluginFallbackBoolean = strapi.plugin('legacy').config('enabled', false);
const pluginFallbackString = strapi.plugin('legacy').config('label', 'fallback');
const pluginFallbackNumber = strapi.plugin('legacy').config('limit', 42);
const fallbackObject = strapi.config.get('unregistered.options', { enabled: false });
const pluginFallbackArray = strapi.plugin('legacy').config('labels', ['first']);
fallbackObject.enabled = true;
pluginFallbackArray.push('second');
declare const fallbackChecks: [
  Expect<Equal<typeof fallbackBoolean, false>>,
  Expect<Equal<typeof fallbackString, 'fallback'>>,
  Expect<Equal<typeof fallbackNumber, 42>>,
  Expect<Equal<typeof pluginFallbackBoolean, false>>,
  Expect<Equal<typeof pluginFallbackString, 'fallback'>>,
  Expect<Equal<typeof pluginFallbackNumber, 42>>,
  Expect<Equal<typeof fallbackObject, { enabled: boolean }>>,
  Expect<Equal<typeof pluginFallbackArray, string[]>>,
];
fallbackChecks satisfies unknown;
// Defaults infer widening literals, as before registries, so mutable use sites keep compiling.
let reassignedPort = strapi.config.get('plugin::legacy.port', 1337);
reassignedPort = 4000;
let reassignedPluginPort = strapi.plugin('legacy').config('port', 1337);
reassignedPluginPort = 4000;
let reassignedEnabled = strapi.config.get('plugin::legacy.enabled', false);
reassignedEnabled = true;
const mutableOptions = { port: strapi.config.get('unregistered.port', 1337) };
mutableOptions.port = 4000;
const mutableLabels = [strapi.config.get('plugin::legacy.label', 'first')];
mutableLabels.push('second');
[reassignedPort, reassignedPluginPort, reassignedEnabled] satisfies unknown;
const forwardDefault = <T>(key: string, value: T): T => strapi.config.get<T>(key, value);
const forwardPluginDefault = <T>(key: string, value: T): T =>
  strapi.plugin('legacy').config<T>(key, value);
forwardDefault<void>('unregistered', undefined) satisfies void;
forwardPluginDefault<unknown>('unregistered', undefined) satisfies unknown;
// @ts-expect-error Explicit result types still constrain defaults with registries disabled.
strapi.config.get<number>('plugin::legacy.enabled', '123');
// @ts-expect-error Explicit plugin result types still constrain defaults with registries disabled.
strapi.plugin('legacy').config<number>('enabled', '123');

type Service = { custom(): string };
type Controller = { custom: Core.ControllerHandler<string> };
const service = strapi.plugin('legacy').service<Service>('example');
const explicitController = strapi.plugin('legacy').controller<Controller>('example');
service.custom() satisfies string;
// Full UID lookups keep develop's non-generic signatures.
// @ts-expect-error Root lookups take no type argument, as on develop.
strapi.service<Service>('plugin::unregistered.example');
// @ts-expect-error Root lookups take no type argument, as on develop.
strapi.controller<Controller>('plugin::unregistered.example');
const fullUidService = strapi.service('plugin::unregistered.example');
const fullUidController = strapi.controller('plugin::unregistered.example');
declare const fullUidChecks: [
  Expect<Equal<typeof fullUidService, Core.Service>>,
  Expect<Equal<typeof fullUidController, Core.Controller>>,
];
fullUidChecks satisfies unknown;
explicitController.custom satisfies Core.ControllerHandler<string>;
const contextualService: Service = strapi.plugin('legacy').service('example');
const contextualController: Controller = strapi.plugin('legacy').controller('example');
contextualService.custom() satisfies string;
contextualController.custom satisfies Core.ControllerHandler<string>;

// Generic forwarding and assigned implementations keep the pre-registry behavior.
const forward = <T extends Service>(name: string): T => strapi.plugin('legacy').service(name);
forward<Service>('example').custom() satisfies string;
// @ts-expect-error An assigned implementation must satisfy every explicit service generic.
strapi.plugin('legacy').service = () => ({ custom: () => 'value' });
// @ts-expect-error An assigned implementation must satisfy every explicit controller generic.
strapi.plugin('legacy').controller = () => ({ custom: () => 'value' });
// @ts-expect-error An assigned implementation must satisfy every explicit config generic.
strapi.config.get = () => 'value';

const policies: Core.PolicyReference[] = [
  'global::unregistered',
  'plugin::legacy.hasRole',
  { name: 'plugin::legacy.hasRole', config: false },
];
const route: Core.RouteInputFor<{ example: Controller }> = {
  method: 'GET',
  path: '/',
  handler: 'example.custom',
  config: { policies },
};
// Explicit controller maps still check handler names with strict types disabled.
// @ts-expect-error The controller map has no missing action.
route.handler = 'example.missing';

// Policy and API module lookups keep their develop types: `Policy`, the legacy service and
// controller, and `any` for plugin policies, which only the plugin index signature provides.
declare const dynamicName: string;
const registeredPolicy = strapi.policy('plugin::legacy.hasRole');
const unregisteredPolicy = strapi.policy('global::unregistered');
const dynamicPolicy = strapi.policy(dynamicName);
// @ts-expect-error Root lookups take no type argument, as on develop.
strapi.policy<Core.PolicyHandler>('global::unregistered');
const pluginPolicy = strapi.plugin('legacy').policy('hasRole');
const apiService = strapi.api('legacy').service('example');
const apiController = strapi.api('legacy').controller('example');
const explicitApiService = strapi.api('legacy').service<Service>('example');
const contextualApiService: Service = strapi.api('legacy').service('example');
declare const policyAndApiChecks: [
  Expect<Equal<typeof registeredPolicy, Core.Policy>>,
  Expect<Equal<typeof unregisteredPolicy, Core.Policy>>,
  Expect<Equal<typeof dynamicPolicy, Core.Policy>>,
  Expect<Equal<Core.Plugin<'legacy'>['policy'], any>>,
  Expect<Equal<typeof pluginPolicy, any>>,
  Expect<Equal<typeof apiService, Core.Service>>,
  Expect<Equal<typeof apiController, Core.Controller>>,
  Expect<Equal<typeof explicitApiService, Service>>,
  Expect<Equal<typeof contextualApiService, Service>>,
];
policyAndApiChecks satisfies unknown;

// Middleware lookups keep their develop types: `MiddlewareFactory`, and `any` for plugin middlewares,
// which only the plugin index signature provides. Typed routes accept any middleware name.
const registeredMiddleware = strapi.middleware('plugin::legacy.timer');
const unregisteredMiddleware = strapi.middleware('global::unregistered');
const dynamicMiddleware = strapi.middleware(dynamicName);
// @ts-expect-error Root lookups take no type argument, as on develop.
strapi.middleware<Core.MiddlewareFactory>('global::unregistered');
const pluginMiddleware = strapi.plugin('legacy').middleware('timer');
declare const middlewareChecks: [
  Expect<Equal<typeof registeredMiddleware, Core.MiddlewareFactory>>,
  Expect<Equal<typeof unregisteredMiddleware, Core.MiddlewareFactory>>,
  Expect<Equal<typeof dynamicMiddleware, Core.MiddlewareFactory>>,
  Expect<Equal<typeof pluginMiddleware, any>>,
  Expect<Equal<'middleware' extends keyof Core.Module ? true : false, false>>,
];
middlewareChecks satisfies unknown;
// @ts-expect-error Modules have no middleware lookup without strict types, as on develop.
strapi.api('legacy').middleware('audit');
const middlewareRoute: Core.RouteInputFor<{ example: Controller }> = {
  method: 'GET',
  path: '/',
  handler: 'example.custom',
  config: {
    middlewares: [
      'global::unregistered',
      'plugin::legacy.timer',
      { name: 'plugin::legacy.timer', config: false },
      { name: 'api::legacy.audit' },
      { resolve: './src/custom', config: {} },
      async (ctx, next) => next(),
    ],
  },
};
middlewareRoute satisfies unknown;

// Modules have no policy lookup, as on develop; plugins keep the `any` of their index signature.
// @ts-expect-error Modules have no policy lookup without strict types, as on develop.
strapi.api('legacy').policy('hasRole');
// @ts-expect-error Modules have no policy lookup without strict types, as on develop.
strapi.admin.policy('unregistered');
declare const modulePolicyChecks: [
  Expect<Equal<'policy' extends keyof Core.Module ? true : false, false>>,
  Expect<Equal<Core.Plugin<'legacy'>['policy'], any>>,
  // The plugin name does not change the plugin type without strict types.
  Expect<Equal<Core.Plugin<'legacy'>, Core.Plugin>>,
];
modulePolicyChecks satisfies unknown;

// Without strict types, the global middlewares config accepts handlers as on develop.
const middlewaresConfig: Core.Config.Middlewares = [
  'strapi::logger',
  { name: 'strapi::cors', config: {} },
  async (_ctx, next) => next(),
];
middlewaresConfig satisfies unknown;

// Without strict types, policies keep develop's contravariant config check.
declare const rolePolicy: Core.Policy<{ role: string }>;
// @ts-expect-error A policy that needs a config is not assignable to `Policy<unknown>`.
const anyConfigPolicy: Core.Policy = rolePolicy;
anyConfigPolicy satisfies unknown;

// Without strict types, `Core.IsStrict` is `false` and a service factory may return any service, as
// on develop, for registered, inferred and unregistered UIDs.
type ServiceFactoryChecks = [
  Expect<Equal<Core.IsStrict, false>>,
  Expect<Equal<Core.ServiceFactoryUID, UID.Service>>,
  Expect<Equal<ReturnType<Core.ServiceFactory<'plugin::legacy.example'>>, Core.Service>>,
  Expect<Equal<ReturnType<Core.ServiceFactory<'api::unregistered.example'>>, Core.Service>>,
  Expect<Equal<ReturnType<Core.ServiceFactory<'api::legacy.inferred'>>, Core.Service>>,
];
declare const serviceFactoryChecks: ServiceFactoryChecks;
serviceFactoryChecks satisfies unknown;
(() => ({ count: () => 'any' })) satisfies Core.ServiceFactory<'plugin::legacy.example'>;
(() => ({ anything: true })) satisfies Core.ServiceFactory<'api::unregistered.example'>;

// Without strict types, a controller factory may return any object, for registered, inferred and
// unregistered UIDs. Develop has no public controller factory type, and `Core.Controller` rejects a
// core controller: the returned type has no index signature.
type ControllerFactoryChecks = [
  Expect<Equal<Core.ControllerFactoryUID, UID.Controller>>,
  Expect<Equal<ReturnType<Core.ControllerFactory<'plugin::legacy.example'>>, object>>,
  Expect<Equal<ReturnType<Core.ControllerFactory<'api::unregistered.example'>>, object>>,
  Expect<Equal<ReturnType<Core.ControllerFactory<'api::legacy.inferred'>>, object>>,
];
declare const controllerFactoryChecks: ControllerFactoryChecks;
controllerFactoryChecks satisfies unknown;
(() => ({ list: () => 'any' })) satisfies Core.ControllerFactory<'plugin::legacy.example'>;
(() => ({ anything: true })) satisfies Core.ControllerFactory<'api::unregistered.example'>;
declare const coreController: (params: {
  strapi: Core.Strapi;
}) => Core.CoreAPI.Controller.ContentType<'api::legacy.example'> & {
  titles: Core.ControllerHandler;
};
coreController satisfies Core.ControllerFactory<'api::legacy.example'>;
// @ts-expect-error `Core.Controller` needs an index signature that a core controller does not have.
coreController satisfies (params: { strapi: Core.Strapi }) => Core.Controller;

// Without strict types, auth `verify` resolves to `any`, as on develop.
type AuthVerifyChecks = [
  Expect<Equal<Awaited<ReturnType<Modules.Auth.AuthenticationService['verify']>>, any>>,
];
declare const authVerifyChecks: AuthVerifyChecks;
authVerifyChecks satisfies unknown;

// `Core.RouteConfig` keeps develop's `auth`: strategies by name only. `RouteConfigFor` also takes
// strategy objects.
type RouteAuthChecks = [
  Expect<
    Equal<Core.RouteConfig['auth'], false | { scope?: string[]; strategies?: string[] } | undefined>
  >,
];
declare const routeAuthChecks: RouteAuthChecks;
routeAuthChecks satisfies unknown;

// Without strict types, preview handler params keep develop's `string` status.
type PreviewStatusChecks = [
  Expect<
    Equal<
      Parameters<NonNullable<Core.Config.Admin['preview']>['config']['handler']>[1]['status'],
      string | undefined
    >
  >,
];
declare const previewStatusChecks: PreviewStatusChecks;
previewStatusChecks satisfies unknown;
