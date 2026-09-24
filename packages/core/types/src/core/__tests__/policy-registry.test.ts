import type { ControllerHandler } from '../controller';
import type { RouteInput } from '../route';
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
