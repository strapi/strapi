'use strict';

const { yup, formatYupErrors } = require('strapi-utils');
const {
  validateRoleCreateInput,
  validateRoleUpdateInput,
  validateRolesDeleteInput,
  validateRoleDeleteInput,
} = require('../validation/role');
const { validatedUpdatePermissionsInput } = require('../validation/permission');

module.exports = {
  /**
   * Create a new role
   * @param {KoaContext} ctx - koa context
   */
  async create(ctx) {
    try {
      await validateRoleCreateInput(ctx.request.body);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    let role = await strapi.admin.services.role.create(ctx.request.body);

    const sanitizedRole = strapi.admin.services.role.sanitizeRole(role);
    ctx.created({ data: sanitizedRole });
  },

  /**
   * Update a role
   * @param {KoaContext} ctx - koa context
   */
  async update(ctx) {
    const { id } = ctx.params;

    try {
      await validateRoleUpdateInput(ctx.request.body, id);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    let role = await strapi.admin.services.role.update({ id }, ctx.request.body);
    if (!role) {
      return ctx.notFound('Role not found');
    }

    const sanitizedRole = strapi.admin.services.role.sanitizeRole(role);

    ctx.body = {
      data: sanitizedRole,
    };
  },

  /**
   * Delete a role
   * @param {KoaContext} ctx - koa context
   */
  async deleteOne(ctx) {
    const { id } = ctx.params;

    try {
      await validateRoleDeleteInput(id);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const roles = await strapi.admin.services.role.deleteByIds([id]);

    const sanitizedRole = roles.map(strapi.admin.services.role.sanitizeRole)[0] || null;

    ctx.body = {
      data: sanitizedRole,
    };
  },

  /**
   * delete several roles
   * @param {KoaContext} ctx - koa context
   */
  async deleteMany(ctx) {
    const { body } = ctx.request;
    try {
      await validateRolesDeleteInput(body);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const roles = await strapi.admin.services.role.deleteByIds(body.ids);
    const sanitizedRoles = roles.map(strapi.admin.services.role.sanitizeRole);

    ctx.body = {
      data: sanitizedRoles,
    };
  },

  /**
   * Updates the permissions assigned to a role
   * @param {KoaContext} ctx - koa context
   */
  async updatePermissions(ctx) {
    const { id } = ctx.params;
    const input = ctx.request.body;

    try {
      const superAdminRole = await strapi.admin.services.role.getAdmin();
      if (String(superAdminRole.id) === String(id)) {
        const err = new yup.ValidationError("Super admin permissions can't be edited.");
        throw formatYupErrors(err);
      }
      await validatedUpdatePermissionsInput(input);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const role = await strapi.admin.services.role.findOne({ id });

    if (!role) {
      return ctx.notFound('role.notFound');
    }

    const permissions = await strapi.admin.services.permission.assign(role.id, input.permissions);

    ctx.body = {
      data: permissions,
    };
  },
};
