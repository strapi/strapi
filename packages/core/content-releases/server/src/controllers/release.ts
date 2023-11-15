import type Koa from 'koa';
import { RELEASE_MODEL_UID } from '../constants';
import { validateCreateRelease } from './validation/release';

const releaseController = {
  async findMany(ctx: Koa.Context) {
    const permissionsManager = strapi.admin.services.permission.createPermissionsManager({
      ability: ctx.state.userAbility,
      model: RELEASE_MODEL_UID,
    });

    await permissionsManager.validateQuery(ctx.query);
    const query = await permissionsManager.sanitizeQuery(ctx.query);

    ctx.body = await strapi.plugin('content-releases').service('release').findMany(query);
  },

  async create(ctx: Koa.Context) {
    const { user } = ctx.state;
    const { body } = ctx.request;

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
