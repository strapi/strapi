import type * as PublicRegistries from '../../public/registries';
import type { Controller } from '../controller';
import type { Module } from '../module';
import type { Plugin } from '../plugin';
import type { ServiceFor } from '../service';
import type { Strapi as StrapiInstance } from '../strapi';

// @ts-expect-error Service contract registries are global, not part of the Public registries.
type BarrelRegistry = PublicRegistries.PackageServices;
declare const barrelRegistry: BarrelRegistry;
barrelRegistry satisfies unknown;

type GreetingService = {
  greet(name: string): Promise<string>;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageServices {
        'plugin::type-lab.greeting': {
          greet(value: number): number;
          defaultOnly(): void;
        };
        'plugin::type-lab.counter': {
          count(): number;
        };
        'api::type-lab.greeting': { greet(value: number): number };
        'admin::type-lab': { greet(value: number): number };
      }

      interface AppServices {
        'plugin::type-lab.greeting': GreetingService;
        'api::type-lab.greeting': GreetingService;
        'admin::type-lab': GreetingService;
      }
    }
  }
}

// Existing registry declarations must not opt applications into stricter lookups.
declare module '../../public/registries' {
  interface Services {
    'plugin::legacy.greeting': GreetingService;
  }
}

declare const strapi: StrapiInstance;
declare const dynamicPlugin: string;
declare const dynamicService: string;
declare const patternServiceName: `greeting-${string}`;
declare const wideService: ServiceFor<string>;
declare const patternService: ServiceFor<`plugin::${string}.greeting`>;

strapi.service('api::type-lab.greeting').greet('Nico') satisfies Promise<string>;
strapi.service('admin::type-lab').greet('Nico') satisfies Promise<string>;
strapi.service('plugin::type-lab.greeting').greet('Nico') satisfies Promise<string>;
strapi.plugin('type-lab').service('greeting').greet('Nico') satisfies Promise<string>;

// @ts-expect-error Registered contracts reject incorrect method arguments.
strapi.service('plugin::type-lab.greeting').greet(123);
// @ts-expect-error Registered contracts reject nonexistent members.
strapi.service('api::type-lab.greeting').missing();
// @ts-expect-error Plugin lookups preserve the registered method arguments.
strapi.plugin('type-lab').service('greeting').greet(123);
// @ts-expect-error Plugin lookups preserve the registered return type.
strapi.plugin('type-lab').service('greeting').greet('Nico') satisfies Promise<number>;
// @ts-expect-error Plugin lookups do not inherit the permissive service index signature.
strapi.plugin('type-lab').service('greeting').missing();

// Unregistered literal names resolve to `never`, including names only declared in `Public.Services`.
strapi.service('plugin::legacy.greeting') satisfies never;
strapi.service('plugin::unregistered.greeting') satisfies never;
strapi.service('api::unregistered.greeting') satisfies never;
strapi.plugin('legacy').service('greeting') satisfies never;
strapi.plugin('type-lab').service('unregistered') satisfies never;
// @ts-expect-error Unregistered literal names expose no members.
strapi.service('plugin::unregistered.greeting').missing();
// @ts-expect-error Plugin-scoped unregistered literal names expose no members.
strapi.plugin('type-lab').service('unregistered').missing();

// Dynamic names cannot be validated and keep the permissive service.
wideService.missing();
patternService.missing();
strapi.plugin(dynamicPlugin).service('greeting').missing();
strapi.plugin('type-lab').service(dynamicService).missing();
strapi.plugin('type-lab').service(patternServiceName).missing();

