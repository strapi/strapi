'use strict';

const _ = require('lodash');
const { defaults } = require('lodash/fp');
const { stringIncludes } = require('@strapi/utils');
const { ValidationError } = require('@strapi/utils').errors;
const { createUser, hasSuperAdminRole } = require('../domain/user');
const { password: passwordValidator } = require('../validation/common-validators');
const { getService } = require('../utils');
const { SUPER_ADMIN_CODE } = require('./constants');

const sanitizeUserRoles = role => _.pick(role, ['id', 'name', 'description', 'code']);

/**
 * Remove private user fields
 * @param {Object} user - user to sanitize
 */
const sanitizeUser = user => {
  return {
    ..._.omit(user, ['password', 'resetPasswordToken', 'registrationToken', 'roles']),
    roles: user.roles && user.roles.map(sanitizeUserRoles),
  };
};

/**
 * Create and save a user in database
 * @param attributes A partial user object
 * @returns {Promise<user>}
 */
const create = async attributes => {
  const userInfo = {
    registrationToken: getService('token').createToken(),
    ...attributes,
  };

  if (_.has(attributes, 'password')) {
    userInfo.password = await getService('auth').hashPassword(attributes.password);
  }

  const user = createUser(userInfo);

  const createdUser = await strapi.query('admin::user').create({ data: user, populate: ['roles'] });

  getService('metrics').sendDidInviteUser();

  return createdUser;
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

    return strapi.query('admin::user').update({
      where: { id },
      data: {
        ...attributes,
        password: hashedPassword,
      },
      populate: ['roles'],
    });
  }

  return strapi.query('admin::user').update({
    where: { id },
    data: attributes,
    populate: ['roles'],
  });
};

/**
 * Reset a user password by email. (Used in admin:reset CLI)
 * @param {string} email - user email
 * @param {string} password - new password
 */
const resetPasswordByEmail = async (email, password) => {
  const user = await strapi.query('admin::user').findOne({ where: { email }, populate: ['roles'] });

  if (!user) {
    throw new Error(`User not found for email: ${email}`);
  }

  try {
    await passwordValidator.validate(password);
  } catch (error) {
    throw new ValidationError(
      'Invalid password. Expected a minimum of 8 characters with at least one number and one uppercase letter'
    );
  }

  await updateById(user.id, { password });
};

/**
 * Check if a user is the last super admin
 * @param {int|string} userId user's id to look for
 */
const isLastSuperAdminUser = async userId => {
  const user = await findOne(userId);
  const superAdminRole = await getService('role').getSuperAdminWithUsersCount();

  return superAdminRole.usersCount === 1 && hasSuperAdminRole(user);
};

/**
 * Check if a user with specific attributes exists in the database
 * @param attributes A partial user object
 * @returns {Promise<boolean>}
 */
const exists = async (attributes = {}) => {
  return (await strapi.query('admin::user').count({ where: attributes })) > 0;
};

/**
 * Returns a user registration info
 * @param {string} registrationToken - a user registration token
 * @returns {Promise<registrationInfo>} - Returns user email, firstname and lastname
 */
const findRegistrationInfo = async registrationToken => {
  const user = await strapi.query('admin::user').findOne({ where: { registrationToken } });

  if (!user) {
    return undefined;
  }

  return _.pick(user, ['email', 'firstname', 'lastname']);
};

/**
 * Registers a user based on a registrationToken and some informations to update
 * @param {Object} params
 * @param {Object} params.registrationToken registration token
 * @param {Object} params.userInfo user info
 */
const register = async ({ registrationToken, userInfo }) => {
  const matchingUser = await strapi.query('admin::user').findOne({ where: { registrationToken } });

  if (!matchingUser) {
    throw new ValidationError('Invalid registration info');
  }

  return getService('user').updateById(matchingUser.id, {
    password: userInfo.password,
    firstname: userInfo.firstname,
    lastname: userInfo.lastname,
    registrationToken: null,
    isActive: true,
  });
};

/**
 * Find one user
 */
const findOne = async (id, populate = ['roles']) => {
  return strapi.entityService.findOne('admin::user', id, { populate });
};

/**
 * Find one user by its email
 * @param {string} id  email
 * @param {string || string[] || object} populate
 * @returns
 */
const findOneByEmail = async (email, populate = []) => {
  return strapi.query('admin::user').findOne({
    where: { email },
    populate,
  });
};

/** Find many users (paginated)
 * @param query
 * @returns {Promise<user>}
 */
const findPage = async (query = {}) => {
  const enrichedQuery = defaults({ populate: ['roles'] }, query);
  return strapi.entityService.findPage('admin::user', enrichedQuery);
};

/** Delete a user
 * @param id id of the user to delete
 * @returns {Promise<user>}
 */
const deleteById = async id => {
  // Check at least one super admin remains
  const userToDelete = await strapi.query('admin::user').findOne({
    where: { id },
    populate: ['roles'],
  });

  if (!userToDelete) {
    return null;
  }

  if (userToDelete) {
    if (userToDelete.roles.some(r => r.code === SUPER_ADMIN_CODE)) {
      const superAdminRole = await getService('role').getSuperAdminWithUsersCount();
      if (superAdminRole.usersCount === 1) {
        throw new ValidationError('You must have at least one user with super admin role.');
      }
    }
  }

  return strapi.query('admin::user').delete({ where: { id }, populate: ['roles'] });
};

/** Delete a user
 * @param ids ids of the users to delete
 * @returns {Promise<user>}
 */
const deleteByIds = async ids => {
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

  return deletedUsers;
};

/** Count the users that don't have any associated roles
 * @returns {Promise<number>}
 */
const countUsersWithoutRole = async () => {
  return strapi.query('admin::user').count({
    where: {
      roles: {
        id: { $null: true },
      },
    },
  });
};

/**
 * Count the number of users based on search params
 * @param params params used for the query
 * @returns {Promise<number>}
 */
const count = async (where = {}) => {
  return strapi.query('admin::user').count({ where });
};

/** Assign some roles to several users
 * @returns {undefined}
 */
const assignARoleToAll = async roleId => {
  const users = await strapi.query('admin::user').findMany({
    select: ['id'],
    where: {
      roles: { id: { $null: true } },
    },
  });

  await Promise.all(
    users.map(user => {
      return strapi.query('admin::user').update({
        where: { id: user.id },
        data: { roles: [roleId] },
      });
    })
  );
};

/** Display a warning if some users don't have at least one role
 * @returns {Promise<>}
 */
const displayWarningIfUsersDontHaveRole = async () => {
  const count = await countUsersWithoutRole();

  if (count > 0) {
    strapi.log.warn(`Some users (${count}) don't have any role.`);
  }
};

/** Returns an array of interface languages currently used by users
 * @returns {Promise<Array<string>>}
 */
const getLanguagesInUse = async () => {
  const users = await strapi.query('admin::user').findMany({ select: ['preferedLanguage'] });

  return users.map(user => user.preferedLanguage || 'en');
};

module.exports = {
  create,
  updateById,
  exists,
  findRegistrationInfo,
  register,
  sanitizeUser,
  findOne,
  findOneByEmail,
  findPage,
  deleteById,
  deleteByIds,
  countUsersWithoutRole,
  count,
  assignARoleToAll,
  displayWarningIfUsersDontHaveRole,
  resetPasswordByEmail,
  getLanguagesInUse,
};
