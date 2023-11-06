import { policy } from '@strapi/utils';
import { validateHasPermissionsInput } from '../validation/policies/hasPermissions';

const { createPolicy } = policy;

export default createPolicy({
  name: 'plugin::content-manager.hasPermissions',
  validator: validateHasPermissionsInput,
  handler(ctx, config = {}) {
    const { actions = [], hasAtLeastOne = false } = config;

    const {
      state: { userAbility },
      params: { model },
    } = ctx;

    const isAuthorized = hasAtLeastOne
      ? actions.some((action: any) => userAbility.can(action, model))
      : actions.every((action: any) => userAbility.can(action, model));

    return isAuthorized;
  },
});
