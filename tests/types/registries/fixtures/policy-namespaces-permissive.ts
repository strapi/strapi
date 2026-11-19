import type { Core } from '@strapi/strapi';

// Supplying a route namespace does not activate strict policy checks.
({
  policies: [
    'hasPermissions',
    'unregistered',
    { name: 'hasPermissions', config: { actions: 123 } },
    { name: 'plugin::content-manager.hasPermissions', config: { actions: 123 } },
  ],
}) satisfies Core.RouteConfigFor<'plugin::content-manager'>;
