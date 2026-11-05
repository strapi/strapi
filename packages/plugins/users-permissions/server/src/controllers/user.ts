import type { Context } from 'koa';
import type { Core } from '@strapi/types';

import _ from 'lodash';
import { errors } from '@strapi/utils';
import type { PluginContext, AdvancedSettings } from '../types';
import { createExtensibleController } from './create-extensible-controller';
import { getService } from '../utils';
import { validateCreateUserBody, validateUpdateUserBody } from './validation/user';

const { ApplicationError, ValidationError, NotFoundError } = errors;

const sanitizeOutput = async (strapi: Core.Strapi, user: unknown, ctx: Context) => {
  const schema = strapi.getModel('plugin::users-permissions.user');
  const { auth } = ctx.state;

  return strapi.contentAPI.sanitize.output(user, schema, { auth });
};

const validateQuery = async (strapi: Core.Strapi, query: Context['query'], ctx: Context) => {
  const schema = strapi.getModel('plugin::users-permissions.user');
  const { auth } = ctx.state;

  return strapi.contentAPI.validate.query(query, schema, { auth });
};

const sanitizeQuery = async (strapi: Core.Strapi, query: Context['query'], ctx: Context) => {
  const schema = strapi.getModel('plugin::users-permissions.user');
  const { auth } = ctx.state;

  return strapi.contentAPI.sanitize.query(query, schema, { auth });
};

/** Create controller actions for this Strapi instance. */
export default createExtensibleController(({ strapi }: PluginContext) => ({
  /**
   * Create a/an user record.
   * @return {Object}
   */
  async create(ctx: Context) {
    const advanced = (await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
      .get()) as AdvancedSettings;

    await validateCreateUserBody(ctx.request.body);

    const { email, username, role } = ctx.request.body;

    const userWithSameUsername = await strapi.db
      .query('plugin::users-permissions.user')
      .findOne({ where: { username } });

    if (userWithSameUsername) {
      if (!email) throw new ApplicationError('Username already taken');
    }

    if (advanced.unique_email) {
      const userWithSameEmail = await strapi.db
        .query('plugin::users-permissions.user')
        .findOne({ where: { email: email.toLowerCase() } });

      if (userWithSameEmail) {
        throw new ApplicationError('Email already taken');
      }
    }

    const user = {
      ...ctx.request.body,
      email: email.toLowerCase(),
      provider: 'local',
    };

    if (!role) {
      const defaultRole = await strapi.db
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: advanced.default_role } });

      user.role = defaultRole.id;
    }

    try {
      const data = await getService(strapi, 'user').add(user);
      const sanitizedData = await sanitizeOutput(strapi, data, ctx);

      ctx.created(sanitizedData);
    } catch (error) {
      throw new ApplicationError(error instanceof Error ? error.message : undefined);
    }
  },

  /**
   * Update a/an user record.
   * @return {Object}
   */
  async update(ctx: Context) {
    const advancedConfigs = (await strapi
      .store({ type: 'plugin', name: 'users-permissions', key: 'advanced' })
      .get()) as AdvancedSettings;

    const { id } = ctx.params;
    const { email, username, password } = ctx.request.body;

    const user = await getService(strapi, 'user').fetch(id);
    if (!user) {
      throw new NotFoundError(`User not found`);
    }

    await validateUpdateUserBody(ctx.request.body);

    if (user.provider === 'local' && _.has(ctx.request.body, 'password') && !password) {
      throw new ValidationError('password.notNull');
    }

    if (_.has(ctx.request.body, 'username')) {
      const userWithSameUsername = await strapi.db
        .query('plugin::users-permissions.user')
        .findOne({ where: { username } });

      if (userWithSameUsername && _.toString(userWithSameUsername.id) !== _.toString(id)) {
        throw new ApplicationError('Username already taken');
      }
    }

    if (_.has(ctx.request.body, 'email') && advancedConfigs.unique_email) {
      const userWithSameEmail = await strapi.db
        .query('plugin::users-permissions.user')
        .findOne({ where: { email: email.toLowerCase() } });

      if (userWithSameEmail && _.toString(userWithSameEmail.id) !== _.toString(id)) {
        throw new ApplicationError('Email already taken');
      }
      ctx.request.body.email = ctx.request.body.email.toLowerCase();
    }

    const updateData = {
      ...ctx.request.body,
    };

    const data = await getService(strapi, 'user').edit(user.id, updateData);
    const sanitizedData = await sanitizeOutput(strapi, data, ctx);

    ctx.send(sanitizedData);
  },

  /**
   * Retrieve user records.
   * @return {Object|Array}
   */
  async find(ctx: Context) {
    await validateQuery(strapi, ctx.query, ctx);
    const sanitizedQuery = await sanitizeQuery(strapi, ctx.query, ctx);
    const users = await getService(strapi, 'user').fetchAll(sanitizedQuery);

    ctx.body = await Promise.all(users.map((user) => sanitizeOutput(strapi, user, ctx)));
  },

  /**
   * Retrieve a user record.
   * @return {Object}
   */
  async findOne(ctx: Context) {
    const { id } = ctx.params;
    await validateQuery(strapi, ctx.query, ctx);
    const sanitizedQuery = await sanitizeQuery(strapi, ctx.query, ctx);

    const data = await getService(strapi, 'user').fetch(id, sanitizedQuery);

    ctx.body = data ? await sanitizeOutput(strapi, data, ctx) : data;
  },

  /**
   * Retrieve user count.
   * @return {Number}
   */
  async count(ctx: Context) {
    await validateQuery(strapi, ctx.query, ctx);
    const sanitizedQuery = await sanitizeQuery(strapi, ctx.query, ctx);

    ctx.body = await getService(strapi, 'user').count(sanitizedQuery);
  },

  /**
   * Destroy a/an user record.
   * @return {Object}
   */
  async destroy(ctx: Context) {
    const { id } = ctx.params;

    const data = await getService(strapi, 'user').remove({ id });
    const sanitizedUser = await sanitizeOutput(strapi, data, ctx);

    ctx.send(sanitizedUser);
  },

  /**
   * Retrieve authenticated user.
   * @return {Object|Array}
   */
  async me(ctx: Context) {
    const authUser = ctx.state.user;
    const { query } = ctx;

    if (!authUser) {
      return ctx.unauthorized();
    }

    await validateQuery(strapi, query, ctx);
    const sanitizedQuery = await sanitizeQuery(strapi, query, ctx);
    const user = await getService(strapi, 'user').fetch(authUser.id, sanitizedQuery);

    ctx.body = await sanitizeOutput(strapi, user, ctx);
  },
}));
