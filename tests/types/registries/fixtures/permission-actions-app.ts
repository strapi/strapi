// Strict mode with permission action IDs an application and a local plugin declare from the
// `as const` list they register. Admin's policy contract and IDs come from its declarations.
import type { Core } from '@strapi/types';
import type {} from '@strapi/admin/strapi-server';

export const actions = [
  { section: 'plugins', displayName: 'Export', uid: 'reports.export' },
  { section: 'plugins', displayName: 'Read', uid: 'items.read', pluginName: 'my-plugin' },
] as const;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      // An interface merges into the registry: a type alias cannot.
      // eslint-disable-next-line @typescript-eslint/no-empty-interface
      interface PermissionActions extends Core.PermissionActionsOf<typeof actions> {}
    }
  }
}

// The declared IDs are references, next to the IDs admin declares.
'api::reports.export' satisfies Core.PermissionActionReference;
'plugin::my-plugin.items.read' satisfies Core.PermissionActionReference;
'admin::users.read' satisfies Core.PermissionActionReference;
// @ts-expect-error A typo is not a declared ID.
'api::reports.exprot' satisfies Core.PermissionActionReference;
// @ts-expect-error A plugin that declares nothing has no ID.
'plugin::other.items.read' satisfies Core.PermissionActionReference;

// The admin permissions policy checks its actions against the declared IDs.
({
  policies: [
    {
      name: 'admin::hasPermissions',
      config: { actions: ['api::reports.export', 'plugin::my-plugin.items.read'] },
    },
  ],
}) satisfies Core.RouteConfigFor;
({
  policies: [
    {
      name: 'admin::hasPermissions',
      // @ts-expect-error A typo is not a declared ID.
      config: { actions: ['api::reports.exprot'] },
    },
  ],
}) satisfies Core.RouteConfigFor;
({
  policies: [
    {
      name: 'admin::hasPermissions',
      // @ts-expect-error A plugin that declares nothing has no ID.
      config: { actions: ['plugin::other.items.read'] },
    },
  ],
}) satisfies Core.RouteConfigFor;
