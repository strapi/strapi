import type { PluginMap, PluginOf } from '../plugin';
import type { Strapi as StrapiInstance } from '../strapi';
import type { Equal, Expect } from '../../../tests/helpers/assert';

type LabProvider = { send(): Promise<unknown> };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackagePluginProviders {
        'provider-lab': LabProvider;
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

// Plugins without an entry keep the index signature, as all their other unregistered members.
declare const unregisteredChecks: [
  Expect<Equal<PluginOf<'other'>['provider'], any>>,
  Expect<Equal<PluginOf<string>['provider'], any>>,
  Expect<Equal<typeof unregisteredProvider, any>>,
  Expect<Equal<typeof dynamicProvider, any>>,
];
unregisteredChecks satisfies unknown;
