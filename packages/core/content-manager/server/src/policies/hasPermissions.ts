import type { Context } from 'koa';
import { policy } from '@strapi/utils';
import { validateHasPermissionsInput } from '../validation/policies/hasPermissions';

const { createPolicy } = policy;

export default createPolicy({
  name: 'plugin::content-manager.hasPermissions',
  validator: validateHasPermissionsInput,
  /**
   * NOTE: Action aliases are currently not checked at this level (policy).
   *       This is currently the intended behavior to avoid changing the behavior of API related permissions.
   *       If you want to add support for it, please create a dedicated RFC with a list of potential side effect this could have.
   */
  handler(ctx: Context, config = {}) {
    const { actions = [], hasAtLeastOne = false }: { actions: string[]; hasAtLeastOne: boolean } =
      config;

    const { userAbility } = ctx.state;
    const { model }: { model: string } = ctx.params;

    const isAuthorized = hasAtLeastOne
      ? actions.some((action) => userAbility.can(action, model))
      : actions.every((action) => userAbility.can(action, model));

    return isAuthorized;
  },
});
