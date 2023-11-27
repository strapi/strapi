import type Koa from 'koa';
import type { UID } from '@strapi/types';
import { errors } from '@strapi/utils';
import { RELEASE_MODEL_UID } from '../constants';
import { validateRelease } from './validation/release';
import type { CreateRelease, UpdateRelease, GetRelease, Release } from '../../../shared/contracts/releases';
import type { UserInfo } from '../../../shared/types';
import { getAllowedContentTypes, getService } from '../utils';

type ReleaseWithPopulatedActions = Release & { actions: { count: number } };

const releaseController = {
  async findMany(ctx: Koa.Context) {
    const permissionsManager = strapi.admin.services.permission.createPermissionsManager({
      ability: ctx.state.userAbility,
      model: RELEASE_MODEL_UID,
    });

    await permissionsManager.validateQuery(ctx.query);
    const query = await permissionsManager.sanitizeQuery(ctx.query);

    const { results, pagination } = await getService('release', { strapi }).findMany(query);

    // Format the data object
    const data = results.map((release: ReleaseWithPopulatedActions) => {
      const { actions, ...releaseData } = release;

      return {
        ...releaseData,
        actions: {
          meta: {
            count: actions.count,
          },
        },
      };
    });

    ctx.body = { data, pagination };
  },

  async findOne(ctx: Koa.Context) {
    const id: GetRelease.Request['params']['id'] = ctx.params.id;

    const allowedContentTypes = getAllowedContentTypes({ strapi, userAbility: ctx.state.userAbility });

    const contentManagerContentTypeService = strapi
      .plugin('content-manager')
      .service('content-types');

    const contentTypesMeta = await allowedContentTypes.reduce(async (accumulatorPromise, contentTypeUid) => {
      const acc = await accumulatorPromise;

      const contentTypeConfig = await contentManagerContentTypeService.findConfiguration({ uid: contentTypeUid });

      if (contentTypeConfig) {
        acc[contentTypeUid] = {
          mainField: contentTypeConfig.settings.mainField,
        };
      }

      return acc;
    }, Promise.resolve({} as Record<UID.ContentType, { mainField: string }>));

    const releaseWithCountAllActions = (await getService('release', { strapi }).findOne(
      Number(id), { populate: { actions: { count: true } } }
    )) as ReleaseWithPopulatedActions | null;

    const releaseWithCountHiddenActions = (await getService('release', { strapi }).findOne(
      Number(id),
      {
        populate: {
          actions: {
            count: true,
            filters: {
              contentType: {
                $notIn: allowedContentTypes
              }
            }
          }
        }
      }
    )) as ReleaseWithPopulatedActions | null;

    if (!releaseWithCountAllActions || !releaseWithCountHiddenActions) {
      throw new errors.NotFoundError(`Release not found for id: ${id}`);
    }

    const { actions: releaseWithAllActionsMeta, ...release } = releaseWithCountAllActions;
    const { actions: releaseWithHiddenActionsMeta } = releaseWithCountHiddenActions;

    // Format the data object
    const data = {
      ...release,
      actions: {
        meta: {
          total: releaseWithAllActionsMeta.count,
          totalHidden: releaseWithHiddenActionsMeta.count,
        },
      },
      meta: {
        contentTypes: contentTypesMeta,
      }
    };

    ctx.body = { data };
  },

  async create(ctx: Koa.Context) {
    const user: UserInfo = ctx.state.user;
    const releaseArgs: CreateRelease.Request['body'] = ctx.request.body;

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
    const releaseArgs: UpdateRelease.Request['body'] = ctx.request.body;
    const id: UpdateRelease.Request['params']['id'] = ctx.params.id;

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
