'use strict';

const _ = require('lodash');

const formatError = error => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];

const userModel = 'plugins::users-permissions.user';
const ACTIONS = {
  read: 'plugins::content-manager.explorer.read',
  create: 'plugins::content-manager.explorer.create',
  edit: 'plugins::content-manager.explorer.update',
  delete: 'plugins::content-manager.explorer.delete',
};

const findEntityAndCheckPermissions = async (ability, action, model, id) => {
  const entity = await strapi.query('user', 'users-permissions').findOne({ id });

  if (_.isNil(entity)) {
    throw strapi.errors.notFound();
  }

  const pm = strapi.admin.services.permission.createPermissionsManager(ability, action, model);

  const roles = _.has(entity, 'created_by.id')
    ? await strapi.query('role', 'admin').find({ users: entity.created_by.id }, [])
    : [];
  const entityWithRoles = _.set(_.cloneDeep(entity), 'created_by.roles', roles);

  if (pm.ability.cannot(pm.action, pm.toSubject(entityWithRoles))) {
    throw strapi.errors.forbidden();
  }

  return { pm, entity };
};

module.exports = {
  /**
   * Create a/an user record.
   * @return {Object}
   */
  async create(ctx) {
    const {
      request: { body },
      state: { userAbility, admin },
    } = ctx;
    const { email, username, password } = body;

    const pm = strapi.admin.services.permission.createPermissionsManager(
      userAbility,
      ACTIONS.create,
      userModel
    );

    if (!pm.isAllowed) {
      throw strapi.errors.forbidden();
    }

    const sanitizedBody = pm.pickPermittedFieldsOf(body, { subject: userModel });

    const advanced = await strapi
      .store({
        environment: '',
        type: 'plugin',
        name: 'users-permissions',
        key: 'advanced',
      })
      .get();

    if (!email) return ctx.badRequest('missing.email');
    if (!username) return ctx.badRequest('missing.username');
    if (!password) return ctx.badRequest('missing.password');

    const userWithSameUsername = await strapi
      .query('user', 'users-permissions')
      .findOne({ username });

    if (userWithSameUsername) {
      return ctx.badRequest(
        null,
        formatError({
          id: 'Auth.form.error.username.taken',
          message: 'Username already taken.',
          field: ['username'],
        })
      );
    }

    if (advanced.unique_email) {
      const userWithSameEmail = await strapi.query('user', 'users-permissions').findOne({ email });

      if (userWithSameEmail) {
        return ctx.badRequest(
          null,

          formatError({
            id: 'Auth.form.error.email.taken',
            message: 'Email already taken.',
            field: ['email'],
          })
        );
      }
    }

    const user = {
      ...sanitizedBody,
      provider: 'local',
      created_by: admin.id,
      updated_by: admin.id,
    };

    if (!user.role) {
      const defaultRole = await strapi
        .query('role', 'users-permissions')
        .findOne({ type: advanced.default_role }, []);

      user.role = defaultRole.id;
    }

    try {
      const data = await strapi.plugins['users-permissions'].services.user.add(user);

      ctx.created(pm.sanitize(data, { action: ACTIONS.read }));
    } catch (error) {
      ctx.badRequest(null, formatError(error));
    }
  },
  /**
   * Update a/an user record.
   * @return {Object}
   */

  async update(ctx) {
    const advancedConfigs = await strapi
      .store({
        environment: '',
        type: 'plugin',
        name: 'users-permissions',
        key: 'advanced',
      })
      .get();

    const {
      params: { id },
      request: { body },
      state: { userAbility, admin },
    } = ctx;
    const { email, username, password } = body;

    const { pm, entity: user } = await findEntityAndCheckPermissions(
      userAbility,
      ACTIONS.edit,
      userModel,
      id
    );

    if (_.has(body, 'email') && !email) {
      return ctx.badRequest('email.notNull');
    }

    if (_.has(body, 'username') && !username) {
      return ctx.badRequest('username.notNull');
    }

    if (_.has(body, 'password') && !password && user.provider === 'local') {
      return ctx.badRequest('password.notNull');
    }

    if (_.has(body, 'username')) {
      const userWithSameUsername = await strapi
        .query('user', 'users-permissions')
        .findOne({ username });

      if (userWithSameUsername && userWithSameUsername.id != id) {
        return ctx.badRequest(
          null,
          formatError({
            id: 'Auth.form.error.username.taken',
            message: 'username.alreadyTaken.',
            field: ['username'],
          })
        );
      }
    }

    if (_.has(body, 'email') && advancedConfigs.unique_email) {
      const userWithSameEmail = await strapi.query('user', 'users-permissions').findOne({ email });

      if (userWithSameEmail && userWithSameEmail.id != id) {
        return ctx.badRequest(
          null,
          formatError({
            id: 'Auth.form.error.email.taken',
            message: 'Email already taken',
            field: ['email'],
          })
        );
      }
    }

    const sanitizedData = pm.pickPermittedFieldsOf(body, { subject: pm.toSubject(user) });
    const updateData = _.omit({ ...sanitizedData, updated_by: admin.id }, 'created_by');

    if (_.has(body, 'password') && password === user.password) {
      delete updateData.password;
    }

    const data = await strapi.plugins['users-permissions'].services.user.edit({ id }, updateData);

    ctx.body = pm.sanitize(data, { action: ACTIONS.read });
  },
};
