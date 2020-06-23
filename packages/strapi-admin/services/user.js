'use strict';

const _ = require('lodash');
const { stringIncludes, stringEquals } = require('strapi-utils');
const { createUser } = require('../domain/user');

const sanitizeUserRoles = role => _.pick(role, ['id', 'name', 'description']);

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
  const user = createUser({
    registrationToken: strapi.admin.services.token.createToken(),
    ...attributes,
  });

  // hash password if a new one is sent
  if (_.has(user, 'password')) {
    const hashedPassword = await strapi.admin.services.auth.hashPassword(user.password);

    return strapi.query('user', 'admin').create({
      ...user,
      password: hashedPassword,
    });
  }

  return strapi.query('user', 'admin').create(user);
};

/**
 * Update a user in database
 * @param params query params to find the user to update
 * @param attributes A partial user object
 * @returns {Promise<user>}
 */
const updateById = async (id, attributes) => {
  // Check at least one super admin remains
  if (_.has(attributes, 'roles')) {
    const superAdminRole = await strapi.admin.services.role.getSuperAdminWithUsersCount();
    const nbOfSuperAdminUsers = _.get(superAdminRole, 'usersCount');
    const mayRemoveSuperAdmins = !stringIncludes(attributes.roles, superAdminRole.id);

    if (nbOfSuperAdminUsers === 1 && mayRemoveSuperAdmins) {
      const userWithAdminRole = await strapi
        .query('user', 'admin')
        .findOne({ roles: [superAdminRole.id] });
      if (stringEquals(userWithAdminRole.id, id)) {
        throw strapi.errors.badRequest(
          'ValidationError',
          'You must have at least one user with super admin role.'
        );
      }
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
const findOne = async params => {
  return strapi.query('user', 'admin').findOne(params);
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

/** Delete users
 * @param query
 * @returns {Promise<user>}
 */
const deleteFn = async query => {
  return strapi.query('user', 'admin').delete(query);
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
  delete: deleteFn,
  countUsersWithoutRole,
  assignARoleToAll,
};
