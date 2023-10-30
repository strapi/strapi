import type Koa from 'koa';
import { errors } from '@strapi/utils';
import { RELEASE_MODEL_UID } from '../constants';
import { validateCreateRelease } from './validation/release';

const { ApplicationError } = errors;

const releaseController = {
  async find(ctx: Koa.Context) {
    const { user } = ctx.state;

    // Releases can only be find by super admins until we figure out how to handle permissions
    if (!strapi.admin.services.role.hasSuperAdminRole(user)) {
      throw new ApplicationError('Content Releases is a superadmin only feature');
    }

    const permissionsManager = strapi.admin.services.permission.createPermissionsManager({
      ability: ctx.state.userAbility,
      model: RELEASE_MODEL_UID,
    });

    await permissionsManager.validateQuery(ctx.query);
    const query = await permissionsManager.sanitizeQuery(ctx.query);

    const { results, pagination } = await strapi.entityService.findWithRelationCountsPage(
      RELEASE_MODEL_UID,
      {
        ...query,
        populate: {
          actions: {
            count: true,
          },
        },
      }
    );

    ctx.body = {
      data: await permissionsManager.sanitizeOutput(results),
      pagination,
    };
  },

  async create(ctx: Koa.Context) {
    const { user } = ctx.state;
    const { body } = ctx.request;

    // Releases can only be created by super admins until we figure out how to handle permissions
    if (!strapi.admin.services.role.hasSuperAdminRole(user)) {
      throw new ApplicationError('Content Releases is a superadmin only feature');
    }

    await validateCreateRelease(body);

    const releaseService = strapi.plugin('content-releases').service('release');

    const release = await releaseService.create(body, { user });

    const permissionsManager = strapi.admin.services.permission.createPermissionsManager({
      ability: ctx.state.userAbility,
      model: RELEASE_MODEL_UID,
    });

    ctx.body = {
      data: await permissionsManager.sanitizeOutput(release),
    };
  },
};

export default releaseController;
