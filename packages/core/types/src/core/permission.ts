import type { SuggestedString } from '../utils/string';
import type { IsDynamicName, IsStrict } from './strictness';

/** Permission action IDs declared in `Strapi.Registries.PermissionActions`. */
export type RegisteredPermissionAction = Extract<keyof Strapi.Registries.PermissionActions, string>;

/**
 * A permission action ID in a typed config, such as the actions the `admin::hasPermissions` policy
 * checks. With strict types disabled, any string is accepted; registered IDs are listed for
 * completion. With strict types enabled, once any ID is registered, only registered IDs are
 * accepted. Without registered IDs, any string is.
 */
export type PermissionActionReference = IsStrict extends false
  ? SuggestedString<RegisteredPermissionAction>
  : [RegisteredPermissionAction] extends [never]
    ? string
    : RegisteredPermissionAction;

/**
 * The names an action provider read accepts (`get`, `has`, `appliesToProperty`,
 * `unstable_aliases`): any string, with registered IDs listed for completion. Use it as the
 * constraint of the ID's type parameter, and {@link PermissionActionLookup} as the parameter type.
 */
export type PermissionActionLookupName = SuggestedString<RegisteredPermissionAction>;

/**
 * The action ID an action provider read accepts. An ID known only at runtime, such as `string`
 * or `` `plugin::${string}.read` ``, is always accepted: the provider looks it up and finds nothing
 * for an unregistered ID. With strict types enabled, once any ID is registered, a literal ID must
 * be registered.
 *
 * @example
 * ```ts
 * declare function get<TId extends Core.PermissionActionLookupName>(
 *   actionId: Core.PermissionActionLookup<TId>
 * ): Action | undefined;
 * ```
 */
export type PermissionActionLookup<TId extends string> = IsStrict extends false
  ? TId
  : [RegisteredPermissionAction] extends [never]
    ? TId
    : IsDynamicName<TId> extends true
      ? TId
      : [TId] extends [RegisteredPermissionAction]
        ? TId
        : RegisteredPermissionAction;

/** The fields of an action registration that the action provider computes its ID from. */
type PermissionActionIdSource = { uid: string; pluginName?: string | undefined };

/** A wide plugin name, such as `string`, can be any plugin or none: the ID is unknown. */
type ComputedPermissionActionId<TPluginName, TUid extends string> = string extends TPluginName
  ? string
  : TPluginName extends undefined | ''
    ? `api::${TUid}`
    : TPluginName extends 'admin'
      ? `admin::${TUid}`
      : TPluginName extends string
        ? `plugin::${TPluginName}.${TUid}`
        : never;

/**
 * The ID the admin action provider computes for a registered action
 * (`packages/core/admin/server/src/domain/action/index.ts`, `computeActionId`): `api::<uid>`
 * without a plugin name, `admin::<uid>` for the `'admin'` plugin name, and
 * `plugin::<pluginName>.<uid>` otherwise. A union of actions, such as the items of an `as const`
 * array, resolves to the union of their IDs; a wide `uid` or `pluginName` to a dynamic ID.
 *
 * Check that a package declares exactly the IDs of the actions it registers with
 * `Core.SameNames`:
 *
 * @example
 * ```ts
 * type Declared = Extract<Core.RegisteredPermissionAction, `plugin::i18n.${string}`>;
 * // eslint-disable-next-line @typescript-eslint/no-unused-vars
 * type ActionIds = Core.Assert<
 *   Core.SameNames<Core.PermissionActionId<(typeof actions)[number]>, Declared>
 * >;
 * ```
 */
export type PermissionActionId<TAction extends PermissionActionIdSource> = TAction extends unknown
  ? ComputedPermissionActionId<
      'pluginName' extends keyof TAction ? TAction['pluginName'] : undefined,
      TAction['uid']
    >
  : never;

/** Whether `TId` is registered or known only at runtime. */
type IsCheckedPermissionAction<TId extends string> =
  IsDynamicName<TId> extends true
    ? true
    : [TId] extends [RegisteredPermissionAction]
      ? true
      : false;

/**
 * An action to register: `TAction` when its computed ID ({@link PermissionActionId}) is registered
 * or dynamic. Otherwise `TAction` whose `uid` is a message naming the unregistered ID, e.g.
 * `'Unregistered permission action: plugin::i18n.locale.raed'`, so the error points at the `uid`.
 * Without strict types, or without registered IDs, any action is accepted.
 *
 * Only literal fields are checked: write action arrays `as const`, or inline. An action typed with
 * a wide `uid: string` passes.
 *
 * @example
 * ```ts
 * declare function register<const TAction extends ActionInput>(
 *   action: Core.PermissionActionCheck<TAction>
 * ): Promise<void>;
 * declare function registerMany<const TActions extends readonly ActionInput[]>(actions: {
 *   [TIndex in keyof TActions]: Core.PermissionActionCheck<TActions[TIndex]>;
 * }): Promise<void>;
 * ```
 */
export type PermissionActionCheck<TAction extends PermissionActionIdSource> = IsStrict extends false
  ? TAction
  : [RegisteredPermissionAction] extends [never]
    ? TAction
    : IsCheckedPermissionAction<PermissionActionId<TAction>> extends true
      ? TAction
      : {
          [TKey in keyof TAction]: TKey extends 'uid'
            ? `Unregistered permission action: ${PermissionActionId<TAction>}`
            : TAction[TKey];
        };
