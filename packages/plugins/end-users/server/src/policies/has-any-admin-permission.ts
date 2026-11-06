import { policy } from '@strapi/utils';

const { createPolicy } = policy;

/**
 * `plugin::end-users.has-any-admin-permission`: the signed-in admin holds at least one of the listed
 * actions. `admin::hasPermissions` needs every one of them (`hasPermissions.ts`), and the layout
 * routes are for an admin who may read roles and for one who may read conditions, whichever the
 * builder or the role editor needs. Run it after `admin::isAuthenticatedAdmin`.
 */
export const hasAnyAdminPermission = createPolicy({
  name: 'plugin::end-users.has-any-admin-permission',
  validator(config: unknown) {
    const actions = (config as { actions?: unknown } | undefined)?.actions;

    if (
      !Array.isArray(actions) ||
      actions.length === 0 ||
      actions.some((action) => typeof action !== 'string' || action === '')
    ) {
      throw new Error('actions is a list of one or more action names');
    }
  },
  handler(
    ctx: { state: { userAbility?: { can(action: string): boolean } } },
    config: { actions: string[] }
  ) {
    const { userAbility } = ctx.state;

    return userAbility !== undefined && config.actions.some((action) => userAbility.can(action));
  },
});

export default hasAnyAdminPermission;
