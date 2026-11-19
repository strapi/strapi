import type { Core } from '@strapi/strapi';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PackagePolicies {
        'plugin::namespace-fixture.hasRole': { role: string };
        'api::namespace-fixture.hasRole': { apiRole: string };
        namespaceFixtureCollision: { exact: true };
        'plugin::namespace-fixture.namespaceFixtureCollision': { relative: true };
      }

      interface AppPolicies {
        'plugin::namespace-fixture.hasRole': { roles: string[] };
      }
    }
  }
}

type Controllers = { items: { list: Core.ControllerHandler } };

({
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/items',
      handler: 'items.list',
      config: {
        policies: [
          'admin::isAuthenticatedAdmin',
          { name: 'hasRole', config: { roles: ['editor'] } },
          { name: 'plugin::namespace-fixture.hasRole', config: { roles: ['editor'] } },
          { name: 'namespaceFixtureCollision', config: { exact: true } },
        ],
      },
    },
  ],
}) satisfies Core.RouterInputFor<Controllers, 'plugin::namespace-fixture'>;

({
  policies: [{ name: 'hasRole', config: { apiRole: 'author' } }],
}) satisfies Core.RouteConfigFor<'api::namespace-fixture'>;

({
  // @ts-expect-error A relative reference still requires the policy's config.
  policies: ['hasRole'],
}) satisfies Core.RouteConfigFor<'plugin::namespace-fixture'>;
({
  // @ts-expect-error Relative references honor application overrides.
  policies: [{ name: 'hasRole', config: { role: 'editor' } }],
}) satisfies Core.RouteConfigFor<'plugin::namespace-fixture'>;
({
  // @ts-expect-error The namespace selects the correct policy contract.
  policies: [{ name: 'hasRole', config: { roles: ['editor'] } }],
}) satisfies Core.RouteConfigFor<'api::namespace-fixture'>;
({
  // @ts-expect-error Exact names take precedence over relative references.
  policies: [{ name: 'namespaceFixtureCollision', config: { relative: true } }],
}) satisfies Core.RouteConfigFor<'plugin::namespace-fixture'>;
({
  // @ts-expect-error Runtime does not qualify relative admin policy names.
  policies: ['isAuthenticatedAdmin'],
}) satisfies Core.RouteConfigFor<'admin::'>;
({
  // @ts-expect-error Relative policy typos remain errors.
  policies: ['hasRle'],
}) satisfies Core.RouteConfigFor<'plugin::namespace-fixture'>;
