/* eslint-disable @typescript-eslint/no-non-null-assertion */
import _ from 'lodash';
import { defaults } from 'lodash/fp';
import { arrays, errors } from '@strapi/utils';
import type { Data } from '@strapi/types';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { createUser, hasSuperAdminRole } from '../domain/user';
import type {
  AdminUser,
  AdminRole,
  AdminUserCreationPayload,
  SanitizedAdminUser,
  SanitizedAdminRole,
  AdminUserUpdatePayload,
  // eslint-disable-next-line node/no-unpublished-import
} from '../../../shared/contracts/shared';
import { password as passwordValidator } from '../validation/common-validators';
import { getService } from '../utils';
import constants from './constants';

const { SUPER_ADMIN_CODE } = constants;

const { ValidationError } = errors;
const sanitizeUserRoles = (role: AdminRole): SanitizedAdminRole =>
  _.pick(role, ['id', 'name', 'description', 'code']);

/**
 * Remove private user fields
 * @param  user - user to sanitize
 */
const sanitizeUser = (user: AdminUser): SanitizedAdminUser => {
  return {
    ..._.omit(user, ['password', 'resetPasswordToken', 'registrationToken', 'roles']),
    roles: user.roles && user.roles.map(sanitizeUserRoles),
  };
};

/**
 * Create and save a user in database
 * @param attributes A partial user object
 */
const create = async (
  // isActive is added in the controller, it's not sent by the API.
  attributes: Partial<AdminUserCreationPayload> & { isActive?: true }
): Promise<AdminUser> => {
  const userInfo = {
    registrationToken: getService('token').createToken(),
    ...attributes,
  };

  if (_.has(attributes, 'password')) {
    userInfo.password = await getService('auth').hashPassword(attributes.password!);
  }

  const user = createUser(userInfo);

  const createdUser = await strapi.db
    .query('admin::user')
    .create({ data: user, populate: ['roles'] });

  getService('metrics').sendDidInviteUser();

  strapi.eventHub.emit('user.create', { user: sanitizeUser(createdUser) });

  return createdUser;
};

/**
 * Update a user in database
 * @param id query params to find the user to update
 * @param attributes A partial user object
 */
