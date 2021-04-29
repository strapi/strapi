'use strict';

const _ = require('lodash');
const { stringIncludes } = require('strapi-utils');
const { createUser, hasSuperAdminRole } = require('../domain/user');
const { password: passwordValidator } = require('../validation/common-validators');
const { SUPER_ADMIN_CODE } = require('./constants');

const sanitizeUserRoles = role => _.pick(role, ['id', 'name', 'description', 'code']);

/**
 * Remove private user fields
 * @param {Object} user - user to sanitize
 */
const sanitizeUser = user => {
  return {
    ..._.omit(user, ['password', 'resetPasswordToken', 'roles']),
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
    registrationToken: strapi.admin.services.token.createToken(),
    ...attributes,
  };

  if (_.has(attributes, 'password')) {
    userInfo.password = await strapi.admin.services.auth.hashPassword(attributes.password);
  }

  const user = createUser(userInfo);
  const createdUser = await strapi.query('user', 'admin').create(user);

  await strapi.admin.services.metrics.sendDidInviteUser();

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
    const superAdminRole = await strapi.admin.services.role.getSuperAdminWithUsersCount();
    const willRemoveSuperAdminRole = !stringIncludes(attributes.roles, superAdminRole.id);

    if (lastAdminUser && willRemoveSuperAdminRole) {
      throw strapi.errors.badRequest(
        'ValidationError',
        'You must have at least one user with super admin role.'
      );
    }
  }

  // cannot disable last super admin
  if (attributes.isActive === false) {
    const lastAdminUser = await isLastSuperAdminUser(id);
    if (lastAdminUser) {
      throw strapi.errors.badRequest(
        'ValidationError',
        'You must have at least one active user with super admin role.'
      );
    }
  }

  // hash password if a new one is sent
  if (_.has(attributes, 'password')) {
    const hashedPassword = await strapi.admin.services.auth.hashPassword(attributes.password);

    return strapi.query('user', 'admin').update(
      { id },
      {
        ...attributes,
        password: hashedPassword,
      }
    );
  }

  return strapi.query('user', 'admin').update({ id }, attributes);
};

/**
 * Reset a user password by email. (Used in admin:reset CLI)
 * @param {string} email - user email
 * @param {string} password - new password
 */
