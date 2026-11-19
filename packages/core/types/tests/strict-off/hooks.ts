import type { Core } from '../../src';
import type { Equal, Expect } from './helpers';

// Hooks keep develop's types, even for the hooks registered by `@strapi/types`.
declare const hookStrapi: Core.Strapi;
const hook = hookStrapi.hook('strapi::content-types.beforeSync');
const hooksRegistry = hookStrapi.get('hooks');
declare const hookChecks: [
  Expect<Equal<Core.Strapi['hooks'], Record<string, any>>>,
  Expect<Equal<Core.Strapi['hook'], (name: string) => any>>,
  Expect<Equal<Core.Strapi['get'], Core.Container['get']>>,
  Expect<Equal<typeof hook, any>>,
  Expect<Equal<typeof hooksRegistry, any>>,
];
hookChecks satisfies unknown;
