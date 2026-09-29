// Strict-off parity: the root `Core.Strapi` lookups and maps as develop apps use them.
// Compiled against develop too, so every expected error below is one develop reports.
import type { Core, UID } from '@strapi/strapi';

declare const app: Core.Strapi;
declare const strapi: Core.Strapi;
declare const anyFn: (...args: any[]) => any; // `jest.fn()`-like
const find = async () => [] as unknown[];
type MyService = { find(): Promise<string[]> };
type MyController = { index: Core.ControllerHandler };

// Plain mocks of root lookups: a non-generic function assigns to a non-generic member.
app.service = () => ({ find });
app.controller = () => ({});
app.policy = () => () => true;
app.plugin = () => ({}) as Core.Plugin;
app.api = () => ({}) as Core.Module;
app.service = anyFn;
app.controller = anyFn;
app.policy = anyFn;
app.plugin = anyFn;
app.api = anyFn;
app.service = (uid: string) => ({ uid, find });
app.plugin = (name: string) => ({ name }) as unknown as Core.Plugin;

// Values typed with a lookup member.
const service: Core.Strapi['service'] = () => ({ find });
const controller: Core.Strapi['controller'] = () => ({});
const policy: Core.Strapi['policy'] = () => () => true;
const plugin: Core.Strapi['plugin'] = () => ({}) as Core.Plugin;
const api: Core.Strapi['api'] = () => ({}) as Core.Module;
const partial: Partial<Core.Strapi> = {
  service: () => ({ find }),
  controller: () => ({}),
  policy: () => () => true,
  plugin: () => ({}) as Core.Plugin,
};
const picked: Pick<Core.Strapi, 'service' | 'plugin'> = {
  service: () => ({}),
  plugin: () => ({}) as Core.Plugin,
};

// Root lookups take no type argument.
// @ts-expect-error TS2558 expected 0 type arguments
strapi.service<MyService>('api::parity.example');
// @ts-expect-error TS2558 expected 0 type arguments
strapi.controller<MyController>('api::parity.example');
// @ts-expect-error TS2558 expected 0 type arguments
strapi.policy<Core.PolicyHandler>('global::is-owner');
// @ts-expect-error TS2558 expected 0 type arguments
strapi.plugin<'parity'>('parity');
// @ts-expect-error TS2558 expected 0 type arguments
strapi.api<'parity'>('parity');
// @ts-expect-error TS2345 not a service UID
strapi.service('parity.example');
// @ts-expect-error TS2345 not a controller UID
strapi.controller('parity.example');

// Results keep the legacy types, and annotations do not narrow them.
strapi.service('api::parity.example').anything();
strapi.controller('api::parity.example').anything satisfies Core.ControllerHandler;
// @ts-expect-error TS2741 `find` is missing in `Service`
const annotatedService: MyService = strapi.service('api::parity.example');
// @ts-expect-error TS2741 `index` is missing in `Controller`
const annotatedController: MyController = strapi.controller('api::parity.example');
// @ts-expect-error TS2322 the `{ name, handler }` form is not a handler
const annotatedHandler: Core.PolicyHandler = strapi.policy('global::is-owner');
const annotatedPolicy: Core.Policy = strapi.policy('global::is-owner');
// @ts-expect-error TS2322 a plugin is not a string
const wrongPlugin: string = strapi.plugin('parity');
// @ts-expect-error TS2322 a module is not a number
const wrongApi: number = strapi.api('parity');
const lookedUpPolicy = strapi.policy('plugin::parity.hasRole');
if (typeof lookedUpPolicy === 'function') {
  lookedUpPolicy({} as Core.PolicyContext, {}, { strapi });
} else {
  lookedUpPolicy.handler({} as Core.PolicyContext, {}, { strapi });
}

// `ReturnType` / `Parameters` of lookup members, as helpers and wrappers write them.
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
/** Mutual assignability: a suggested-name parameter accepts the same values as develop's. */
type SameValues<X, Y> = [X] extends [Y] ? ([Y] extends [X] ? true : false) : false;
type ServiceParams = Parameters<Core.Strapi['service']>;
type PluginParams = Parameters<Core.Strapi['plugin']>;
type PolicyParams = Parameters<Core.Strapi['policy']>;
type PolicyResult = ReturnType<Core.Strapi['policy']>;
declare const checks: [
  Expect<SameValues<ServiceParams, [uid: UID.Service]>>,
  Expect<SameValues<Parameters<Core.Strapi['controller']>, [uid: UID.Controller]>>,
  Expect<SameValues<PolicyParams, [name: string]>>,
  Expect<SameValues<PluginParams, [name: string]>>,
  Expect<SameValues<Parameters<Core.Strapi['api']>, [name: string]>>,
  Expect<Equal<ReturnType<Core.Strapi['service']>, Core.Service>>,
  Expect<Equal<ReturnType<Core.Strapi['controller']>, Core.Controller>>,
  Expect<Equal<PolicyResult, Core.Policy>>,
  Expect<Equal<ReturnType<Core.Strapi['plugin']>, Core.Plugin>>,
  Expect<Equal<ReturnType<Core.Strapi['api']>, Core.Module>>,
];
const getService = (...args: ServiceParams) => strapi.service(...args);
const getPlugin = (...args: PluginParams) => strapi.plugin(...args);
const getPolicy = (...args: PolicyParams): PolicyResult => strapi.policy(...args);
getService('api::parity.example').anything();
const lookup = strapi.service.bind(strapi);
lookup('api::parity.example').anything();
const pluginLookup: (name: string) => Core.Plugin = strapi.plugin;
const apiLookup: (name: string) => Core.Module = strapi.api;
const serviceLookup: (uid: `api::${string}.${string}`) => Core.Service = strapi.service;
const policyLookup: (name: string) => Core.Policy = strapi.policy;

// Maps.
const services: Record<string, Core.Service> = strapi.services;
const controllers: Record<string, Core.Controller> = strapi.controllers;
const policies: Record<string, Core.Policy> = strapi.policies;
const plugins: Record<string, Core.Plugin> = strapi.plugins;
const apis: Record<string, Core.Module> = strapi.apis;
// @ts-expect-error TS2741 `find` is missing in `Service`
const oneService: MyService = strapi.services['api::parity.example'];
const oneOptional: Partial<MyService> = strapi.services['api::parity.example'];
// @ts-expect-error TS2322 the `{ name, handler }` form is not a handler
const oneHandler: Core.PolicyHandler = strapi.policies['global::is-owner'];
const pluginEntry: Core.Plugin = strapi.plugins.parity;
const apiEntry: Core.Module = strapi.apis.parity;
const adminModule: Core.Module = strapi.admin;
strapi.services['api::parity.example'] = { find: async () => [] };
strapi.policies['api::parity.hasRole'] = (() => true) as Core.Policy;
strapi.plugins.parity = {} as Core.Plugin;
Object.keys(strapi.services).forEach((uid) => strapi.services[uid].anything());
for (const [name, value] of Object.entries(strapi.plugins)) {
  const entry: Core.Plugin = value;
  entry.service(name).anything();
}
const usePlugins = (map: Record<string, Core.Plugin>) => map;
usePlugins(strapi.plugins);

export { service, controller, policy, plugin, api, partial, picked };
export { annotatedService, annotatedController, annotatedHandler, annotatedPolicy };
export { wrongPlugin, wrongApi, checks, getPlugin, getPolicy };
export { pluginLookup, apiLookup, serviceLookup, policyLookup };
export { services, controllers, policies, plugins, apis, oneService, oneOptional, oneHandler };
export { pluginEntry, apiEntry, adminModule };
