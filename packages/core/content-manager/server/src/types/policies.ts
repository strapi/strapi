import type { Core } from '@strapi/types';

/** Config of `plugin::content-manager.hasPermissions`, checked against the model of the request. */
export type HasPermissionsConfig = {
  /**
   * Actions to check. Defaults to none. With strict types, once any permission action ID is
   * registered, each action must be registered.
   */
  actions?: Core.PermissionActionReference[];
  /** Grants access when any action is allowed instead of all of them. */
  hasAtLeastOne?: boolean;
};
