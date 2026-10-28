import type { Core } from '@strapi/types';

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;

// No provider is loaded, so no permission action is registered.
declare const checks: [
  Core.Assert<Equal<Core.IsStrict, true>>,
  Core.Assert<Equal<Core.RegisteredPermissionAction, never>>,
  // With the switch on, an empty registry accepts any ID: nothing is declared to check against.
  Core.Assert<Equal<Core.PermissionActionReference, string>>,
  Core.Assert<
    Equal<Core.PermissionActionLookup<'plugin::lab.items.raed'>, 'plugin::lab.items.raed'>
  >,
  Core.Assert<
    Equal<
      Core.PermissionActionCheck<{ uid: 'items.raed'; pluginName: 'lab' }>,
      { uid: 'items.raed'; pluginName: 'lab' }
    >
  >,
];
checks satisfies unknown;
