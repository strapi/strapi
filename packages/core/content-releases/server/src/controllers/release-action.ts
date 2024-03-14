import type Koa from 'koa';

import { mapAsync } from '@strapi/utils';
import {
  validateReleaseAction,
  validateReleaseActionUpdateSchema,
} from './validation/release-action';
import type {
  CreateReleaseAction,
  CreateManyReleaseActions,
  GetReleaseActions,
  UpdateReleaseAction,
  DeleteReleaseAction,
} from '../../../shared/contracts/release-actions';
import { getService } from '../utils';
import { RELEASE_ACTION_MODEL_UID } from '../constants';
import { AlreadyOnReleaseError } from '../services/validation';

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

  async createMany(ctx: Koa.Context) {
    const releaseId: CreateManyReleaseActions.Request['params']['releaseId'] = ctx.params.releaseId;
    const releaseActionsArgs: CreateManyReleaseActions.Request['body'] = ctx.request.body;

    await Promise.all(
      releaseActionsArgs.map((releaseActionArgs) => validateReleaseAction(releaseActionArgs))
    );

    const releaseService = getService('release', { strapi });

    const releaseActions = await strapi.db.transaction(async () => {
      const releaseActions = await Promise.all(
        releaseActionsArgs.map(async (releaseActionArgs) => {
          try {
            const action = await releaseService.createAction(releaseId, releaseActionArgs);

            return action;
          } catch (error) {
            // If the entry is already in the release, we don't want to throw an error, so we catch and ignore it
            if (error instanceof AlreadyOnReleaseError) {
              return null;
            }

            throw error;
          }
        })
      );

      return releaseActions;
    });

    const newReleaseActions = releaseActions.filter((action) => action !== null);

    ctx.body = {
      data: newReleaseActions,
      meta: {
        entriesAlreadyInRelease: releaseActions.length - newReleaseActions.length,
        totalEntries: releaseActions.length,
      },
    };
  },

  async findMany(ctx: Koa.Context) {
    const releaseId: GetReleaseActions.Request['params']['releaseId'] = ctx.params.releaseId;
    const permissionsManager = strapi.admin.services.permission.createPermissionsManager({
      ability: ctx.state.userAbility,
      model: RELEASE_ACTION_MODEL_UID,
    });
    const query = await permissionsManager.sanitizeQuery(ctx.query);

    const releaseService = getService('release', { strapi });
    const { results, pagination } = await releaseService.findActions(releaseId, {
      sort: query.groupBy === 'action' ? 'type' : query.groupBy,
      ...query,
    });

    /**
     * Release actions can be related to entries of different content types.
     * We need to sanitize the entry output according to that content type.
     * So, we group the sanitized output function by content type.
     */
    const contentTypeOutputSanitizers = results.reduce((acc, action) => {
      if (acc[action.contentType]) {
        return acc;
      }

      const contentTypePermissionsManager =
        strapi.admin.services.permission.createPermissionsManager({
          ability: ctx.state.userAbility,
          model: action.contentType,
        });

      acc[action.contentType] = contentTypePermissionsManager.sanitizeOutput;

      return acc;
    }, {});

    /**
     * sanitizeOutput doesn't work if you use it directly on the Release Action model, it doesn't sanitize the entries
     * So, we need to sanitize manually each entry inside a Release Action
     */
    const sanitizedResults = await mapAsync(results, async (action) => ({
      ...action,
      entry: await contentTypeOutputSanitizers[action.contentType](action.entry),
    }));

    const groupedData = await releaseService.groupActions(sanitizedResults, query.groupBy);

    const contentTypes = releaseService.getContentTypeModelsFromActions(results);
    const components = await releaseService.getAllComponents();

    ctx.body = {
      data: groupedData,
      meta: {
        pagination,
        contentTypes,
        components,
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

    const releaseService = getService('release', { strapi });

    const deletedReleaseAction = await releaseService.deleteAction(actionId, releaseId);

    ctx.body = {
      data: deletedReleaseAction,
    };
  },
};

export default releaseActionController;
