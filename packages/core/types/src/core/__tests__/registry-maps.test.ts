import type { Controller, ControllerHandler } from '../controller';
import type { Module, RegisteredApiName } from '../module';
import type { Plugin, PluginOf, RegisteredPluginName } from '../plugin';
import type { Policy, PolicyContext } from '../policy';
import type { Service } from '../service';
import type { Strapi as StrapiInstance } from '../strapi';
import type { Equal, Expect } from '../../../tests/helpers/assert';

type LabService = { greet(name: string): Promise<string> };
type LabController = { list: ControllerHandler };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageServices {
        'plugin::map-lab.greeting': { greet(value: number): number };
        'plugin::map-lab.counter': { count(): number };
      }
      interface AppServices {
        'plugin::map-lab.greeting': LabService;
        'api::map-lab.greeting': LabService;
      }
      interface PackageControllers {
        'plugin::map-lab.items': LabController;
      }
      interface AppControllers {
        'api::map-lab.items': LabController;
      }
      interface PackagePolicies {
        'plugin::map-lab.hasRole': { role: string };
      }
      interface AppPolicies {
        'api::map-lab.hasLevel': { level: number };
      }
      interface PackageConfigs {
        'plugin::map-lab-config': { enabled: boolean };
      }
    }
  }
}

declare const strapi: StrapiInstance;
declare const dynamicKey: string;
declare const ctx: PolicyContext;

// Registered UIDs resolve to their contracts, with application overrides first.
const service = strapi.services['plugin::map-lab.greeting'];
const counter = strapi.services['plugin::map-lab.counter'];
const apiService = strapi.services['api::map-lab.greeting'];
const controller = strapi.controllers['plugin::map-lab.items'];
const apiController = strapi.controllers['api::map-lab.items'];
const policy = strapi.policies['plugin::map-lab.hasRole'];
const apiPolicy = strapi.policies['api::map-lab.hasLevel'];

// Plugin and API maps are keyed by name and resolve the same contracts.
const plugin = strapi.plugin('map-lab');
const pluginService = plugin.services.greeting;
const pluginController = plugin.controllers.items;
const pluginPolicy = plugin.policies.hasRole;
const mappedPluginService = strapi.plugins['map-lab'].services.greeting;
const apiModuleService = strapi.api('map-lab').services.greeting;
const mappedApiController = strapi.apis['map-lab'].controllers.items;
const mappedApiPolicy = strapi.apis['map-lab'].policies.hasLevel;
const configOnlyPlugin = strapi.plugins['map-lab-config'];

declare const registered: [
  Expect<Equal<typeof service, LabService>>,
  Expect<Equal<typeof counter, { count(): number }>>,
  Expect<Equal<typeof apiService, LabService>>,
  Expect<Equal<typeof controller, LabController>>,
  Expect<Equal<typeof apiController, LabController>>,
  Expect<Equal<typeof policy, Policy<{ role: string }>>>,
  Expect<Equal<typeof apiPolicy, Policy<{ level: number }>>>,
  Expect<Equal<typeof pluginService, LabService>>,
  Expect<Equal<typeof pluginController, LabController>>,
  Expect<Equal<typeof pluginPolicy, Policy<{ role: string }>>>,
  Expect<Equal<typeof mappedPluginService, LabService>>,
  Expect<Equal<typeof apiModuleService, LabService>>,
  Expect<Equal<typeof mappedApiController, LabController>>,
  Expect<Equal<typeof mappedApiPolicy, Policy<{ level: number }>>>,
  Expect<Equal<typeof configOnlyPlugin, PluginOf<'map-lab-config'>>>,
];
registered satisfies unknown;

// Registered plugin and API names are bare names, derived from every registry.
declare const names: [
  Expect<
    Equal<Extract<RegisteredPluginName, 'map-lab' | 'map-lab-config'>, 'map-lab' | 'map-lab-config'>
  >,
  Expect<
    Equal<Extract<RegisteredPluginName, `${string}::${string}` | `${string}.${string}`>, never>
  >,
  Expect<Equal<Extract<RegisteredApiName, 'map-lab'>, 'map-lab'>>,
  Expect<Equal<Extract<RegisteredApiName, `${string}::${string}` | `${string}.${string}`>, never>>,
];
names satisfies unknown;

