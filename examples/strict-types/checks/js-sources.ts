// Type checks only, run by `yarn test:ts` (see contracts.ts).
import type { Core } from '@strapi/strapi';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;

// Edge cases kept on purpose to test type generation (see the comment of each module): a JS policy
// and a JS middleware register the config their JSDoc declares, with `allowJs` in tsconfig.json.
export type Configs = [
  Core.Assert<Equal<Strapi.Registries.AppPolicies['global::has-scope'], { scope: string }>>,
  Core.Assert<
    Equal<
      Strapi.Registries.AppMiddlewares['global::response-header'],
      { name: string; value: string }
    >
  >,
];

({ name: 'global::has-scope', config: { scope: 'articles' } }) satisfies Core.PolicyReference;
// @ts-expect-error `scope` is a string in the JSDoc of the policy.
({ name: 'global::has-scope', config: { scope: 1 } }) satisfies Core.PolicyReference;

const header = { name: 'x-strict-types', value: 'on' };
({ name: 'global::response-header', config: header }) satisfies Core.MiddlewareReference;
// @ts-expect-error `value` is missing from the config of the middleware.
({ name: 'global::response-header', config: { name: 'x' } }) satisfies Core.MiddlewareReference;
