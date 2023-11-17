import type Koa from 'koa';
import { RELEASE_MODEL_UID } from '../constants';
import { validateRelease } from './validation/release';
import { ReleaseCreateArgs, ReleaseUpdateArgs, UserInfo } from '../../../shared/types';
import { getService } from '../utils';

const releaseController = {
  async findMany(ctx: Koa.Context) {
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

    await validateRelease(releaseArgs);

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

  async update(ctx: Koa.Context) {
    const user: UserInfo = ctx.state.user;
    const releaseArgs: ReleaseUpdateArgs = ctx.request.body;
    const id: number = ctx.params.id;

    await validateRelease(releaseArgs);

    const releaseService = getService('release', { strapi });
    const release = await releaseService.update(id, releaseArgs, { user });

    const permissionsManager = strapi.admin.services.permission.createPermissionsManager({
      ability: ctx.state.userAbility,
      model: RELEASE_MODEL_UID,
    });

    ctx.body = {
      data: await permissionsManager.sanitizeOutput(release),
    };
  }
};

export default releaseController;
