import type Koa from 'koa';
import { validateReleaseActionCreateSchema } from './validation/release-action';
import type { CreateReleaseAction, GetReleaseActions } from '../../../shared/contracts/release-actions';
import { getService } from '../utils';
import { RELEASE_ACTION_MODEL_UID } from '../constants';

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
    const { query } = ctx.request;

    const permissionsManager = strapi.admin.services.permission.createPermissionsManager({
      ability: ctx.state.userAbility,
      model: RELEASE_ACTION_MODEL_UID,
    });

    const sanitizedQuery = await permissionsManager.sanitizeQuery(query);
    const permissionsQuery = await permissionsManager.addPermissionsQueryTo(sanitizedQuery, 'plugin::content-manager.explorer.read');

    console.log(permissionsQuery)
    return 0
    

    const releaseService = getService('release', { strapi });
    const { results, pagination } = await releaseService.findActions(releaseId, query);

    const contentTypeService = strapi.plugin('content-manager').service('content-types');

    const contentTypes = {};
    const sanitizeFunctions = {};

    const releaseActions = await Promise.all(results.map(async (releaseAction) => {
      if (!contentTypes[releaseAction.contentType]) {
        // We get the configuration for each content type only once
        // Then, we can use it to get mainFields and create the sanitizeOutput fn
        const configuration = await contentTypeService.findConfiguration({ uid: releaseAction.contentType });

        const permissionsManager = strapi.admin.services.permission.createPermissionsManager({
          ability: ctx.state.userAbility,
          model: releaseAction.contentType
        });

        sanitizeFunctions[releaseAction.contentType] = permissionsManager.sanitizeOutput;
        contentTypes[releaseAction.contentType] = { mainField: configuration.settings.mainField, };
      }

      // We return the action and we make sure to sanitize the entry
      return {
        ...releaseAction,
        entry: await sanitizeFunctions[releaseAction.contentType](releaseAction.entry),
      };
    }));

    ctx.body = {
      data: releaseActions,
      meta: {
        contentTypes
      },
      pagination,
    };
  }
};

export default releaseActionController;
