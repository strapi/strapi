import type { Core } from '@strapi/types';

// A config typed `any` or an unresolved config type is `unknown`: the reference stays checked.
({
  policies: [
    'plugin::loose.any',
    'plugin::loose.unresolved',
    { name: 'plugin::loose.any', config: { anything: true } },
    { name: 'plugin::loose.unresolved', config: 1 },
    { name: 'plugin::loose.required', config: { role: 'editor' } },
  ],
}) satisfies Core.RouteConfigFor;
({
  // @ts-expect-error Unregistered policies are still rejected.
  policies: ['plugin::loose.unregistered'],
}) satisfies Core.RouteConfigFor;
({
  // @ts-expect-error A reference is a name or `{ name, config }`.
  policies: [42],
}) satisfies Core.RouteConfigFor;
({
  // @ts-expect-error A policy whose config is required needs `{ name, config }`.
  policies: ['plugin::loose.required'],
}) satisfies Core.RouteConfigFor;
