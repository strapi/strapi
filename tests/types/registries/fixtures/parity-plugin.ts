// Strict-off parity: `Core.Plugin` (`strapi.plugin(name)`, `strapi.plugins`) as develop apps use it.
// Compiled against develop too, so every expected error below is one develop reports.
import type { Core } from '@strapi/strapi';

declare const strapi: Core.Strapi;
declare const anyFn: (...args: any[]) => any; // `jest.fn()`-like
const find = async () => [] as unknown[];
type MyService = { find(): Promise<string[]> };
type MyController = { index: Core.ControllerHandler };

// Mocks.
const pluginMock = { service: () => ({ find }), controller: () => ({}) } as unknown as Core.Plugin;
pluginMock.service = anyFn;
pluginMock.controller = anyFn;
pluginMock.config = anyFn;
pluginMock.policy = anyFn;
const handWritten: Core.Plugin = {
  ...({} as Core.Module),
  routes: [],
  extra: 1,
};

// Lookups take one type argument, and annotations infer it.
const fromPlugin = strapi.plugin('parity').service<MyService>('example');
const fromPluginController = strapi.plugin('parity').controller<MyController>('example');
// @ts-expect-error TS2558 expected 1 type argument
strapi.plugin('parity').service<MyService, 'example'>('example');
// @ts-expect-error TS2558 expected 1 type argument
strapi.plugin('parity').controller<MyController, 'example'>('example');
// @ts-expect-error TS2344 a string is not a service
strapi.plugin('parity').service<string>('example');
const annotatedService: MyService = strapi.plugin('parity').service('example');
const annotatedController: MyController = strapi.plugin('parity').controller('example');

// Results and maps keep the legacy types. Members outside `Module`, such as `policy`, are `any`.
const plugin = strapi.plugin('parity');
plugin.service('example').anything();
plugin.controller('example').anything satisfies Core.ControllerHandler;
plugin.services.example.anything();
plugin.controllers.example.anything satisfies Core.ControllerHandler;
plugin.policies.hasRole satisfies Core.Policy;
plugin.policy('is-owner');
plugin.routes satisfies Core.Route[] | Record<string, Core.Router>;
plugin.customField.whatever();
plugin.contentTypes.thing.schema satisfies unknown;
strapi.plugins.parity.service('example').anything();
strapi.plugins['users-permissions'].services.user.anything();
strapi.plugin('i18n').service('locales').anything();
strapi.plugin('unknown-plugin').service('x').anything();
const name: string = 'dynamic';
strapi.plugin(name).service(name).anything();

// `config` defaults widen their literal; without default, `unknown`; `T` and annotations win.
let limit = strapi.plugin('parity').config('limit', 10);
limit = 20;
let pluginFlag = strapi.plugin('parity').config('enabled', false);
pluginFlag = true;
let sentryDsn = strapi.plugin('sentry').config('dsn', '');
sentryDsn = 'https://example.com';
[limit, pluginFlag, sentryDsn] satisfies [number, boolean, string];
const pluginRaw = strapi.plugin('parity').config('limit');
// @ts-expect-error TS18046 `unknown`
pluginRaw.toFixed();
const annotatedConfig: boolean = strapi.plugin('parity').config('enabled');
const typedConfig = strapi.plugin('parity').config<{ nested: string }>('object');
typedConfig.nested.toUpperCase();
const byArray = strapi.plugin('parity').config(['init', 'dsn'], '');
// @ts-expect-error TS2345 the default must match `T`
strapi.plugin('parity').config<number>('limit', 'x');

// Plugins as parameters.
const usePlugin = (entry: Core.Plugin) => entry.service('x');
usePlugin(strapi.plugin('parity'));
usePlugin(strapi.plugins.parity);
// @ts-expect-error TS2345 plugin routes may be an array
((entry: Core.Module) => entry)(strapi.plugin('parity'));

// `ReturnType` / `Parameters` of plugin members.
type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
type PluginConfigParams = Parameters<Core.Plugin['config']>;
declare const checks: [
  Expect<Equal<Parameters<Core.Plugin['service']>, [name: string]>>,
  Expect<Equal<Parameters<Core.Plugin['controller']>, [name: string]>>,
  Expect<Equal<ReturnType<Core.Plugin['service']>, Core.Service>>,
  Expect<Equal<Core.Plugin['config'], Core.Module['config']>>,
  Expect<Equal<Core.Plugin['policy'], any>>,
];
const getPluginConfig = (...args: PluginConfigParams) => strapi.plugin('parity').config(...args);

export { pluginMock, handWritten, fromPlugin, fromPluginController };
export { annotatedService, annotatedController };
export { annotatedConfig, byArray, checks, getPluginConfig };
