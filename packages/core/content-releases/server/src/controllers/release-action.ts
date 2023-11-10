import type Koa from 'koa';
import { errors } from '@strapi/utils';
import {
  validateReleaseActionCreateSchema,
  validateUniqueEntryInRelease,
} from './validation/release-action';
import { ReleaseActionCreateArgs, UserInfo } from '../types';

const releaseActionController = {
  async create(ctx: Koa.Context) {
    const user: UserInfo = ctx.state.user;
    const releaseActionArgs: ReleaseActionCreateArgs = ctx.request.body;

    // Check permissions: releases can only be managed by super admins for now
    if (!strapi.admin.services.role.hasSuperAdminRole(user)) {
      throw new errors.ApplicationError('Content Releases is a superadmin only feature');
    }

    await validateReleaseActionCreateSchema(releaseActionArgs);
    await validateUniqueEntryInRelease(releaseActionArgs);

    const releaseActionService = strapi.plugin('content-releases').service('release-action');
    // TODO: releaseAction is of type any when the create service return is of type Promise<GetValues<"plugin::content-releases.release-action", string>> ...?
    const releaseAction = await releaseActionService.create(releaseActionArgs);

    ctx.body = {
      data: releaseAction,
    };
  },
};

export default releaseActionController;
