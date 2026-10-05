import type { Context } from 'koa';
import type { Core } from '@strapi/types';
import _ from 'lodash';
import { async, errors } from '@strapi/utils';
import type { PluginContext } from '../types';
import { getService } from '../utils';
import { validateDeleteRoleBody } from './validation/user';

const { ApplicationError, ValidationError } = errors;

const sanitizeOutput = async (strapi: Core.Strapi, role: unknown) => {
  const { sanitizeLocalizationFields } = strapi.plugin('i18n').service('sanitize');
  const schema = strapi.getModel('plugin::users-permissions.role');

  return async.pipe(sanitizeLocalizationFields(schema))(role);
};

/** Create controller actions for this Strapi instance. */
export default ({ strapi }: PluginContext) => ({
  /**
   * Default action.
   *
   * @return {Object}
   */
  async createRole(ctx: Context) {
    if (_.isEmpty(ctx.request.body)) {
      throw new ValidationError('Request body cannot be empty');
    }

    await getService(strapi, 'role').createRole(ctx.request.body);

    ctx.send({ ok: true });
  },

  async findOne(ctx: Context) {
    const { id } = ctx.params;

    const role = await getService(strapi, 'role').findOne(id);

    if (!role) {
      return ctx.notFound();
    }

    const safeRole = await sanitizeOutput(strapi, role);

    ctx.send({ role: safeRole });
  },

  async find(ctx: Context) {
    const roles = await getService(strapi, 'role').find();

    const safeRoles = await Promise.all(roles.map((role) => sanitizeOutput(strapi, role)));

    ctx.send({ roles: safeRoles });
  },

  async updateRole(ctx: Context) {
    const roleID = ctx.params.role;

    if (_.isEmpty(ctx.request.body)) {
      throw new ValidationError('Request body cannot be empty');
    }

    await getService(strapi, 'role').updateRole(roleID, ctx.request.body);

    ctx.send({ ok: true });
  },

  async deleteRole(ctx: Context) {
    const roleID = ctx.params.role;

    if (!roleID) {
      await validateDeleteRoleBody(ctx.params);
    }

    // Fetch public role.
    const publicRole = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'public' } });

    const publicRoleID = publicRole.id;

    // Prevent from removing the public role.
    if (roleID.toString() === publicRoleID.toString()) {
      throw new ApplicationError('Cannot delete public role');
    }

    await getService(strapi, 'role').deleteRole(roleID, publicRoleID);

    ctx.send({ ok: true });
  },
});
