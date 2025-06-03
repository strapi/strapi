import _ from 'lodash';
import { policy } from '@strapi/utils';
import { validateHasPermissionsInput } from '../validation/policies/hasPermissions';

const { createPolicy } = policy;

const inputModifiers = [
  {
    check: _.isString,
    transform: (action: any) => ({ action }),
  },
  {
    check: _.isArray,
    transform: (arr: any) => ({ action: arr[0], subject: arr[1] }),
  },
  {
    // Has to be after the isArray check since _.isObject also matches arrays
    check: _.isObject,
    transform: (perm: any) => perm,
  },
];

export default createPolicy({
  name: 'admin::hasPermissions',
  validator: validateHasPermissionsInput,
  handler(ctx, config) {
    const { actions } = config;
    const { userAbility: ability } = ctx.state;

    const permissions = actions.map((action: any) =>
      inputModifiers.find((modifier) => modifier.check(action))?.transform(action)
    );

    const isAuthorized = permissions.every(({ action, subject }: any) =>
      ability.can(action, subject)
    );

    return isAuthorized;
  },
});
