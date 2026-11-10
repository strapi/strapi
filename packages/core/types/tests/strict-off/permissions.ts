import type { Core } from '../../src';
import type { SuggestedString } from '../../src/utils/string';
import type { Equal, Expect, SameValues } from './helpers';

// Without strict types, permission action references, lookups and registrations accept any ID.
// Registered IDs are still listed for completion.
type LegacyAction = { uid: 'items.raed'; pluginName: 'legacy' };
type PermissionActionChecks = [
  Expect<SameValues<Core.PermissionActionReference, string>>,
  Expect<Equal<Core.PermissionActionReference, SuggestedString<'plugin::legacy.items.read'>>>,
  Expect<Equal<Core.PermissionActionLookupName, SuggestedString<'plugin::legacy.items.read'>>>,
  Expect<
    Equal<Core.PermissionActionLookup<'plugin::legacy.items.raed'>, 'plugin::legacy.items.raed'>
  >,
  Expect<Equal<Core.PermissionActionCheck<LegacyAction>, LegacyAction>>,
];
declare const permissionActionChecks: PermissionActionChecks;
permissionActionChecks satisfies unknown;

// The entries of an `as const` action list do not depend on the switch.
const actions = [
  { section: 'plugins', displayName: 'Export', uid: 'reports.export' },
  { section: 'plugins', displayName: 'Read', uid: 'items.read', pluginName: 'my-plugin' },
  { section: 'settings', displayName: 'Users', uid: 'users.read', pluginName: 'admin' },
] as const;
type PermissionActionsOfChecks = [
  Expect<
    Equal<
      Core.PermissionActionsOf<typeof actions>,
      {
        'api::reports.export': true;
        'plugin::my-plugin.items.read': true;
        'admin::users.read': true;
      }
    >
  >,
];
declare const permissionActionsOfChecks: PermissionActionsOfChecks;
permissionActionsOfChecks satisfies unknown;
