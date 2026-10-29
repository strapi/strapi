import type { Core } from '@strapi/types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PermissionActions {
        'plugin::lab.items.read': true;
      }
    }
  }
}

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;

declare const dynamicId: string;

// Without strict types, any ID is accepted, registered or not.
declare const checks: [
  Core.Assert<Equal<Core.IsStrict, false>>,
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
'plugin::lab.items.raed' satisfies Core.PermissionActionReference;
dynamicId satisfies Core.PermissionActionReference;
