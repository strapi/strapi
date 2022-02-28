'use strict';

const { isNil } = require('lodash/fp');
const { NotFoundError } = require('@strapi/utils').errors;
const { getService } = require('../utils');
const { AUTHOR_CODE, PUBLISH_ACTION } = require('./constants');

// TODO: move actionProvider here instead of in the permission service

/**
 * Returns actions available for a role.
 * @param {string|number} roleId
 * @returns {object[]}
 */
const getAllowedActionsForRole = async roleId => {
  const { actionProvider } = getService('permission');

  if (!isNil(roleId)) {
    const role = await getService('role').findOne({ id: roleId });

    if (!role) {
      throw new NotFoundError('role.notFound');
    }

    if (role.code === AUTHOR_CODE) {
      return actionProvider.values().filter(({ actionId }) => actionId !== PUBLISH_ACTION);
    }
  }

  return actionProvider.values();
};

module.exports = {
  getAllowedActionsForRole,
};
