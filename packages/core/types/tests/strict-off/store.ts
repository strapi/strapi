import type { Core, Modules } from '../../src';
import type { Equal, Expect } from './helpers';

// The core store keeps develop's types, even for registered keys.
declare const storeStrapi: Core.Strapi;
const storeRead = storeStrapi.store.get({ type: 'plugin', name: 'legacy', key: 'settings' });
declare const storeChecks: [
  Expect<Equal<Core.Strapi['store'], Modules.CoreStore.CoreStore>>,
  Expect<Equal<typeof storeRead, Promise<unknown>>>,
];
storeChecks satisfies unknown;
storeStrapi.store.set({ type: 'plugin', name: 'legacy', key: 'settings', value: 'any' });

// Optional, union, and `undefined` selectors keep develop's types too.
declare const storeOptionalType: { key: 'settings'; type?: 'plugin' };
declare const storeUnionType: 'core' | 'plugin';
const storeOptionalRead = storeStrapi.store.get(storeOptionalType);
const storeUnionRead = storeStrapi.store.get({ key: 'settings', type: storeUnionType });
const storeBoundRead = storeStrapi.store({ type: 'plugin' }).get(storeOptionalType);
const storeUndefinedRead = storeStrapi.store.get({ key: 'settings', type: undefined });
declare const storeSelectorChecks: [
  Expect<Equal<typeof storeOptionalRead, Promise<unknown>>>,
  Expect<Equal<typeof storeUnionRead, Promise<unknown>>>,
  Expect<Equal<typeof storeBoundRead, Promise<unknown>>>,
  Expect<Equal<typeof storeUndefinedRead, Promise<unknown>>>,
];
storeSelectorChecks satisfies unknown;
storeStrapi.store.set({ ...storeOptionalType, value: 1 });
storeStrapi.store.set({ key: 'settings', type: storeUnionType, value: 'any' });
storeStrapi.store({ type: 'plugin' }).set({ ...storeOptionalType, value: { any: true } });
