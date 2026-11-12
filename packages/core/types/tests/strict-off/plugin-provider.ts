import type { Core } from '../../src';
import type { Equal, Expect } from './helpers';

declare const providerStrapi: Core.Strapi;

// Without strict types, `provider` stays the index signature's `any`, as on develop.
const legacyProvider = providerStrapi.plugin('upload').provider;
declare const providerChecks: [
  Expect<Equal<Core.Plugin['provider'], any>>,
  Expect<Equal<Core.PluginOf<'upload'>['provider'], any>>,
  Expect<Equal<typeof legacyProvider, any>>,
];
providerChecks satisfies unknown;
