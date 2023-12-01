import type Koa from 'koa';
import { validateReleaseAction } from './validation/release-action';
import type { CreateReleaseAction } from '../../../shared/contracts/release-actions';
import { getService } from '../utils';

const releaseActionController = {
  async create(ctx: Koa.Context) {
    const releaseId: CreateReleaseAction.Request['params']['releaseId'] = ctx.params.releaseId;
    const releaseActionArgs: CreateReleaseAction.Request['body'] = ctx.request.body;

    await validateReleaseAction(releaseActionArgs);

    const releaseService = getService('release', { strapi });
    const releaseAction = await releaseService.createAction(releaseId, releaseActionArgs);

    ctx.body = {
      data: releaseAction,
    };
  },
};

export default releaseActionController;