// Preserve explicit generic overrides and contextual inference on permissive lookups.
strapi.plugin('type-lab').service<GreetingService>('greeting').greet('Nico');
strapi.plugin('unregistered').service<GreetingService>('greeting').greet('Nico');
strapi.plugin('type-lab').service<GreetingService>('unregistered').greet('Nico');
const contextual: GreetingService = strapi.plugin('type-lab').service(dynamicService);
const contextualDynamic: GreetingService = strapi.plugin(dynamicPlugin).service('greeting');
const legacyPlugin: Plugin = strapi.plugin('type-lab');
const contextualLegacy: GreetingService = legacyPlugin.service('greeting');
contextual.greet('Nico');
// Generic helpers that forward a service name keep inferring from their declared return type.
type LabServices = { greeting: GreetingService; unregistered: GreetingService };
const getUnregisteredService = <TName extends keyof LabServices>(name: TName): LabServices[TName] =>
  strapi.plugin('unregistered').service(name);
const getRegisteredService = <TName extends keyof LabServices>(name: TName): LabServices[TName] =>
  strapi.plugin('type-lab').service(name);
getUnregisteredService('greeting').greet('Nico') satisfies Promise<string>;
getRegisteredService('unregistered').greet('Nico') satisfies Promise<string>;

// A conditional return type needs the explicit generic when the plugin has registered services:
// the lookup cannot resolve until the name is known.
type LabServiceFactories = { greeting: () => GreetingService };
type LabServiceInstance<TName extends keyof LabServiceFactories> = ReturnType<
  LabServiceFactories[TName]
>;
const getRegisteredFactoryService = <TName extends keyof LabServiceFactories>(
  name: TName
): LabServiceInstance<TName> => strapi.plugin('type-lab').service<LabServiceInstance<TName>>(name);
const getRegisteredFactoryServiceInferred = <TName extends keyof LabServiceFactories>(
  name: TName
): LabServiceInstance<TName> =>
  // @ts-expect-error Without the explicit generic, the deferred lookup is not assignable.
  strapi.plugin('type-lab').service(name);
getRegisteredFactoryService('greeting').greet('Nico') satisfies Promise<string>;
getRegisteredFactoryServiceInferred('greeting').greet('Nico') satisfies Promise<string>;
// @ts-expect-error Assigned functions are checked against the generic signature, as before registries.
legacyPlugin.service = () => ({ greet: () => 'Nico' });
contextualDynamic.greet('Nico');
contextualLegacy.greet('Nico');

// Parameterizing Plugin must preserve its explicitly declared Module members.
strapi.plugin('type-lab').config<number>('limit') satisfies number;
strapi.plugin('type-lab').contentTypes satisfies Module['contentTypes'];
strapi.plugin('type-lab').controller<Controller>('example') satisfies Controller;
strapi.log.info('typed service registry');
strapi.documents satisfies StrapiInstance['documents'];
strapi.db satisfies StrapiInstance['db'];

// Defaults are available when the application has not supplied an override.
strapi.service('plugin::type-lab.counter').count() satisfies number;
strapi.plugin('type-lab').service('counter').count() satisfies number;
// @ts-expect-error Default contracts reject nonexistent methods.
strapi.plugin('type-lab').service('counter').missing();
// @ts-expect-error Default return types are checked through full UID lookup.
strapi.service('plugin::type-lab.counter').count() satisfies string;

// An override replaces the default contract rather than intersecting signatures.
// The existing greeting checks above establish the application's string signature.
// @ts-expect-error Methods from the replaced default are not retained.
strapi.service('plugin::type-lab.greeting').defaultOnly();
// @ts-expect-error Plugin-scoped lookup also drops the replaced default methods.
strapi.plugin('type-lab').service('greeting').defaultOnly();

// Separate declarations merge into one registry: every augmentation contributes its keys.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackageServices {
        'plugin::type-lab-other.counter': { total(): number };
      }
    }
  }
}
strapi.service('plugin::type-lab-other.counter').total() satisfies number;
strapi.service('plugin::type-lab.counter').count() satisfies number;
// @ts-expect-error Merged defaults stay strict.
strapi.service('plugin::type-lab-other.counter').missing();

// The global `strapi` instance resolves through the same registries.
globalThis.strapi.service('plugin::type-lab.greeting').greet('Nico') satisfies Promise<string>;
