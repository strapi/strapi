// Strict mode with a generated `policies.d.ts`, written by the consumer test from `app/src`.
import type { Core } from '@strapi/strapi';

declare const app: Core.Strapi;

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
/** `true` only for `unknown`: `any` and every other type give `false`. */
declare function exactlyUnknown<T>(
  value: T
): [unknown] extends [T] ? (0 extends 1 & T ? false : true) : false;
type Config<TUID extends keyof Strapi.Registries.AppPolicies> = Strapi.Registries.AppPolicies[TUID];

// The registered value is the config contract: the handler's second parameter, for both forms.
true satisfies Equals<Config<'global::isOwner'>, { field: string }>;
true satisfies Equals<Config<'api::article.has-role'>, { roles: string[] }>;
// No config parameter takes no config; an untyped JS policy accepts any config.
true satisfies Equals<Config<'global::isPublic'>, undefined>;
declare const legacy: Config<'global::legacy'>;
exactlyUnknown(legacy) satisfies true;

// Lookups receive the config contract.
const isOwner = app.policy('global::isOwner');
isOwner satisfies Core.Policy<{ field: string }>;
// @ts-expect-error The registered policy does not take another config.
isOwner satisfies Core.Policy<{ other: number }>;
app.policies['api::article.has-role'] satisfies Core.Policy<{ roles: string[] }>;

type Controllers = { article: { find: Core.ControllerHandler } };

({
  type: 'content-api',
  routes: [
    {
      method: 'GET',
      path: '/articles',
      handler: 'article.find',
      config: {
        policies: [
          { name: 'global::isOwner', config: { field: 'author' } },
          'global::isPublic',
          'global::legacy',
          { name: 'global::legacy', config: { anything: true } },
          { name: 'has-role', config: { roles: ['editor'] } },
          { name: 'api::article.has-role', config: { roles: ['editor'] } },
          // Bundled package policies stay accepted next to application policies.
          'admin::isAuthenticatedAdmin',
        ],
      },
    },
  ],
}) satisfies Core.RouterInputFor<Controllers, 'api::article'>;

({
  // @ts-expect-error A required config cannot be left out.
  policies: ['global::isOwner'],
}) satisfies Core.RouteConfigFor<'api::article'>;
({
  // @ts-expect-error The config is checked against the handler's second parameter.
  policies: [{ name: 'global::isOwner', config: { field: 1 } }],
}) satisfies Core.RouteConfigFor<'api::article'>;
({
  // @ts-expect-error The `{ handler, validator }` form is checked the same way.
  policies: [{ name: 'api::article.has-role', config: { role: 'editor' } }],
}) satisfies Core.RouteConfigFor<'api::article'>;
({
  // @ts-expect-error Unknown policies are rejected.
  policies: ['global::isMissing'],
}) satisfies Core.RouteConfigFor<'api::article'>;
