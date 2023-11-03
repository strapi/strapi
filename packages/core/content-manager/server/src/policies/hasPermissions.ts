import { policy } from '@strapi/utils';
const { createPolicy } = policy;

import { validateHasPermissionsInput } from '../validation/policies/hasPermissions';

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
