'use strict';

const _ = require('lodash');
const { contentTypes: contentTypesUtils } = require('@strapi/utils');
const { ApplicationError, ValidationError } = require('@strapi/utils').errors;
const { getService } = require('../../utils');
const { validateCreateUserBody, validateUpdateUserBody } = require('../validation/user');

const { UPDATED_BY_ATTRIBUTE, CREATED_BY_ATTRIBUTE } = contentTypesUtils.constants;

const userModel = 'plugin::users-permissions.user';
const ACTIONS = {
  read: 'plugin::content-manager.explorer.read',
  create: 'plugin::content-manager.explorer.create',
  edit: 'plugin::content-manager.explorer.update',
  delete: 'plugin::content-manager.explorer.delete',
};

class NotFoundError extends Error {}
class ForbiddenError extends Error {}

const findEntityAndCheckPermissions = async (ability, action, model, id) => {
  const entity = await strapi.query('plugin::users-permissions.user').findOne({ where: { id } });

  if (_.isNil(entity)) {
    throw new NotFoundError();
  }

  const pm = strapi.admin.services.permission.createPermissionsManager({ ability, action, model });

  const roles = _.has(entity, `${CREATED_BY_ATTRIBUTE}.id`)
    ? await strapi.query('admin::role').findMany({
        where: {
          users: { id: entity[CREATED_BY_ATTRIBUTE].id },
        },
      })
    : [];

  const entityWithRoles = _.set(_.cloneDeep(entity), `${CREATED_BY_ATTRIBUTE}.roles`, roles);

  if (pm.ability.cannot(pm.action, pm.toSubject(entityWithRoles))) {
    throw new ForbiddenError();
  }

  return { pm, entity };
};

module.exports = {
  /**
   * Create a/an user record.
   * @return {Object}
   */
  async create(ctx) {
    const { body } = ctx.request;
    const { user: admin, userAbility } = ctx.state;

    const { email, username } = body;

    const pm = strapi.admin.services.permission.createPermissionsManager({
      ability: userAbility,
      action: ACTIONS.create,
      model: userModel,
    });

    if (!pm.isAllowed) {
      return ctx.forbidden();
    }

    const sanitizedBody = pm.pickPermittedFieldsOf(body, { subject: userModel });

    const advanced = await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
      .get();

    await validateCreateUserBody(ctx.request.body);

    const userWithSameUsername = await strapi
      .query('plugin::users-permissions.user')
      .findOne({ where: { username } });

    if (userWithSameUsername) {
      throw new ApplicationError('Username already taken');
    }

    if (advanced.unique_email) {
      const userWithSameEmail = await strapi
        .query('plugin::users-permissions.user')
        .findOne({ where: { email: email.toLowerCase() } });

      if (userWithSameEmail) {
        throw new ApplicationError('Email already taken');
      }
    }

    const user = {
      ...sanitizedBody,
      provider: 'local',
      [CREATED_BY_ATTRIBUTE]: admin.id,
      [UPDATED_BY_ATTRIBUTE]: admin.id,
    };

    user.email = _.toLower(user.email);

    if (!user.role) {
      const defaultRole = await strapi
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: advanced.default_role } });

      user.role = defaultRole.id;
    }

    try {
      const data = await getService('user').add(user);

      ctx.created(pm.sanitize(data, { action: ACTIONS.read }));
    } catch (error) {
      throw new ApplicationError(error.message);
    }
  },
  /**
   * Update a/an user record.
   * @return {Object}
   */

  async update(ctx) {
    const { id } = ctx.params;
    const { body } = ctx.request;
    const { user: admin, userAbility } = ctx.state;

    const advancedConfigs = await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
      .get();

    const { email, username, password } = body;

    let pm;
    let user;

    try {
      const { pm: permissionManager, entity } = await findEntityAndCheckPermissions(
        userAbility,
        ACTIONS.edit,
        userModel,
        id
      );
      pm = permissionManager;
      user = entity;
    } catch (e) {
      if (e instanceof NotFoundError) return ctx.notFound();
      if (e instanceof ForbiddenError) return ctx.forbidden();
      throw e;
    }

    await validateUpdateUserBody(ctx.request.body);

    if (_.has(body, 'password') && !password && user.provider === 'local') {
      throw new ValidationError('password.notNull');
    }

    if (_.has(body, 'username')) {
      const userWithSameUsername = await strapi
        .query('plugin::users-permissions.user')
        .findOne({ where: { username } });

      if (userWithSameUsername && userWithSameUsername.id != id) {
        throw new ApplicationError('Username already taken');
      }
    }

    if (_.has(body, 'email') && advancedConfigs.unique_email) {
      const userWithSameEmail = await strapi
        .query('plugin::users-permissions.user')
        .findOne({ where: { email: _.toLower(email) } });

      if (userWithSameEmail && userWithSameEmail.id != id) {
        throw new ApplicationError('Email already taken');
      }
      body.email = _.toLower(body.email);
    }

    const sanitizedData = pm.pickPermittedFieldsOf(body, { subject: pm.toSubject(user) });
    const updateData = _.omit({ ...sanitizedData, updatedBy: admin.id }, 'createdBy');

    const data = await getService('user').edit({ id }, updateData);

    ctx.body = pm.sanitize(data, { action: ACTIONS.read });
  },
};
