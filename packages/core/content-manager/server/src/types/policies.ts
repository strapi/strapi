/** Config of `plugin::content-manager.hasPermissions`, checked against the model of the request. */
export type HasPermissionsConfig = {
  /** Actions to check. Defaults to none. */
  actions?: string[];
  /** Grants access when any action is allowed instead of all of them. */
  hasAtLeastOne?: boolean;
};
