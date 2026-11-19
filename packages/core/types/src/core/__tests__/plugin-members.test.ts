import type { PluginMap, PluginOf } from '../plugin';
import type { Strapi as StrapiInstance } from '../strapi';
import type { Equal, Expect } from '../../../tests/helpers/assert';

declare const strapi: StrapiInstance;
declare const dynamicName: string;

const undeclared = strapi.plugin('other').anything;
const mappedUndeclared = strapi.plugins.other.anything;
const dynamicUndeclared = strapi.plugin(dynamicName).anything;

// A plugin object has only the members `Module` declares, plus `provider` when a plugin sets one:
// any other key reads `undefined` at runtime, so it is `unknown`, not `any`.
declare const catchAllChecks: [
  Expect<Equal<PluginOf<'other'>['anything'], unknown>>,
  Expect<Equal<PluginMap['other']['anything'], unknown>>,
  Expect<Equal<typeof undeclared, unknown>>,
  Expect<Equal<typeof mappedUndeclared, unknown>>,
  Expect<Equal<typeof dynamicUndeclared, unknown>>,
];
catchAllChecks satisfies unknown;
