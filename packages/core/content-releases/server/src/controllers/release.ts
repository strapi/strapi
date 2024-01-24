import type Koa from 'koa';
import { errors } from '@strapi/utils';
import { RELEASE_MODEL_UID } from '../constants';
import { validateRelease } from './validation/release';
import type {
  CreateRelease,
  UpdateRelease,
  PublishRelease,
  GetRelease,
  Release,
  DeleteRelease,
  GetContentTypeEntryReleases,
  GetReleases,
} from '../../../shared/contracts/releases';
import type { UserInfo } from '../../../shared/types';
import { getService } from '../utils';

type ReleaseWithPopulatedActions = Release & { actions: { count: number } };

const releaseController = {
  async findMany(ctx: Koa.Context) {
    const permissionsManager = strapi.admin.services.permission.createPermissionsManager({
      ability: ctx.state.userAbility,
      model: RELEASE_MODEL_UID,
    });

    await permissionsManager.validateQuery(ctx.query);

    const releaseService = getService('release', { strapi });

    // Handle requests for releases filtered by content type entry
    const isFindManyForContentTypeEntry = Boolean(ctx.query?.contentTypeUid && ctx.query?.entryId);
    if (isFindManyForContentTypeEntry) {
      const query: GetContentTypeEntryReleases.Request['query'] =
        await permissionsManager.sanitizeQuery(ctx.query);

      const contentTypeUid = query.contentTypeUid;
      const entryId = query.entryId;
      // Parse the string value or fallback to a default
      const hasEntryAttached: GetContentTypeEntryReleases.Request['query']['hasEntryAttached'] =
        typeof query.hasEntryAttached === 'string' ? JSON.parse(query.hasEntryAttached) : false;

      const data = hasEntryAttached
        ? await releaseService.findManyWithContentTypeEntryAttached(contentTypeUid, entryId)
        : await releaseService.findManyWithoutContentTypeEntryAttached(contentTypeUid, entryId);

      ctx.body = { data };
    } else {
      const query: GetReleases.Request['query'] = await permissionsManager.sanitizeQuery(ctx.query);
      const { results, pagination } = await releaseService.findPage(query);

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

      ctx.body = { data, meta: { pagination } };
    }
  },

  async findOne(ctx: Koa.Context) {
    const id: GetRelease.Request['params']['id'] = ctx.params.id;

    const releaseService = getService('release', { strapi });

    const release = await releaseService.findOne(id, { populate: ['createdBy'] });
    const permissionsManager = strapi.admin.services.permission.createPermissionsManager({
      ability: ctx.state.userAbility,
      model: RELEASE_MODEL_UID,
    });
    const sanitizedRelease = await permissionsManager.sanitizeOutput(release);

    const count = await releaseService.countActions({
      filters: {
        release: id,
      },
    });

    if (!release) {
      throw new errors.NotFoundError(`Release not found for id: ${id}`);
    }

    // Format the data object
    const data = {
      ...sanitizedRelease,
      actions: {
        meta: {
          count,
        },
      },
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
  },

  async delete(ctx: Koa.Context) {
    const id: DeleteRelease.Request['params']['id'] = ctx.params.id;

    const releaseService = getService('release', { strapi });
    const release = await releaseService.delete(id);

    ctx.body = {
      data: release,
    };
  },

  async publish(ctx: Koa.Context) {
    const user: PublishRelease.Request['state']['user'] = ctx.state.user;
    const id: PublishRelease.Request['params']['id'] = ctx.params.id;

    const releaseService = getService('release', { strapi });
    const release = await releaseService.publish(id, { user });

    ctx.body = {
      data: release,
    };
  },
};

export default releaseController;
