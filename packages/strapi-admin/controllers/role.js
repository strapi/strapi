'use strict';

const _ = require('lodash');
const { yup, formatYupErrors } = require('strapi-utils');
const { validateRoleUpdateInput } = require('../validation/role');
const { validatedUpdatePermissionsInput } = require('../validation/permission');

module.exports = {
  /**
   * Returns on role by id
   * @param {KoaContext} ctx - koa context
   */
  async findOne(ctx) {
    const { id } = ctx.params;
    const role = await strapi.admin.services.role.findOneWithUsersCount({ id });

    if (!role) {
      return ctx.notFound('role.notFound');
    }

    ctx.body = {
      data: role,
    };
  },

  /**
   * Returns every roles
   * @param {KoaContext} ctx - koa context
   */
  async findAll(ctx) {
    const roles = await strapi.admin.services.role.findAllWithUsersCount();

    ctx.body = {
      data: roles,
    };
  },

  /**
   * Updates a role by id
   * @param {KoaContext} ctx - koa context
   */
  async update(ctx) {
    const { id } = ctx.params;

    try {
      await validateRoleUpdateInput(ctx.request.body);
    } catch (err) {
      return ctx.badRequest('ValidationError', err);
    }

    const role = await strapi.admin.services.role.update({ id }, ctx.request.body);

    if (!role) {
      return ctx.notFound('role.notFound');
    }

    const sanitizedRole = strapi.admin.services.role.sanitizeRole(role);

    ctx.body = {
      data: sanitizedRole,
    };
  },

  /**
   * Returns the permissions assigned to a role
   * @param {KoaContext} ctx - koa context
   */
  async getPermissions(ctx) {
    const { id } = ctx.params;

    const role = await strapi.admin.services.role.findOne({ id });

    if (!role) {
      return ctx.notFound('role.notFound');
    }

    const permissions = await strapi.admin.services.permission.find({ role: role.id, _limit: -1 });

    ctx.body = {
      data: permissions,
    };
  },

  /**
   * Updates the permissions assigned to a role
   * @param {KoaContext} ctx - koa context
   */
  async updatePermissions(ctx) {
    const { id } = ctx.params;
    const input = _.cloneDeep(ctx.request.body);

    try {
      const superAdminRole = await strapi.admin.services.role.getAdmin();
      if (superAdminRole && String(superAdminRole.id) === String(id)) {
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

    let existingPermissions = strapi.admin.services.permission.actionProvider.getAllByMap();
    if (['strapi-author', 'strapi-editor'].includes(role.code)) {
      input.permissions
        .filter(p => existingPermissions.get(p.action).section === 'contentTypes')
        .forEach(p => {
          p.conditions = role.code === 'strapi-author' ? ['isOwner'] : [];
        });
    }

    const permissions = await strapi.admin.services.permission.assign(role.id, input.permissions);

    ctx.body = {
      data: permissions,
    };
  },
};
