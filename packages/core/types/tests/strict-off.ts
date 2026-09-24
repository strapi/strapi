import type { Core } from '../src';
import type { IsStrict } from '../src/core/strictness';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface DefaultServices {
        'plugin::legacy.example': { count(): number };
      }
      interface Services {
        'plugin::legacy.example': { count(): string };
      }
      interface DefaultControllers {
        'plugin::legacy.example': { list: Core.ControllerHandler };
      }
      interface Controllers {
        'plugin::legacy.example': { find: Core.ControllerHandler };
      }
      interface DefaultConfigs {
        'plugin::legacy': { enabled: boolean };
      }
      interface Configs {
        'plugin::legacy': { enabled: string };
      }
      interface DefaultPolicies {
        'plugin::legacy.hasRole': { role: string };
      }
      interface Policies {
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
];
checks satisfies unknown;

declare const strapi: Core.Strapi;
strapi.service('plugin::legacy.example').anything();
strapi.plugin('legacy').service('example').anything();

const controller = strapi.controller('plugin::legacy.example');
const pluginController = strapi.plugin('legacy').controller('example');
const config = strapi.config.get('plugin::legacy');
const pluginConfig = strapi.plugin('legacy').config('enabled');
declare const results: [
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

type Service = { custom(): string };
type Controller = { custom: Core.ControllerHandler<string> };
const service = strapi.plugin('legacy').service<Service>('example');
const explicitController = strapi.plugin('legacy').controller<Controller>('example');
service.custom() satisfies string;
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
