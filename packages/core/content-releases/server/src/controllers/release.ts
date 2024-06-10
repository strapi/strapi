import type Koa from 'koa';
import { errors } from '@strapi/utils';
import { RELEASE_MODEL_UID } from '../constants';
import { validateRelease, validatefindByDocumentAttachedParams } from './validation/release';
import type {
  CreateRelease,
  UpdateRelease,
  PublishRelease,
  GetRelease,
  Release,
  DeleteRelease,
  GetReleases,
  // MapEntriesToReleases,
} from '../../../shared/contracts/releases';
import type { UserInfo } from '../../../shared/types';
import { getService } from '../utils';

type ReleaseWithPopulatedActions = Release & { actions: { count: number } };

const releaseController = {
  /**
   * Find releases based on documents attached or not to the release.
   * If `hasEntryAttached` is true, it will return all releases that have the entry attached.
   * If `hasEntryAttached` is false, it will return all releases that don't have the entry attached.
   */
  async findByDocumentAttached(ctx: Koa.Context) {
    const permissionsManager = strapi.service('admin::permission').createPermissionsManager({
      ability: ctx.state.userAbility,
      model: RELEASE_MODEL_UID,
    });
    await permissionsManager.validateQuery(ctx.query);
    const releaseService = getService('release', { strapi });
    const query = await permissionsManager.sanitizeQuery(ctx.query);

    await validatefindByDocumentAttachedParams(query);

    const { contentType, entryDocumentId, hasEntryAttached, locale } = query;
    const isEntryAttached =
      typeof hasEntryAttached === 'string' ? Boolean(JSON.parse(hasEntryAttached)) : false;

    if (isEntryAttached) {
      const releases = await releaseService.findMany({
        where: {
          releasedAt: null,
          actions: {
            contentType,
            entryDocumentId: entryDocumentId ?? null,
            locale: locale ?? null,
          },
        },
        populate: {
          actions: {
            fields: ['type'],
          },
        },
      });
      ctx.body = { data: releases };
    } else {
      const relatedReleases = await releaseService.findMany({
        where: {
          releasedAt: null,
          actions: {
            contentType,
            entryDocumentId: entryDocumentId ?? null,
            locale: locale ?? null,
          },
        },
      });

      const releases = await releaseService.findMany({
        where: {
          $or: [
            {
              id: {
                $notIn: relatedReleases.map((release: any) => release.id),
              },
            },
            {
              actions: null,
            },
          ],
          releasedAt: null,
        },
      });
      ctx.body = { data: releases };
    }
  },

  async findPage(ctx: Koa.Context) {
    const permissionsManager = strapi.service('admin::permission').createPermissionsManager({
      ability: ctx.state.userAbility,
      model: RELEASE_MODEL_UID,
    });

    await permissionsManager.validateQuery(ctx.query);

    const releaseService = getService('release', { strapi });

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

    const pendingReleasesCount = await strapi.db.query(RELEASE_MODEL_UID).count({
      where: {
        releasedAt: null,
      },
    });

    ctx.body = { data, meta: { pagination, pendingReleasesCount } };
  },

  async findOne(ctx: Koa.Context) {
    const id: GetRelease.Request['params']['id'] = ctx.params.id;

    const releaseService = getService('release', { strapi });
    const releaseActionService = getService('release-action', { strapi });
    const release = await releaseService.findOne(id, { populate: ['createdBy'] });
    if (!release) {
      throw new errors.NotFoundError(`Release not found for id: ${id}`);
    }

    const count = await releaseActionService.countActions({
      filters: {
        release: id,
      },
    });
    const sanitizedRelease = {
      ...release,
      createdBy: release.createdBy
        ? strapi.service('admin::user').sanitizeUser(release.createdBy)
        : null,
    };

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

  /* @TODO: Migrate to new api 
  async mapEntriesToReleases(ctx: Koa.Context) {
    const { contentTypeUid, entriesIds } = ctx.query;

    if (!contentTypeUid || !entriesIds) {
      throw new errors.ValidationError('Missing required query parameters');
    }

    const releaseService = getService('release', { strapi });

    const releasesWithActions = await releaseService.findMany(
      contentTypeUid,
      entriesIds
    );

    const mappedEntriesInReleases = releasesWithActions.reduce(
      // TODO: Fix for v5 removed mappedEntriedToRelease
      (acc: MapEntriesToReleases.Response['data'], release: Release) => {
        release.actions.forEach((action) => {
          if (!acc[action.entry.id]) {
            acc[action.entry.id] = [{ id: release.id, name: release.name }];
          } else {
            acc[action.entry.id].push({ id: release.id, name: release.name });
          }
        });

        return acc;
      },
      // TODO: Fix for v5 removed mappedEntriedToRelease
      {} as MapEntriesToReleases.Response['data']
    );

    ctx.body = {
      data: mappedEntriesInReleases,
    };
  },
  */

  async create(ctx: Koa.Context) {
    const user: UserInfo = ctx.state.user;
    const releaseArgs = ctx.request.body as CreateRelease.Request['body'];

    await validateRelease(releaseArgs);

    const releaseService = getService('release', { strapi });
    const release = await releaseService.create(releaseArgs, { user });

    const permissionsManager = strapi.service('admin::permission').createPermissionsManager({
      ability: ctx.state.userAbility,
      model: RELEASE_MODEL_UID,
    });

    ctx.created({
      data: await permissionsManager.sanitizeOutput(release),
    });
  },

  async update(ctx: Koa.Context) {
    const user: UserInfo = ctx.state.user;
    const releaseArgs = ctx.request.body as UpdateRelease.Request['body'];
    const id: UpdateRelease.Request['params']['id'] = ctx.params.id;

    await validateRelease(releaseArgs);

    const releaseService = getService('release', { strapi });
    const release = await releaseService.update(id, releaseArgs, { user });

    const permissionsManager = strapi.service('admin::permission').createPermissionsManager({
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
    const id: PublishRelease.Request['params']['id'] = ctx.params.id;

    const releaseService = getService('release', { strapi });
    const releaseActionService = getService('release-action', { strapi });
    const release = await releaseService.publish(id);

    const [countPublishActions, countUnpublishActions] = await Promise.all([
      releaseActionService.countActions({
        filters: {
          release: id,
          type: 'publish',
        },
      }),
      releaseActionService.countActions({
        filters: {
          release: id,
          type: 'unpublish',
        },
      }),
    ]);

    ctx.body = {
      data: release,
      meta: {
        totalEntries: countPublishActions + countUnpublishActions,
        totalPublishedEntries: countPublishActions,
        totalUnpublishedEntries: countUnpublishActions,
      },
    };
  },
};

export default releaseController;
