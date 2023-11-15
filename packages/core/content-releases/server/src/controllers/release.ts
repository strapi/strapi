import type Koa from 'koa';
import { errors } from '@strapi/utils';
import { RELEASE_MODEL_UID } from '../constants';
import { validateCreateRelease } from './validation/release';
import { ReleaseCreateArgs, UserInfo } from '../../../shared/types';
import { getService } from '../utils';

const { ApplicationError } = errors;

const releaseController = {
  async findMany(ctx: Koa.Context) {
    const user: UserInfo = ctx.state.user;

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

    ctx.body = await getService('release', { strapi }).findMany(query);
  },

  async create(ctx: Koa.Context) {
    const user: UserInfo = ctx.state.user;
    const releaseArgs: ReleaseCreateArgs = ctx.request.body;

    // Releases can only be created by super admins until we figure out how to handle permissions
    if (!strapi.admin.services.role.hasSuperAdminRole(user)) {
      throw new ApplicationError('Content Releases is a superadmin only feature');
    }

    await validateCreateRelease(releaseArgs);

    const releaseService = getService('release', { strapi });
    const release = await releaseService.create(releaseArgs, { user });

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