const updateById = async (
  id: Data.ID,
  attributes: Partial<AdminUserUpdatePayload>
): Promise<AdminUser> => {
  // Check at least one super admin remains
  if (_.has(attributes, 'roles')) {
    const lastAdminUser = await isLastSuperAdminUser(id);
    const superAdminRole = await getService('role').getSuperAdminWithUsersCount();
    const willRemoveSuperAdminRole = !arrays.includesString(attributes.roles!, superAdminRole.id);

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
    const hashedPassword = await getService('auth').hashPassword(attributes.password!);

    const updatedUser = await strapi.db.query('admin::user').update({
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

  const updatedUser = await strapi.db.query('admin::user').update({
    where: { id },
    data: attributes,
    populate: ['roles'],
  });

  if (updatedUser) {
    strapi.eventHub.emit('user.update', { user: sanitizeUser(updatedUser) });
  }

  return updatedUser;
};

/**
 * Reset a user password by email. (Used in admin:reset CLI)
 * @param email - user email
 * @param password - new password
 */
const resetPasswordByEmail = async (email: string, password: string) => {
  const user = await strapi.db
    .query('admin::user')
    .findOne({ where: { email }, populate: ['roles'] });

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
 * @param userId user's id to look for
 */
const isLastSuperAdminUser = async (userId: Data.ID): Promise<boolean> => {
  const user = (await findOne(userId)) as AdminUser | null;
  if (!user) return false;

  const superAdminRole = await getService('role').getSuperAdminWithUsersCount();

  return superAdminRole.usersCount === 1 && hasSuperAdminRole(user);
};

/**
 * Check if a user is the first super admin
 * @param userId user's id to look for
 */
const isFirstSuperAdminUser = async (userId: Data.ID): Promise<boolean> => {
  const currentUser = (await findOne(userId)) as AdminUser | null;

  if (!currentUser || !hasSuperAdminRole(currentUser)) return false;

  const [oldestUser] = await strapi.db.query('admin::user').findMany({
    populate: {
      roles: {
        where: {
          code: { $eq: SUPER_ADMIN_CODE },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
    limit: 1,
    select: ['id'],
  });

  return oldestUser.id === currentUser.id;
};

/**
 * Check if a user with specific attributes exists in the database
 * @param attributes A partial user object
 */
const exists = async (attributes = {} as unknown): Promise<boolean> => {
  return (await strapi.db.query('admin::user').count({ where: attributes })) > 0;
};

/**
 * Returns a user registration info
 * @param registrationToken - a user registration token
 * @returns - Returns user email, firstname and lastname
 */
const findRegistrationInfo = async (
  registrationToken: string
): Promise<Pick<AdminUser, 'email' | 'firstname' | 'lastname'> | undefined> => {
  const user = await strapi.db.query('admin::user').findOne({ where: { registrationToken } });

  if (!user) {
    return undefined;
  }

  return _.pick(user, ['email', 'firstname', 'lastname']);
};

/**
 * Registers a user based on a registrationToken and some informations to update
 * @param params
 * @param params.registrationToken registration token
 * @param params.userInfo user info
 */
const register = async ({
  registrationToken,
  userInfo,
}: {
  registrationToken: string;
  userInfo: Partial<AdminUser>;
}) => {
  const matchingUser = await strapi.db
    .query('admin::user')
    .findOne({ where: { registrationToken } });

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
const findOne = async (id: Data.ID, populate = ['roles']) => {
  return strapi.db.query('admin::user').findOne({ where: { id }, populate });
};

/**
 * Find one user by its email
 * @param email
 * @param populate
 * @returns
 */
const findOneByEmail = async (email: string, populate = []) => {
  return strapi.db.query('admin::user').findOne({
    where: { email: { $eqi: email } },
    populate,
  });
};

/** Find many users (paginated)
 * @param params
 */
const findPage = async (params = {}): Promise<unknown> => {
  const query = strapi
    .get('query-params')
    .transform('admin::user', defaults({ populate: ['roles'] }, params));

  return strapi.db.query('admin::user').findPage(query);
};

/** Delete a user
 * @param id id of the user to delete
 */
const deleteById = async (id: Data.ID): Promise<AdminUser | null> => {
  // Check at least one super admin remains
  const userToDelete: AdminUser | null = await strapi.db.query('admin::user').findOne({
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

  const deletedUser = await strapi.db
    .query('admin::user')
    .delete({ where: { id }, populate: ['roles'] });

  strapi.eventHub.emit('user.delete', { user: sanitizeUser(deletedUser) });

  return deletedUser;
};

/** Delete a user
 * @param ids ids of the users to delete
 */
const deleteByIds = async (ids: (string | number)[]): Promise<AdminUser[]> => {
  // Check at least one super admin remains
  const superAdminRole = await getService('role').getSuperAdminWithUsersCount();
  const nbOfSuperAdminToDelete = await strapi.db.query('admin::user').count({
    where: {
      id: ids,
      roles: { id: superAdminRole.id },
    },
  });

  if (superAdminRole.usersCount === nbOfSuperAdminToDelete) {
    throw new ValidationError('You must have at least one user with super admin role.');
  }

  const deletedUsers = [] as AdminUser[];
  for (const id of ids) {
    const deletedUser = await strapi.db.query('admin::user').delete({
      where: { id },
      populate: ['roles'],
    });

    deletedUsers.push(deletedUser);
  }

  strapi.eventHub.emit('user.delete', {
    users: deletedUsers.map((deletedUser) => sanitizeUser(deletedUser)),
  });

  return deletedUsers;
};

/** Count the users that don't have any associated roles
 */
const countUsersWithoutRole = async (): Promise<number> => {
  return strapi.db.query('admin::user').count({
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
 */
const count = async (where = {}): Promise<number> => {
  return strapi.db.query('admin::user').count({ where });
};

/**
 * Assign some roles to several users
 */
const assignARoleToAll = async (roleId: Data.ID): Promise<void> => {
  const users = await strapi.db.query('admin::user').findMany({
    select: ['id'],
    where: {
      roles: { id: { $null: true } },
    },
  });

  await Promise.all(
    users.map((user) => {
      return strapi.db.query('admin::user').update({
        where: { id: user.id },
        data: { roles: [roleId] },
      });
    })
  );
};

/** Display a warning if some users don't have at least one role
 */
const displayWarningIfUsersDontHaveRole = async (): Promise<void> => {
  const count = await countUsersWithoutRole();

  if (count > 0) {
    strapi.log.warn(`Some users (${count}) don't have any role.`);
  }
};

/** Returns an array of interface languages currently used by users
 */
const getLanguagesInUse = async (): Promise<string[]> => {
  const users = await strapi.db.query('admin::user').findMany({ select: ['preferedLanguage'] });

  return users.map((user) => user.preferedLanguage || 'en');
};

/**
 * Generate an AI token for the given user
 * @param user - The user to generate the token for
 */
const getAiToken = async (user: AdminUser): Promise<{ token: string; expiresAt?: string }> => {
  const ERROR_PREFIX = 'AI token request failed:';

  // Check if EE features are enabled first
  if (!strapi.ee?.isEE) {
    strapi.log.error(`${ERROR_PREFIX} Enterprise Edition features are not enabled`);
    throw new Error('AI token request failed. Check server logs for details.');
  }

  // Get the EE license
  // First try environment variable, then try reading from file
  let eeLicense = process.env.STRAPI_LICENSE;

  if (!eeLicense) {
    try {
      const licensePath = path.join(strapi.dirs.app.root, 'license.txt');
      eeLicense = fs.readFileSync(licensePath).toString();
    } catch (error) {
      // License file doesn't exist or can't be read
    }
  }

  if (!eeLicense) {
    strapi.log.error(
      `${ERROR_PREFIX} No EE license found. Please ensure STRAPI_LICENSE environment variable is set or license.txt file exists.`
    );
    throw new Error('AI token request failed. Check server logs for details.');
  }

  const aiServerUrl = process.env.STRAPI_ADMIN_AI_URL || process.env.STRAPI_AI_URL;

  if (!aiServerUrl) {
    strapi.log.error(
      `${ERROR_PREFIX} AI server URL not configured. Please set STRAPI_ADMIN_AI_URL or STRAPI_AI_URL environment variable.`
    );
    throw new Error('AI token request failed. Check server logs for details.');
  }

  // Create a secure user identifier using only user ID
  const userIdentifier = user.id.toString();

  // Get project ID
  const projectId = strapi.config.get('uuid');
  if (!projectId) {
    strapi.log.error(`${ERROR_PREFIX} Project ID not configured`);
    throw new Error('AI token request failed. Check server logs for details.');
  }

  strapi.log.http('Contacting AI Server for token generation');

  try {
    // Call the AI server's getAiJWT endpoint
    const response = await fetch(`${aiServerUrl}/auth/getAiJWT`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // No authorization header needed for public endpoint
        // Add request ID for tracing
        'X-Request-Id': crypto.randomUUID(),
      },
      body: JSON.stringify({
        eeLicense,
        userIdentifier,
        projectId,
      }),
    });

    if (!response.ok) {
      let errorData;
      let errorText;
      try {
        errorText = await response.text();
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { error: errorText || 'Failed to parse error response' };
      }

      strapi.log.error(`${ERROR_PREFIX} ${errorData?.error || 'Unknown error'}`, {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
        errorText,
        projectId,
      });

      throw new Error('AI token request failed. Check server logs for details.');
    }

    let data;
    try {
      data = (await response.json()) as {
        jwt: string;
        expiresAt?: string;
      };
    } catch (parseError) {
      strapi.log.error(`${ERROR_PREFIX} Failed to parse AI server response`, parseError);
      throw new Error('AI token request failed. Check server logs for details.');
    }

    if (!data.jwt) {
      strapi.log.error(`${ERROR_PREFIX} Invalid response: missing JWT token`);
      throw new Error('AI token request failed. Check server logs for details.');
    }

    strapi.log.info('AI token generated successfully', {
      userId: user.id,
      expiresAt: data.expiresAt,
    });

    // Return the AI JWT with metadata
    // Note: Token expires in 1 hour, client should handle refresh
    return {
      token: data.jwt,
      expiresAt: data.expiresAt, // 1 hour from generation
    };
  } catch (fetchError) {
    if (fetchError instanceof Error && fetchError.name === 'AbortError') {
      strapi.log.error(`${ERROR_PREFIX} Request to AI server timed out`);
      throw new Error('AI token request failed. Check server logs for details.');
    }

    throw fetchError;
  }
};

export default {
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
  isFirstSuperAdminUser,
  getAiToken,
};