// @ts-expect-error Registered contracts reject incorrect method arguments.
strapi.services['plugin::map-lab.greeting'].greet(123);
// @ts-expect-error Registered contracts reject nonexistent members.
strapi.plugin('map-lab').services.greeting.missing();
// @ts-expect-error Registered controllers reject nonexistent actions.
strapi.plugins['map-lab'].controllers.items.missing satisfies unknown;
if (typeof policy === 'function') {
  // @ts-expect-error Registered policies receive their config contract.
  policy(ctx, { role: 1 }, { strapi });
}

// Unregistered service keys, literal or dynamic, resolve to `unknown`, like `strapi.service(uid)`:
// they have no contract. Other unregistered keys keep the legacy types: an index signature cannot
// close literal keys while keeping dynamic keys open, unlike the singular lookups. The raw admin
// services keep the legacy service: `strapi.admin` is not built from the registries.
const unregisteredService = strapi.services['plugin::map-lab.unregistered'];
const dynamicService = strapi.services[dynamicKey];
const dynamicController = strapi.controllers[dynamicKey];
const dynamicPolicy = strapi.policies[dynamicKey];
const unregisteredPluginService = strapi.plugin('map-lab').services.unregistered;
const dynamicPluginService = strapi.plugin('map-lab').services[dynamicKey];
const unregisteredApiService = strapi.api('map-lab').services.unregistered;
const adminService = strapi.admin.services.unregistered;
const adminServices = strapi.admin.services;
const unregisteredPlugin = strapi.plugins['map-lab-unregistered'];
const dynamicPlugin = strapi.plugins[dynamicKey];
const dynamicPluginServices = strapi.plugin(dynamicKey).services;
const unregisteredApi = strapi.apis['map-lab-unregistered'];
const dynamicApi = strapi.api(dynamicKey);
declare const open: [
  Expect<Equal<typeof unregisteredService, unknown>>,
  Expect<Equal<typeof dynamicService, unknown>>,
  Expect<Equal<typeof dynamicController, Controller>>,
  Expect<Equal<typeof dynamicPolicy, Policy>>,
  Expect<Equal<typeof unregisteredPluginService, unknown>>,
  Expect<Equal<typeof dynamicPluginService, unknown>>,
  Expect<Equal<typeof unregisteredApiService, unknown>>,
  Expect<Equal<typeof adminService, Service>>,
  Expect<Equal<typeof adminServices, Record<string, Service>>>,
  Expect<Equal<(typeof strapi.admin)['controllers'], Record<string, Controller>>>,
  Expect<Equal<(typeof strapi.admin)['config'], Record<string, unknown>>>,
  Expect<Equal<typeof unregisteredPlugin, Plugin>>,
  Expect<Equal<typeof dynamicPlugin, Plugin>>,
  Expect<Equal<typeof dynamicPluginServices, Readonly<Record<string, unknown>>>>,
  Expect<Equal<typeof unregisteredApi, Module>>,
  Expect<Equal<(typeof dynamicApi)['services'], Readonly<Record<string, unknown>>>>,
];
open satisfies unknown;

// The maps stay iterable, and read-only: they are built on each read, so a write would be lost.
// Service maps are no longer assignable to the legacy record: unregistered keys are `unknown`.
// @ts-expect-error Unregistered services are not legacy services.
const legacyServices: Record<string, Service> = strapi.services;
const legacyControllers: Record<string, Controller> = strapi.controllers;
const legacyPolicies: Record<string, Policy> = strapi.policies;
const legacyPlugins: Record<string, Plugin> = strapi.plugins;
const legacyApis: Record<string, Module> = strapi.apis;
// @ts-expect-error Unregistered plugin services are not legacy services.
const legacyPluginServices: Record<string, Service> = strapi.plugin('map-lab').services;
const services: Record<string, unknown> = strapi.services;
const pluginServices: Record<string, unknown> = strapi.plugin('map-lab').services;
[legacyServices, legacyControllers, legacyPolicies, legacyPlugins, legacyApis] satisfies unknown[];
[legacyPluginServices, services, pluginServices] satisfies unknown[];
for (const [uid, entry] of Object.entries(strapi.services)) {
  uid satisfies string;
  // Iterated values are `unknown`; narrow before using members.
  const iterated: Expect<Equal<typeof entry, unknown>> = true;
  iterated satisfies unknown;
}
Object.keys(strapi.plugin('map-lab').services) satisfies string[];
// @ts-expect-error The map is read-only: register services through the registry.
strapi.services[dynamicKey] = { anything: () => undefined };
// @ts-expect-error Even a write matching the registered contract.
strapi.services['plugin::map-lab.greeting'] = { greet: async (name: string) => name };
