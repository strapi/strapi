'use strict';

const { toString } = require('lodash/fp');
const { ApplicationError } = require('@strapi/utils').errors;

const ssoCheckRolesIdForDeletion = async ids => {
  const adminStore = await strapi.store({ type: 'core', name: 'admin' });

  const {
    providers: { defaultRole },
  } = await adminStore.get({ key: 'auth' });

  for (const roleId of ids) {
    if (defaultRole && toString(defaultRole) === toString(roleId)) {
      throw new ApplicationError(
        'This role is used as the default SSO role. Make sure to change this configuration before deleting the role'
      );
    }
  }
};

module.exports = {
  ssoCheckRolesIdForDeletion,
};
