import type Koa from 'koa';
import { validateReleaseActionCreateSchema } from './validation/release-action';
import { ReleaseActionCreateArgs } from '../../../shared/types';
import { getService } from '../utils';

const releaseActionController = {
  async create(ctx: Koa.Context) {
    const releaseActionArgs: ReleaseActionCreateArgs = ctx.request.body;

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
