import type { Core } from '@strapi/types';

/**
 * A permission checked by `admin::hasPermissions`: an action, an `[action, subject]` pair, or an object.
 * With strict types, once any permission action ID is registered, the action must be registered.
 */
export type PermissionCheck =
  | Core.PermissionActionReference
  | [action: Core.PermissionActionReference]
  | [action: Core.PermissionActionReference, subject: string]
  | { action: Core.PermissionActionReference; subject?: string };

/** Config of `admin::hasPermissions`. Every listed permission must be granted to the admin user. */
export type HasPermissionsConfig = {
  actions: PermissionCheck[];
};
