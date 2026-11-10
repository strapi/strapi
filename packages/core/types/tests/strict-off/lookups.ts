import type { Core, UID } from '../../src';
import type { IsStrict } from '../../src/core/strictness';
import type { Equal, Expect, SameValues } from './helpers';

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
  Expect<SameValues<Core.ServiceLookupName, UID.Service>>,
  Expect<SameValues<Core.ControllerLookupName, UID.Controller>>,
  // Unregistered literal names keep the legacy types: only strict types close them to `never`.
  Expect<Equal<Core.ServiceFor<'plugin::unregistered.example'>, Core.Service>>,
  Expect<Equal<Core.ControllerFor<'plugin::unregistered.example'>, Core.Controller>>,
];
checks satisfies unknown;

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
  Expect<Equal<Core.PluginOf<'legacy'>['policy'], any>>,
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
  Expect<Equal<Core.PluginOf<'legacy'>['policy'], any>>,
  // The plugin name does not change the plugin type without strict types.
  Expect<Equal<Core.PluginOf<'legacy'>, Core.Plugin>>,
];
modulePolicyChecks satisfies unknown;

// Without strict types, policies keep develop's contravariant config check.
declare const rolePolicy: Core.Policy<{ role: string }>;
// @ts-expect-error A policy that needs a config is not assignable to `Policy<unknown>`.
const anyConfigPolicy: Core.Policy = rolePolicy;
anyConfigPolicy satisfies unknown;

// Root lookups print develop's parameters exactly, even with registered names in the program:
// completion lists are strict-only.
type RootLookupParameter<TKey extends keyof Core.Strapi> = Core.Strapi[TKey] extends (
  name: infer TName
) => unknown
  ? TName
  : never;
declare const rootLookupChecks: [
  Expect<Equal<RootLookupParameter<'service'>, UID.Service>>,
  Expect<Equal<RootLookupParameter<'controller'>, UID.Controller>>,
  Expect<Equal<RootLookupParameter<'policy'>, string>>,
  Expect<Equal<RootLookupParameter<'middleware'>, string>>,
  Expect<Equal<RootLookupParameter<'plugin'>, string>>,
  Expect<Equal<RootLookupParameter<'api'>, string>>,
  Expect<Equal<RootLookupParameter<'hook'>, string>>,
  Expect<Equal<Core.Strapi['log'], import('@strapi/logger').Logger>>,
];
rootLookupChecks satisfies unknown;
