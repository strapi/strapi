import type { ControllerHandler } from '../controller';
import type { Plugin } from '../plugin';
import type { Policy, PolicyHandler } from '../policy';
import type { RouteConfigFor, RouteInput } from '../route';
import type { RouterInputFor } from '../router';
import type { Strapi as StrapiInstance } from '../strapi';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackagePolicies {
        'plugin::policy-lab.isAuthenticated': undefined;
        'plugin::policy-lab.hasRole': { role: string };
        'plugin::policy-lab.hasLevel': { level?: number } | undefined;
        'api::policy-lab.hasRole': { apiRole: string };
        'admin::policyLab': undefined;
        'global::policyLab': undefined;
        policyLabCollision: { exact: true };
        'plugin::policy-lab.policyLabCollision': { relative: true };
      }

      interface AppPolicies {
        'plugin::policy-lab.hasRole': { roles: string[] };
      }
    }
  }
}

const controllers = { items: {} as { list: ControllerHandler } } as const;

type LabRouter = RouterInputFor<typeof controllers>;

// Registered policies are accepted, by name when their config is optional.
({
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/items',
      handler: 'items.list',
      config: {
        policies: [
          'plugin::policy-lab.isAuthenticated',
          'plugin::policy-lab.hasLevel',
          { name: 'plugin::policy-lab.hasLevel', config: { level: 1 } },
          { name: 'plugin::policy-lab.hasRole', config: { roles: ['editor'] } },
        ],
      },
    },
  ],
}) satisfies LabRouter;

({
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/items',
      handler: 'items.list',
      // @ts-expect-error A policy whose config is required cannot be referenced by name alone.
      config: { policies: ['plugin::policy-lab.hasRole'] },
    },
  ],
}) satisfies LabRouter;

({
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/items',
      handler: 'items.list',
      config: {
        // @ts-expect-error The application override replaces the default config contract.
        policies: [{ name: 'plugin::policy-lab.hasRole', config: { role: 'editor' } }],
      },
    },
  ],
}) satisfies LabRouter;

({
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/items',
      handler: 'items.list',
      // @ts-expect-error Once any policy is registered, unregistered policies are rejected.
      config: { policies: ['plugin::unregistered.isOwner'] },
    },
  ],
}) satisfies LabRouter;

// Untyped route configs keep accepting any policy reference.
({
  method: 'GET',
  path: '/items',
  handler: 'items.list',
  config: { policies: ['plugin::unregistered.isOwner', { name: 'anything', config: {} }] },
}) satisfies RouteInput;

// The namespace used for handlers also resolves local policy names.
({
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/items',
      handler: 'items.list',
      config: {
        policies: [
          'isAuthenticated',
          'hasLevel',
          { name: 'hasRole', config: { roles: ['editor'] } },
          { name: 'plugin::policy-lab.hasRole', config: { roles: ['editor'] } },
          'admin::policyLab',
          'global::policyLab',
        ],
      },
    },
  ],
}) satisfies RouterInputFor<typeof controllers, 'plugin::policy-lab'>;

({
  policies: [{ name: 'hasRole', config: { apiRole: 'author' } }],
}) satisfies RouteConfigFor<'api::policy-lab'>;

({
  // @ts-expect-error Local references retain required config checks.
  policies: ['hasRole'],
}) satisfies RouteConfigFor<'plugin::policy-lab'>;
({
  // @ts-expect-error Local references use application overrides too.
  policies: [{ name: 'hasRole', config: { role: 'editor' } }],
}) satisfies RouteConfigFor<'plugin::policy-lab'>;
({
  // @ts-expect-error Local references use their own namespace's contract.
  policies: [{ name: 'hasRole', config: { apiRole: 'author' } }],
}) satisfies RouteConfigFor<'plugin::policy-lab'>;
({
  // @ts-expect-error A local policy typo cannot bypass the registered inventory.
  policies: ['isAuthenticted'],
}) satisfies RouteConfigFor<'plugin::policy-lab'>;
({
  // @ts-expect-error Local policies need the namespace that runtime uses to resolve them.
  policies: ['isAuthenticated'],
}) satisfies RouteConfigFor;
({
  // @ts-expect-error Runtime does not resolve relative admin policies.
  policies: ['policyLab'],
}) satisfies RouteConfigFor<'admin::'>;
({
  // @ts-expect-error Runtime does not resolve relative global policies.
  policies: ['policyLab'],
}) satisfies RouteConfigFor<'global::'>;

