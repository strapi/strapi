import type Koa from 'koa';
import { errors } from '@strapi/utils';
import { validateReleaseActionCreateSchema } from './validation/release-action';
import { ReleaseActionCreateArgs, UserInfo } from '../../../shared/types';
import { getService } from '../utils';

const releaseActionController = {
  async create(ctx: Koa.Context) {
    const user: UserInfo = ctx.state.user;
    const releaseActionArgs: ReleaseActionCreateArgs = ctx.request.body;

    // Check permissions: releases can only be managed by super admins for now
    if (!strapi.admin.services.role.hasSuperAdminRole(user)) {
      throw new errors.ApplicationError('Content Releases is a superadmin only feature');
    }

    await validateReleaseActionCreateSchema(releaseActionArgs);

    const releaseService = getService('release', { strapi });
    const { releaseId, ...action } = releaseActionArgs;
    const releaseAction = await releaseService.createAction(releaseId, action);

    ctx.body = {
      data: releaseAction,
    };
  },
};

export default releaseActionController;
