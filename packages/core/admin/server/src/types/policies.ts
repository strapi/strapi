/** A permission checked by `admin::hasPermissions`: an action, an `[action, subject]` pair, or an object. */
export type PermissionCheck =
  | string
  | [action: string]
  | [action: string, subject: string]
  | { action: string; subject?: string };

/** Config of `admin::hasPermissions`. Every listed permission must be granted to the admin user. */
export type HasPermissionsConfig = {
  actions: PermissionCheck[];
};
