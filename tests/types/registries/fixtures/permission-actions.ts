import type { Core } from '@strapi/types';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface PermissionActions {
        'plugin::lab.items.read': true;
        'plugin::lab.items.create': true;
        'admin::lab.settings': true;
        'api::lab.export': true;
      }
    }
  }
}

type Equal<T, U> =
  (<V>() => V extends T ? 1 : 2) extends <V>() => V extends U ? 1 : 2 ? true : false;

declare const dynamicId: string;
declare const dynamicPlugin: string;

// Once any ID is registered, references accept registered IDs only.
const reference: Core.PermissionActionReference = 'plugin::lab.items.read';
reference satisfies Core.RegisteredPermissionAction;
// @ts-expect-error A typo is not a registered ID.
'plugin::lab.items.raed' satisfies Core.PermissionActionReference;
// @ts-expect-error References are closed: a runtime string can name any action.
dynamicId satisfies Core.PermissionActionReference;

// Action provider reads accept registered and runtime IDs, and reject unregistered literals.
declare function get<TId extends Core.PermissionActionLookupName>(
  actionId: Core.PermissionActionLookup<TId>
): unknown;
get('plugin::lab.items.read');
get(dynamicId);
get(`plugin::${dynamicPlugin}.items.read`);
// @ts-expect-error A typo is not a registered ID.
get('plugin::lab.items.raed');
// @ts-expect-error Each member of a union must be registered.
get('plugin::lab.items.read' as 'plugin::lab.items.read' | 'plugin::lab.items.raed');

// The computed ID follows the action provider: no plugin name, `admin`, and any other plugin.
type ActionInput = {
  uid: string;
  pluginName?: string | undefined;
  section: string;
  displayName: string;
};
declare const idChecks: [
  Core.Assert<Equal<Core.PermissionActionId<{ uid: 'lab.export' }>, 'api::lab.export'>>,
  Core.Assert<
    Equal<Core.PermissionActionId<{ uid: 'lab.export'; pluginName: undefined }>, 'api::lab.export'>
  >,
  Core.Assert<
    Equal<
      Core.PermissionActionId<{ uid: 'lab.settings'; pluginName: 'admin' }>,
      'admin::lab.settings'
    >
  >,
  Core.Assert<
    Equal<
      Core.PermissionActionId<{ uid: 'items.read'; pluginName: 'lab' }>,
      'plugin::lab.items.read'
    >
  >,
  // A wide plugin name can be any plugin or none.
  Core.Assert<Equal<Core.PermissionActionId<{ uid: 'items.read'; pluginName: string }>, string>>,
  Core.Assert<Equal<Core.PermissionActionId<{ uid: 'items.read'; pluginName?: string }>, string>>,
  Core.Assert<Equal<Core.PermissionActionId<ActionInput>, string>>,
  // An unregistered ID is named in the message that replaces `uid`.
  Core.Assert<
    Equal<
      Core.PermissionActionCheck<{ uid: 'items.raed'; pluginName: 'lab' }>['uid'],
      'Unregistered permission action: plugin::lab.items.raed'
    >
  >,
];
idChecks satisfies unknown;

// Typed registrations accept actions whose computed ID is registered or dynamic.
declare function register<const TAction extends ActionInput>(
  action: Core.PermissionActionCheck<TAction>
): void;
declare function registerMany<const TActions extends readonly ActionInput[]>(actions: {
  [TIndex in keyof TActions]: Core.PermissionActionCheck<TActions[TIndex]>;
}): void;
register({ uid: 'items.read', pluginName: 'lab', section: 'plugins', displayName: 'Read' });
register({
  uid: 'lab.settings',
  pluginName: 'admin',
  section: 'settings',
  displayName: 'Lab',
});
register({ uid: 'lab.export', section: 'settings', displayName: 'Export' });
register({ uid: dynamicId, pluginName: 'lab', section: 'plugins', displayName: 'Dynamic' });
register({
  uid: 'items.raed',
  pluginName: dynamicPlugin,
  section: 'plugins',
  displayName: 'Any',
});
// @ts-expect-error A typo computes an unregistered ID.
register({ uid: 'items.raed', pluginName: 'lab', section: 'plugins', displayName: 'Read' });
// @ts-expect-error An undeclared action computes an unregistered ID.
register({ uid: 'reports.read', section: 'plugins', displayName: 'Reports' });
// @ts-expect-error The plugin name is part of the ID.
register({ uid: 'items.read', pluginName: 'other', section: 'plugins', displayName: 'Read' });

const actions = [
  { uid: 'items.read', pluginName: 'lab', section: 'plugins', displayName: 'Read' },
  { uid: 'items.create', pluginName: 'lab', section: 'plugins', displayName: 'Create' },
] as const;
registerMany(actions);
registerMany([
  { uid: 'items.read', pluginName: 'lab', section: 'plugins', displayName: 'Read' },
  // @ts-expect-error Each inline action is checked.
  { uid: 'items.craete', pluginName: 'lab', section: 'plugins', displayName: 'Create' },
]);
// A widened array is not checked: its `uid` is `string`.
const widened: ActionInput[] = [
  { uid: 'items.raed', pluginName: 'lab', section: 'plugins', displayName: 'Read' },
];
registerMany(widened);

// A package checks that it declares exactly the IDs of the actions it registers.
type LabDeclared = Extract<Core.RegisteredPermissionAction, `plugin::lab.${string}`>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type LabActionIds = Core.Assert<
  Core.SameNames<Core.PermissionActionId<(typeof actions)[number]>, LabDeclared>
>;
const stale = [
  { uid: 'items.read', pluginName: 'lab', section: 'plugins', displayName: 'Read' },
  { uid: 'items.delete', pluginName: 'lab', section: 'plugins', displayName: 'Delete' },
] as const;
declare const drift: [
  Core.Assert<
    Equal<
      Core.SameNames<Core.PermissionActionId<(typeof stale)[number]>, LabDeclared>,
      { unregistered: 'plugin::lab.items.delete'; unimplemented: 'plugin::lab.items.create' }
    >
  >,
];
drift satisfies unknown;
