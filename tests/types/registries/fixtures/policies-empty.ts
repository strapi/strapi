import type { Core } from '@strapi/types';

// No provider is loaded, so no policy is registered.
declare const noPolicies: [keyof Strapi.Registries.PackagePolicies] extends [never] ? true : false;
noPolicies satisfies true;

// With the switch on, an empty policy inventory accepts no reference.
({ policies: [] }) satisfies Core.RouteConfigFor;
({
  // @ts-expect-error Unregistered policies are rejected even without any registered policy.
  policies: ['global::unregistered'],
}) satisfies Core.RouteConfigFor;
