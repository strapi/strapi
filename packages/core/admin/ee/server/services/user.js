'use strict';

const _ = require('lodash');
const { pipe, map, castArray, toNumber } = require('lodash/fp');
const { stringIncludes } = require('@strapi/utils');
const { ValidationError } = require('@strapi/utils').errors;
const { hasSuperAdminRole } = require('../../../server/domain/user');
const { getService } = require('../../../server/utils');
const { SUPER_ADMIN_CODE } = require('../../../server/services/constants');

/** Checks if ee disabled users list needs to be updated
 * @param {string} id
 * @param {object} input
 */
const updateEEDisabledUsersList = async (id, input) => {
  const disabledUsers = await getService('seat-enforcement').getDisabledUserList();

  if (!disabledUsers) {
    return;
  }

  const user = disabledUsers.find((user) => user.id === Number(id));
  if (!user) {
    return;
  }

  if (user.isActive !== input.isActive) {
    const newDisabledUsersList = disabledUsers.filter((user) => user.id !== Number(id));
    await strapi.store.set({
      type: 'ee',
      key: 'disabled_users',
      value: newDisabledUsersList,
    });
  }
};

const castNumberArray = pipe(castArray, map(toNumber));

const removeFromEEDisabledUsersList = async (ids) => {
  let idsToCheck;
  if (typeof ids === 'object') {
    idsToCheck = castNumberArray(ids);
  } else {
    idsToCheck = [Number(ids)];
  }

  const disabledUsers = await getService('seat-enforcement').getDisabledUserList();

  if (!disabledUsers) {
    return;
  }

  const newDisabledUsersList = disabledUsers.filter((user) => !idsToCheck.includes(user.id));
  await strapi.store.set({
    type: 'ee',
    key: 'disabled_users',
    value: newDisabledUsersList,
  });
};

/**
 * Update a user in database
 * @param id query params to find the user to update
 * @param attributes A partial user object
 * @returns {Promise<user>}
 */
const updateById = async (id, attributes) => {
  // Check at least one super admin remains
  if (_.has(attributes, 'roles')) {
    const lastAdminUser = await isLastSuperAdminUser(id);
    const superAdminRole = await getService('role').getSuperAdminWithUsersCount();
    const willRemoveSuperAdminRole = !stringIncludes(attributes.roles, superAdminRole.id);

    if (lastAdminUser && willRemoveSuperAdminRole) {
      throw new ValidationError('You must have at least one user with super admin role.');
    }
  }

  // cannot disable last super admin
  if (attributes.isActive === false) {
    const lastAdminUser = await isLastSuperAdminUser(id);
    if (lastAdminUser) {
      throw new ValidationError('You must have at least one user with super admin role.');
    }
  }

  // hash password if a new one is sent
  if (_.has(attributes, 'password')) {
    const hashedPassword = await getService('auth').hashPassword(attributes.password);

    const updatedUser = await strapi.query('admin::user').update({
      where: { id },
      data: {
        ...attributes,
        password: hashedPassword,
      },
      populate: ['roles'],
    });

    strapi.eventHub.emit('user.update', { user: sanitizeUser(updatedUser) });

    return updatedUser;
  }

  const updatedUser = await strapi.query('admin::user').update({
    where: { id },
    data: attributes,
    populate: ['roles'],
  });

  await updateEEDisabledUsersList(id, attributes);

  if (updatedUser) {
    strapi.eventHub.emit('user.update', { user: sanitizeUser(updatedUser) });
  }

  return updatedUser;
};

/** Delete a user
 * @param id id of the user to delete
 * @returns {Promise<user>}
 */
const deleteById = async (id) => {
  // Check at least one super admin remains
  const userToDelete = await strapi.query('admin::user').findOne({
    where: { id },
    populate: ['roles'],
  });

  if (!userToDelete) {
    return null;
  }

  if (userToDelete) {
    if (userToDelete.roles.some((r) => r.code === SUPER_ADMIN_CODE)) {
      const superAdminRole = await getService('role').getSuperAdminWithUsersCount();
      if (superAdminRole.usersCount === 1) {
        throw new ValidationError('You must have at least one user with super admin role.');
      }
    }
  }

  const deletedUser = await strapi
    .query('admin::user')
    .delete({ where: { id }, populate: ['roles'] });

  await removeFromEEDisabledUsersList(id);

  strapi.eventHub.emit('user.delete', { user: sanitizeUser(deletedUser) });

  return deletedUser;
};

/** Delete a user
 * @param ids ids of the users to delete
 * @returns {Promise<user>}
 */
const deleteByIds = async (ids) => {
  // Check at least one super admin remains
  const superAdminRole = await getService('role').getSuperAdminWithUsersCount();
  const nbOfSuperAdminToDelete = await strapi.query('admin::user').count({
    where: {
      id: ids,
      roles: { id: superAdminRole.id },
    },
  });

  if (superAdminRole.usersCount === nbOfSuperAdminToDelete) {
    throw new ValidationError('You must have at least one user with super admin role.');
  }

  const deletedUsers = [];
  for (const id of ids) {
    const deletedUser = await strapi.query('admin::user').delete({
      where: { id },
      populate: ['roles'],
    });

    deletedUsers.push(deletedUser);
  }

  await removeFromEEDisabledUsersList(ids);

  strapi.eventHub.emit('user.delete', {
    users: deletedUsers.map((deletedUser) => sanitizeUser(deletedUser)),
  });

  return deletedUsers;
};

const sanitizeUserRoles = (role) => _.pick(role, ['id', 'name', 'description', 'code']);

/**
 * Check if a user is the last super admin
 * @param {int|string} userId user's id to look for
 */
const isLastSuperAdminUser = async (userId) => {
  const user = await findOne(userId);
  const superAdminRole = await getService('role').getSuperAdminWithUsersCount();

  return superAdminRole.usersCount === 1 && hasSuperAdminRole(user);
};

/**
 * Remove private user fields
 * @param {Object} user - user to sanitize
 */
const sanitizeUser = (user) => {
  return {
    ..._.omit(user, ['password', 'resetPasswordToken', 'registrationToken', 'roles']),
    roles: user.roles && user.roles.map(sanitizeUserRoles),
  };
};

/**
 * Find one user
 */
const findOne = async (id, populate = ['roles']) => {
  return strapi.entityService.findOne('admin::user', id, { populate });
};

const getCurrentActiveUserCount = async () => {
  return strapi.db.query('admin::user').count({ where: { isActive: true } });
};

module.exports = {
  updateEEDisabledUsersList,
  removeFromEEDisabledUsersList,
  getCurrentActiveUserCount,
  deleteByIds,
  deleteById,
  updateById,
};