// An exact registered name wins over a matching relative name at runtime.
({
  policies: [
    { name: 'policyLabCollision', config: { exact: true } },
    { name: 'plugin::policy-lab.policyLabCollision', config: { relative: true } },
  ],
}) satisfies RouteConfigFor<'plugin::policy-lab'>;
({
  // @ts-expect-error An alias cannot supply the config of a shadowed relative policy.
  policies: [{ name: 'policyLabCollision', config: { relative: true } }],
}) satisfies RouteConfigFor<'plugin::policy-lab'>;

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

declare const strapi: StrapiInstance;
declare const dynamicName: string;
declare const patternName: `plugin::policy-lab.${string}`;
type LabPolicy = PolicyHandler<{ custom: true }>;

// Policy lookups resolve registered names to a policy that receives their config contract,
// like `strapi.policies`. `strapi.policy` takes full names, plugin lookups relative names.
const hasRole = strapi.policy('plugin::policy-lab.hasRole');
const adminPolicy = strapi.policy('admin::policyLab');
const pluginHasRole = strapi.plugin('policy-lab').policy('hasRole');
const pluginHasLevel = strapi.plugin('policy-lab').policy('hasLevel');
// Unregistered literal names, relative names in `strapi.policy`, and dynamic names resolve to `unknown`.
const unregistered = strapi.policy('global::unregistered');
const relative = strapi.policy('hasRole');
const dynamic = strapi.policy(dynamicName);
const pattern = strapi.policy(patternName);
const pluginUnregistered = strapi.plugin('policy-lab').policy('unregistered');
const pluginFullName = strapi.plugin('policy-lab').policy('plugin::policy-lab.hasRole');
const pluginDynamic = strapi.plugin('policy-lab').policy(dynamicName);
const dynamicPlugin = strapi.plugin(dynamicName).policy('hasRole');
const unregisteredPlugin = strapi.plugin('unregistered').policy('hasRole');
const legacyPlugin: Plugin = strapi.plugin('policy-lab');
const legacyPluginPolicy = legacyPlugin.policy('hasRole');
// An explicit type argument wins over the registries.
const explicit = strapi.policy<LabPolicy>('global::unregistered');
const explicitRegistered = strapi.policy<LabPolicy>('plugin::policy-lab.hasRole');
const pluginExplicit = strapi.plugin('policy-lab').policy<LabPolicy>('unregistered');
declare const lookupChecks: [
  Expect<Equal<typeof hasRole, Policy<{ roles: string[] }>>>,
  Expect<Equal<typeof adminPolicy, Policy<undefined>>>,
  Expect<Equal<typeof pluginHasRole, Policy<{ roles: string[] }>>>,
  Expect<Equal<typeof pluginHasLevel, Policy<{ level?: number } | undefined>>>,
  Expect<Equal<typeof unregistered, unknown>>,
  Expect<Equal<typeof relative, unknown>>,
  Expect<Equal<typeof dynamic, unknown>>,
  Expect<Equal<typeof pattern, unknown>>,
  Expect<Equal<typeof pluginUnregistered, unknown>>,
  Expect<Equal<typeof pluginFullName, unknown>>,
  Expect<Equal<typeof pluginDynamic, unknown>>,
  Expect<Equal<typeof dynamicPlugin, unknown>>,
  Expect<Equal<typeof unregisteredPlugin, unknown>>,
  Expect<Equal<typeof legacyPluginPolicy, unknown>>,
  Expect<Equal<typeof explicit, LabPolicy>>,
  Expect<Equal<typeof explicitRegistered, LabPolicy>>,
  Expect<Equal<typeof pluginExplicit, LabPolicy>>,
];
lookupChecks satisfies unknown;

// A type annotation on the result does not replace the type argument.
// @ts-expect-error `T` is not inferred from the annotation.
const contextual: LabPolicy = strapi.policy('global::unregistered');
// @ts-expect-error `T` is not inferred from the annotation, for plugin lookups either.
const pluginContextual: LabPolicy = strapi.plugin('policy-lab').policy('unregistered');
contextual satisfies unknown;
pluginContextual satisfies unknown;
