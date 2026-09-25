import type { Core } from '../src';
import type { IsStrict } from '../src/core/strictness';

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
      }
      interface PackageControllers {
        'plugin::legacy.example': { list: Core.ControllerHandler };
      }
      interface AppControllers {
        'plugin::legacy.example': { find: Core.ControllerHandler };
      }
      interface PackageConfigs {
        'plugin::legacy': { enabled: boolean };
      }
      interface AppConfigs {
        'plugin::legacy': { enabled: string };
      }
      interface PackagePolicies {
        'plugin::legacy.hasRole': { role: string };
      }
      interface AppPolicies {
        'plugin::legacy.hasRole': { roles: string[] };
      }
    }
  }
}

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
declare const checks: [
  Expect<Equal<IsStrict, false>>,
  Expect<Equal<Core.ServiceFor<'plugin::legacy.example'>, Core.Service>>,
  Expect<Equal<Core.ControllerFor<'plugin::legacy.example'>, Core.Controller>>,
  Expect<Equal<Core.PolicyReference, string | { name: string; config: unknown }>>,
  // Unregistered literal names keep the legacy types: only strict types close them to `never`.
  Expect<Equal<Core.ServiceFor<'plugin::unregistered.example'>, Core.Service>>,
  Expect<Equal<Core.ControllerFor<'plugin::unregistered.example'>, Core.Controller>>,
];
checks satisfies unknown;

declare const strapi: Core.Strapi;
strapi.service('plugin::legacy.example').anything();
strapi.plugin('legacy').service('example').anything();

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
// Full UID lookups accept the explicit generic too; without it they keep the legacy types.
strapi.service<Service>('plugin::unregistered.example').custom() satisfies string;
strapi.controller<Controller>('plugin::unregistered.example')
  .custom satisfies Core.ControllerHandler<string>;
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
