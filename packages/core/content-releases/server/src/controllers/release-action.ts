import type Koa from 'koa';
import { UID } from '@strapi/types';
import { mapAsync } from '@strapi/utils';
import {
  validateReleaseAction,
  validateReleaseActionUpdateSchema,
} from './validation/release-action';
import type {
  CreateReleaseAction,
  GetReleaseActions,
  ReleaseAction,
  UpdateReleaseAction,
  DeleteReleaseAction,
} from '../../../shared/contracts/release-actions';
import { getAllowedContentTypes, getService, getPermissionsChecker } from '../utils';

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
  async findMany(ctx: Koa.Context) {
    const releaseId: GetReleaseActions.Request['params']['releaseId'] = ctx.params.releaseId;
    const allowedContentTypes = getAllowedContentTypes({
      strapi,
      userAbility: ctx.state.userAbility,
    });

    // We create an object with the permissionsChecker for each contentType, then we can reuse it for sanitization
    const permissionsChecker: Record<UID.ContentType, any> = {};
    // We create a populate object for polymorphic relations, so we considered custom conditions on permissions
    const morphSanitizedPopulate: Record<UID.ContentType, any> = {};

    for (const contentTypeUid of allowedContentTypes) {
      const permissionChecker = await getPermissionsChecker({
        strapi,
        userAbility: ctx.state.userAbility,
        model: contentTypeUid,
      });
      permissionsChecker[contentTypeUid] = permissionChecker;
      morphSanitizedPopulate[contentTypeUid] = await permissionChecker.sanitizedQuery.read({});
    }

    const releaseService = getService('release', { strapi });

    const { results, pagination } = await releaseService.findActions(
      releaseId,
      allowedContentTypes,
      {
        populate: {
          entry: {
            on: morphSanitizedPopulate,
          },
        },
      }
    );

    const contentTypesMainFields = await releaseService.findReleaseContentTypesMainFields(
      releaseId
    );
    // We loop over all the contentTypes mainfields to sanitize each mainField
    // By default, if user doesn't have permission to read the field, we return null as fallback
    for (const contentTypeUid of Object.keys(contentTypesMainFields)) {
      if (
        ctx.state.userAbility.cannot(
          'plugin::content-manager.explorer.read',
          contentTypeUid,
          contentTypesMainFields[contentTypeUid].mainField
        )
      ) {
        contentTypesMainFields[contentTypeUid].mainField = null;
      }
    }

    // Because this is a morphTo relation, we need to sanitize each entry separately based on its contentType
    const sanitizedResults = await mapAsync(results, async (action: ReleaseAction) => {
      const mainField = contentTypesMainFields[action.contentType].mainField;

      return {
        ...action,
        entry: action.entry && {
          id: action.entry.id,
          mainField: mainField ? action.entry[mainField] : null,
          locale: action.entry.locale,
        },
      };
    });

    ctx.body = {
      data: sanitizedResults,
      meta: {
        pagination,
      },
    };
  },
  async update(ctx: Koa.Context) {
    const actionId: UpdateReleaseAction.Request['params']['actionId'] = ctx.params.actionId;
    const releaseId: UpdateReleaseAction.Request['params']['releaseId'] = ctx.params.releaseId;
    const releaseActionUpdateArgs: UpdateReleaseAction.Request['body'] = ctx.request.body;

    await validateReleaseActionUpdateSchema(releaseActionUpdateArgs);

    const releaseService = getService('release', { strapi });
    const updatedAction = await releaseService.updateAction(
      actionId,
      releaseId,
      releaseActionUpdateArgs
    );

    ctx.body = {
      data: updatedAction,
    };
  },
  async delete(ctx: Koa.Context) {
    const actionId: DeleteReleaseAction.Request['params']['actionId'] = ctx.params.actionId;
    const releaseId: DeleteReleaseAction.Request['params']['releaseId'] = ctx.params.releaseId;

    const deletedReleaseAction = await getService('release', { strapi }).deleteAction(
      actionId,
      releaseId
    );

    ctx.body = {
      data: deletedReleaseAction,
    };
  },
};

export default releaseActionController;
