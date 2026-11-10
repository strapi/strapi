import type * as Core from '..';
import type { Equal } from '../../../tests/helpers/assert';

// The `as const` list an application or plugin passes to `registerMany`.
const actions = [
  { section: 'plugins', displayName: 'Export', uid: 'reports.export' },
  { section: 'plugins', displayName: 'Read', uid: 'items.read', pluginName: 'my-plugin' },
  { section: 'settings', displayName: 'Users', uid: 'users.read', pluginName: 'admin' },
] as const;

// One `true` entry per computed ID. This program augments nothing: the alias does not read the
// registry.
declare const checks: [
  Core.Assert<
    Equal<
      Core.PermissionActionsOf<typeof actions>,
      {
        'api::reports.export': true;
        'plugin::my-plugin.items.read': true;
        'admin::users.read': true;
      }
    >
  >,
  Core.Assert<Equal<keyof Core.PermissionActionsOf<readonly []>, never>>,
  // A list that is not `as const` has a wide `uid`: its key opens the whole `api::` namespace.
  Core.Assert<Equal<Core.PermissionActionsOf<{ uid: string }[]>, Record<`api::${string}`, true>>>,
];
checks satisfies unknown;
