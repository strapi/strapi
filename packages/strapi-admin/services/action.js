'use strict';

const { isNil } = require('lodash/fp');
const { getService } = require('../utils');
const { AUTHOR_CODE, PUBLISH_ACTION } = require('./constants');

// TODO: move actionProvider here instead of in the permission service

/**
 * Returns actions available for a role.
 * @param {object} roleId
 * @returns {object[]}
 */
const getActionsByRoleId = async roleId => {
  const { actionProvider } = getService('permission');

  if (!isNil(roleId)) {
    const role = await getService('role').findOne({ id: roleId });

    if (!role) {
      throw new strapi.errors.notFound('role.notFound');
    }

    if (role.code === AUTHOR_CODE) {
      return actionProvider.values().filter(action => {
        if (action.actionId !== PUBLISH_ACTION) {
          return true;
        }

        return false;
      });
    }
  }

  return actionProvider.values();
};

module.exports = {
  getActionsByRoleId,
};
