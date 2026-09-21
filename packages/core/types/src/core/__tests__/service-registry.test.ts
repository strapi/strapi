import type { Core } from '../..';

type GreetingService = {
  greet(name: string): Promise<string>;
};

declare module '../..' {
  interface DefaultServiceRegistry {
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

  interface ServiceRegistry {
    'plugin::type-lab.greeting': GreetingService;
    'api::type-lab.greeting': GreetingService;
    'admin::type-lab': GreetingService;
  }
}

// Existing registry declarations must not opt applications into stricter lookups.
declare module '../../public/registries' {
  interface Services {
    'plugin::legacy.greeting': GreetingService;
  }
}

declare const strapi: Core.Strapi;
declare const dynamicPlugin: string;
declare const dynamicService: string;

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

strapi.service('plugin::legacy.greeting').missing();
strapi.service('plugin::unregistered.greeting').missing();
strapi.plugin('legacy').service('greeting').missing();
strapi.plugin('type-lab').service('unregistered').missing();
strapi.plugin(dynamicPlugin).service('greeting').missing();
strapi.plugin('type-lab').service(dynamicService).missing();

// Preserve explicit generic overrides and contextual inference on legacy lookups.
strapi.plugin('type-lab').service<GreetingService>('greeting').greet('Nico');
strapi.plugin('unregistered').service<GreetingService>('greeting').greet('Nico');
const contextual: GreetingService = strapi.plugin('type-lab').service('unregistered');
const contextualDynamic: GreetingService = strapi.plugin(dynamicPlugin).service('greeting');
const legacyPlugin: Core.Plugin = strapi.plugin('type-lab');
const contextualLegacy: GreetingService = legacyPlugin.service('greeting');
contextual.greet('Nico');
contextualDynamic.greet('Nico');
contextualLegacy.greet('Nico');

// Parameterizing Plugin must preserve its explicitly declared Module members.
strapi.plugin('type-lab').config<number>('limit') satisfies number;
strapi.plugin('type-lab').contentTypes satisfies Core.Module['contentTypes'];
strapi.plugin('type-lab').controller('example') satisfies Core.Controller;
strapi.log.info('typed service registry');
strapi.documents satisfies Core.Strapi['documents'];
strapi.db satisfies Core.Strapi['db'];

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
