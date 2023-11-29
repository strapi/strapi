import type Koa from 'koa';
import { UID } from '@strapi/types';
import { validateReleaseActionCreateSchema } from './validation/release-action';
import type { CreateReleaseAction, GetReleaseActions, ReleaseAction } from '../../../shared/contracts/release-actions';
import { getAllowedContentTypes, getService, getPermissionsChecker } from '../utils';

const releaseActionController = {
  async create(ctx: Koa.Context) {
    const releaseId: CreateReleaseAction.Request['params']['releaseId'] = ctx.params.releaseId;
    const releaseActionArgs: CreateReleaseAction.Request['body'] = ctx.request.body;

    await validateReleaseActionCreateSchema(releaseActionArgs);

    const releaseService = getService('release', { strapi });
    const releaseAction = await releaseService.createAction(releaseId, releaseActionArgs);

    ctx.body = {
      data: releaseAction,
    };
  },
  async findMany(ctx: Koa.Context) {
    const releaseId: GetReleaseActions.Request['params']['releaseId'] = ctx.params.releaseId;
    const allowedContentTypes = getAllowedContentTypes({ strapi, userAbility: ctx.state.userAbility });

    // We create an object with the permissionsChecker for each contentType, then we can reuse it for sanitization
    const permissionsChecker: Record<UID.ContentType, any> = {};
    // We create a populate object for polymorphic relations, so we considered custom conditions on permissions
    const morphSanitizedPopulate: Record<UID.ContentType, any> = {};

    for (const contentTypeUid of allowedContentTypes) {
      const permissionChecker = await getPermissionsChecker({ strapi, userAbility: ctx.state.userAbility, model: contentTypeUid });
      permissionsChecker[contentTypeUid] = permissionChecker; 
      morphSanitizedPopulate[contentTypeUid] = await permissionChecker.sanitizedQuery.read({});
    }

    const releaseService = getService('release', { strapi });
    const { results, pagination } = await releaseService.findActions(releaseId, allowedContentTypes, { 
      populate: {
        entry: {
          on: morphSanitizedPopulate
        }
      }
    });

    // Because this is a morphTo relation, we need to sanitize each entry separately based on its contentType
    const sanitizedResults = await Promise.all(results.map(async (action: ReleaseAction) => {
      return {
        ...action,
        entry: action.entry && await permissionsChecker[action.contentType].sanitizeOutput(action.entry)
      };
    }));

    ctx.body = {
      data: sanitizedResults,
      meta: {
        pagination
      }
    };
  }
};

export default releaseActionController;
