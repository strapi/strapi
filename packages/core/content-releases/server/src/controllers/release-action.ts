import type Koa from 'koa';
import type { UID } from '@strapi/types';
import { validateReleaseActionCreateSchema } from './validation/release-action';
import type { CreateReleaseAction, GetReleaseActions, ReleaseAction } from '../../../shared/contracts/release-actions';
import { getAllowedContentTypes, getService } from '../utils';

const CONTENT_MANAGER_READ_ACTION = 'plugin::content-manager.explorer.read';

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
    
    const morphSanitizedPopulate = await allowedContentTypes.reduce(async (promiseAccumulator, contentTypeUid) => {
      const accumulator = await promiseAccumulator;

      const permissionsManager = await strapi.admin.services.permission.createPermissionsManager({
        ability: ctx.state.userAbility,
        model: contentTypeUid
      });

      // We create this to filter populated entries based on custom conditions on permissions
      accumulator[contentTypeUid] = {
        filters: permissionsManager.getQuery(CONTENT_MANAGER_READ_ACTION)
      };

      return accumulator;
    }, Promise.resolve({} as Record<UID.ContentType, { filters: object }>));


    const releaseService = getService('release', { strapi });
    const { results, pagination } = await releaseService.findActions(releaseId, allowedContentTypes, { 
      populate: {
        entry: {
          on: morphSanitizedPopulate
        }
      }
    });

    // Because this is a morphTo relation, we need to sanitize each entry separately based on its contentType
    const sanitizedResult = await Promise.all(results.map(async (action: ReleaseAction) => {
      const permissionsManager = strapi.admin.services.permission.createPermissionsManager({
        ability: ctx.state.userAbility,
        model: action.contentType
      });

      return {
        ...action,
        entry: action.entry && await permissionsManager.sanitizeOutput(
          action.entry, 
          { 
            action: CONTENT_MANAGER_READ_ACTION, 
            subject: permissionsManager.toSubject(action.entry, action.contentType) 
          })
      };
    }));

    ctx.body = {
      data: sanitizedResult,
      meta: {
        pagination
      }
    };
  }
};

export default releaseActionController;
