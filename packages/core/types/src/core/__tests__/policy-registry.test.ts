import type { ControllerHandler } from '../controller';
import type { RouteConfigFor, RouteInput } from '../route';
import type { RouterInputFor } from '../router';

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
