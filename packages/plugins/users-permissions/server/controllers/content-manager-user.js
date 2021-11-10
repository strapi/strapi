'use strict';

const _ = require('lodash');
const { contentTypes: contentTypesUtils } = require('@strapi/utils');
const {
  ApplicationError,
  ValidationError,
  NotFoundError,
  ForbiddenError,
} = require('@strapi/utils').errors;
const { validateCreateUserBody, validateUpdateUserBody } = require('./validation/user');

const { UPDATED_BY_ATTRIBUTE, CREATED_BY_ATTRIBUTE } = contentTypesUtils.constants;

const userModel = 'plugin::users-permissions.user';
const ACTIONS = {
  read: 'plugin::content-manager.explorer.read',
  create: 'plugin::content-manager.explorer.create',
  edit: 'plugin::content-manager.explorer.update',
  delete: 'plugin::content-manager.explorer.delete',
};

const findEntityAndCheckPermissions = async (ability, action, model, id) => {
  const entity = await strapi.query(userModel).findOne({
    where: { id },
    populate: [`${CREATED_BY_ATTRIBUTE}.roles`],
  });

  if (_.isNil(entity)) {
    throw new NotFoundError();
  }

  const pm = strapi.admin.services.permission.createPermissionsManager({ ability, action, model });

  if (pm.ability.cannot(pm.action, pm.toSubject(entity))) {
    throw new ForbiddenError();
  }

  const entityWithoutCreatorRoles = _.omit(entity, `${CREATED_BY_ATTRIBUTE}.roles`);

  return { pm, entity: entityWithoutCreatorRoles };
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

    const sanitizedBody = await pm.pickPermittedFieldsOf(body, { subject: userModel });

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
      const data = await strapi
        .service('plugin::content-manager.entity-manager')
        .create(user, userModel);
      const sanitizedData = await pm.sanitizeOutput(data, { action: ACTIONS.read });

      ctx.created(sanitizedData);
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

    const { pm: permissionManager, entity } = await findEntityAndCheckPermissions(
      userAbility,
      ACTIONS.edit,
      userModel,
      id
    );
    pm = permissionManager;
    user = entity;

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

    const sanitizedData = await pm.pickPermittedFieldsOf(body, { subject: pm.toSubject(user) });
    const updateData = _.omit({ ...sanitizedData, updatedBy: admin.id }, 'createdBy');

    const data = await strapi
      .service('plugin::content-manager.entity-manager')
      .update({ id }, updateData, userModel);

    ctx.body = await pm.sanitizeOutput(data, { action: ACTIONS.read });
  },
};
