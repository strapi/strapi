import type { PluginMap, PluginOf } from '../plugin';
import type { Strapi as StrapiInstance } from '../strapi';
import type { Equal, Expect } from '../../../tests/helpers/assert';

type LabProvider = { send(): Promise<unknown> };
type OutboxProvider = LabProvider & { outboxPath(): string };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackagePluginProviders {
        'provider-lab': LabProvider;
        'provider-lab-app': LabProvider;
      }
      interface AppPluginProviders {
        'provider-lab-app': OutboxProvider;
        'provider-lab-app-only': OutboxProvider;
      }
      // `strapi.plugins` lists plugins with a registered service, controller, policy, middleware or
      // config contract, as upload and email have.
      interface PackageServices {
        'plugin::provider-lab.mailer': { ping(): void };
      }
    }
  }
}

declare const strapi: StrapiInstance;
declare const dynamicKey: string;

const provider = strapi.plugin('provider-lab').provider;
const mappedProvider = strapi.plugins['provider-lab'].provider;
const unregisteredProvider = strapi.plugin('provider-lab-unregistered').provider;
const dynamicProvider = strapi.plugin(dynamicKey).provider;

// The provider a package registers for its plugin types `provider`, through `plugin(name)` and
// `strapi.plugins`.
declare const registeredChecks: [
  Expect<Equal<PluginOf<'provider-lab'>['provider'], LabProvider>>,
  Expect<Equal<PluginMap['provider-lab']['provider'], LabProvider>>,
  Expect<Equal<typeof provider, LabProvider>>,
  Expect<Equal<typeof mappedProvider, LabProvider>>,
];
registeredChecks satisfies unknown;

const appProvider = strapi.plugin('provider-lab-app').provider;
const appOnlyProvider = strapi.plugin('provider-lab-app-only').provider;

// An application entry replaces the package entry, so a custom provider's own members are typed.
declare const applicationChecks: [
  Expect<Equal<PluginOf<'provider-lab-app'>['provider'], OutboxProvider>>,
  Expect<Equal<typeof appProvider, OutboxProvider>>,
  Expect<Equal<typeof appOnlyProvider, OutboxProvider>>,
];
applicationChecks satisfies unknown;
appProvider.outboxPath() satisfies string;

// Plugins without an entry keep the index signature, as all their other unregistered members.
declare const unregisteredChecks: [
  Expect<Equal<PluginOf<'other'>['provider'], any>>,
  Expect<Equal<PluginOf<string>['provider'], any>>,
  Expect<Equal<typeof unregisteredProvider, any>>,
  Expect<Equal<typeof dynamicProvider, any>>,
];
unregisteredChecks satisfies unknown;