const resetPasswordByEmail = async (email, password) => {
  const user = await findOne({ email });

  if (!user) {
    throw new Error(`User not found for email: ${email}`);
  }

  try {
    await passwordValidator.validate(password);
  } catch (error) {
    throw new Error(
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
  const user = await findOne({ id: userId }, ['roles']);
  const superAdminRole = await strapi.admin.services.role.getSuperAdminWithUsersCount();

  return superAdminRole.usersCount === 1 && hasSuperAdminRole(user);
};

/**
 * Check if a user with specific attributes exists in the database
 * @param attributes A partial user object
 * @returns {Promise<boolean>}
 */
const exists = async (attributes = {}) => {
  return (await strapi.query('user', 'admin').count(attributes)) > 0;
};

/**
 * Returns a user registration info
 * @param {string} registrationToken - a user registration token
 * @returns {Promise<registrationInfo>} - Returns user email, firstname and lastname
 */
const findRegistrationInfo = async registrationToken => {
  const user = await strapi.query('user', 'admin').findOne({ registrationToken });

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
  const matchingUser = await strapi.query('user', 'admin').findOne({ registrationToken });

  if (!matchingUser) {
    throw strapi.errors.badRequest('Invalid registration info');
  }

  return strapi.admin.services.user.updateById(matchingUser.id, {
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
const findOne = async (params, populate) => {
  return strapi.query('user', 'admin').findOne(params, populate);
};

/** Find many users (paginated)
 * @param query
 * @returns {Promise<user>}
 */
const findPage = async query => {
  return strapi.query('user', 'admin').findPage(query);
};

/** Search for many users (paginated)
 * @param query
 * @returns {Promise<user>}
 */
const searchPage = async query => {
  return strapi.query('user', 'admin').searchPage(query);
};

/** Delete a user
 * @param id id of the user to delete
 * @returns {Promise<user>}
 */
const deleteById = async id => {
  // Check at least one super admin remains
  const userToDelete = await strapi.query('user', 'admin').findOne({ id }, ['roles']);
  if (userToDelete) {
    if (userToDelete.roles.some(r => r.code === SUPER_ADMIN_CODE)) {
      const superAdminRole = await strapi.admin.services.role.getSuperAdminWithUsersCount();
      if (superAdminRole.usersCount === 1) {
        throw strapi.errors.badRequest(
          'ValidationError',
          'You must have at least one user with super admin role.'
        );
      }
    }
  } else {
    return null;
  }

  return strapi.query('user', 'admin').delete({ id });
};

/** Delete a user
 * @param ids ids of the users to delete
 * @returns {Promise<user>}
 */
const deleteByIds = async ids => {
  // Check at least one super admin remains
  const superAdminRole = await strapi.admin.services.role.getSuperAdminWithUsersCount();
  const nbOfSuperAdminToDelete = await strapi
    .query('user', 'admin')
    .count({ id_in: ids, roles: [superAdminRole.id] });
  if (superAdminRole.usersCount === nbOfSuperAdminToDelete) {
    throw strapi.errors.badRequest(
      'ValidationError',
      'You must have at least one user with super admin role.'
    );
  }

  return strapi.query('user', 'admin').delete({ id_in: ids });
};

/** Count the users that don't have any associated roles
 * @returns {Promise<number>}
 */
const countUsersWithoutRole = async () => {
  const userModel = strapi.query('user', 'admin').model;
  let count;

  if (userModel.orm === 'bookshelf') {
    count = await strapi.query('user', 'admin').count({ roles_null: true });
  } else if (userModel.orm === 'mongoose') {
    count = await strapi.query('user', 'admin').model.countDocuments({
      $or: [{ roles: { $exists: false } }, { roles: { $size: 0 } }],
    });
  } else {
    const allRoles = await strapi.query('role', 'admin').find({ _limit: -1 });
    count = await strapi.query('user', 'admin').count({
      roles_nin: allRoles.map(r => r.id),
    });
  }

  return count;
};

/**
 * Count the number of users based on search params
 * @param params params used for the query
 * @returns {Promise<number>}
 */
const count = async (params = {}) => {
  return strapi.query('user', 'admin').count(params);
};

/** Assign some roles to several users
 * @returns {undefined}
 */
const assignARoleToAll = async roleId => {
  const userModel = strapi.query('user', 'admin').model;

  if (userModel.orm === 'bookshelf') {
    const assocTable = userModel.associations.find(a => a.alias === 'roles').tableCollectionName;
    const userTable = userModel.collectionName;
    const knex = strapi.connections[userModel.connection];
    const usersIds = await knex
      .select(`${userTable}.id`)
      .from(userTable)
      .leftJoin(assocTable, `${userTable}.id`, `${assocTable}.user_id`)
      .where(`${assocTable}.role_id`, null)
      .pluck(`${userTable}.id`);

    if (usersIds.length > 0) {
      const newRelations = usersIds.map(userId => ({ user_id: userId, role_id: roleId }));
      await knex.insert(newRelations).into(assocTable);
    }
  } else if (userModel.orm === 'mongoose') {
    await strapi.query('user', 'admin').model.updateMany({}, { roles: [roleId] });
  }
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

const migrateUsers = async () => {
  const someRolesExist = await strapi.admin.services.role.exists();
  if (someRolesExist) {
    return;
  }

  const userModel = strapi.query('user', 'admin').model;

  if (userModel.orm === 'bookshelf') {
    await userModel
      .query(qb => qb.where('blocked', false).orWhere('blocked', null))
      .save({ isActive: true }, { method: 'update', patch: true, require: false });
    await userModel
      .query(qb => qb.where('blocked', true))
      .save({ isActive: false }, { method: 'update', patch: true, require: false });
  } else if (userModel.orm === 'mongoose') {
    await userModel.updateMany({ blocked: { $in: [false, null] } }, { isActive: true });
    await userModel.updateMany({ blocked: true }, { isActive: false });
  }
};

module.exports = {
  create,
  updateById,
  exists,
  findRegistrationInfo,
  register,
  sanitizeUser,
  findOne,
  findPage,
  searchPage,
  deleteById,
  deleteByIds,
  countUsersWithoutRole,
  count,
  assignARoleToAll,
  displayWarningIfUsersDontHaveRole,
  migrateUsers,
  resetPasswordByEmail,
};
