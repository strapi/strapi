import type { Core } from '../../src';
import type { Equal, Expect } from './helpers';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackagePluginProviders {
        'legacy-provider': { send(): Promise<unknown> };
      }
      interface AppPluginProviders {
        'legacy-provider': { send(): Promise<unknown>; outboxPath(): string };
      }
    }
  }
}

declare const providerStrapi: Core.Strapi;

// Without strict types, `provider` stays the index signature's `any`, as on develop, even for
// registered providers.
const legacyProvider = providerStrapi.plugin('upload').provider;
const registeredProvider = providerStrapi.plugin('legacy-provider').provider;
declare const providerChecks: [
  Expect<Equal<Core.Plugin['provider'], any>>,
  Expect<Equal<Core.PluginOf<'upload'>['provider'], any>>,
  Expect<Equal<typeof legacyProvider, any>>,
  Expect<Equal<typeof registeredProvider, any>>,
];
providerChecks satisfies unknown;
