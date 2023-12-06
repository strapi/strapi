import { setCreatorFields, errors } from '@strapi/utils';
import type { LoadedStrapi, Common, EntityService, UID } from '@strapi/types';
import { RELEASE_ACTION_MODEL_UID, RELEASE_MODEL_UID } from '../constants';
import type {
  GetReleases,
  CreateRelease,
  UpdateRelease,
  PublishRelease,
  GetRelease,
  Release,
  GetContentTypeEntryReleases,
} from '../../../shared/contracts/releases';
import type {
  CreateReleaseAction,
  GetReleaseActions,
  ReleaseAction,
  UpdateReleaseAction,
  DeleteReleaseAction,
} from '../../../shared/contracts/release-actions';
import type { UserInfo } from '../../../shared/types';
import { getService } from '../utils';

const createReleaseService = ({ strapi }: { strapi: LoadedStrapi }) => ({
  async create(releaseData: CreateRelease.Request['body'], { user }: { user: UserInfo }) {
    const releaseWithCreatorFields = await setCreatorFields({ user })(releaseData);

    return strapi.entityService.create(RELEASE_MODEL_UID, {
      data: releaseWithCreatorFields,
    });
  },
  findOne(id: GetRelease.Request['params']['id'], query = {}) {
    return strapi.entityService.findOne(RELEASE_MODEL_UID, id, query);
  },
  findPage(query?: GetReleases.Request['query']) {
    return strapi.entityService.findPage(RELEASE_MODEL_UID, {
      ...query,
      populate: {
        actions: {
          // @ts-expect-error TS error on populate, is not considering count
          count: true,
        },
      },
    });
  },
  findManyForContentTypeEntry(
    contentTypeUid: GetContentTypeEntryReleases.Request['query']['contentTypeUid'],
    entryId: GetContentTypeEntryReleases.Request['query']['entryId'],
    {
      hasEntryAttached,
    }: { hasEntryAttached?: GetContentTypeEntryReleases.Request['query']['hasEntryAttached'] } = {
      hasEntryAttached: false,
    }
  ) {
    const whereActions = hasEntryAttached
      ? {
          // Find all Releases where the content type entry is present
          actions: {
            target_type: contentTypeUid,
            target_id: entryId,
          },
        }
      : {
          // Find all Releases where the content type entry is not present
          $or: [
            {
              $not: {
                actions: {
                  target_type: contentTypeUid,
                  target_id: entryId,
                },
              },
            },
            {
              actions: null,
            },
          ],
        };

    return strapi.db.query(RELEASE_MODEL_UID).findMany({
      where: {
        ...whereActions,
        releasedAt: {
          $null: true,
        },
      },
      populate: {
        actions: {
          count: true,
        },
      },
    });
  },
  async update(
    id: number,
    releaseData: UpdateRelease.Request['body'],
    { user }: { user: UserInfo }
  ) {
    const updatedRelease = await setCreatorFields({ user, isEdition: true })(releaseData);

    const release = await strapi.entityService.update(RELEASE_MODEL_UID, id, {
      /*
       * The type returned from the entity service: Partial<Input<"plugin::content-releases.release">>
       * is not compatible with the type we are passing here: UpdateRelease.Request['body']
       */
      // @ts-expect-error see above
      data: updatedRelease,
    });

    if (!release) {
      throw new errors.NotFoundError(`No release found for id ${id}`);
    }

    return release;
  },
  async createAction(
    releaseId: CreateReleaseAction.Request['params']['releaseId'],
    action: Pick<CreateReleaseAction.Request['body'], 'type' | 'entry'>
  ) {
    const { validateEntryContentType, validateUniqueEntry } = getService('release-validation', {
      strapi,
    });

    await Promise.all([
      validateEntryContentType(action.entry.contentType),
      validateUniqueEntry(releaseId, action),
    ]);

    const { entry, type } = action;

    return strapi.entityService.create(RELEASE_ACTION_MODEL_UID, {
      data: {
        type,
        contentType: entry.contentType,
        entry: {
          id: entry.id,
          __type: entry.contentType,
          __pivot: { field: 'entry' },
        },
        release: releaseId,
      },
      populate: { release: { fields: ['id'] }, entry: { fields: ['id'] } },
    });
  },
  async findActions(
    releaseId: GetReleaseActions.Request['params']['releaseId'],
    contentTypes: Common.UID.ContentType[],
    query?: GetReleaseActions.Request['query']
  ) {
    const result = await strapi.entityService.findOne(RELEASE_MODEL_UID, releaseId);

    if (!result) {
      throw new errors.NotFoundError(`No release found for id ${releaseId}`);
    }

    return strapi.entityService.findPage(RELEASE_ACTION_MODEL_UID, {
      ...query,
      filters: {
        release: releaseId,
        contentType: {
          $in: contentTypes,
        },
      },
    });
  },
  async countActions(query: EntityService.Params.Pick<typeof RELEASE_ACTION_MODEL_UID, 'filters'>) {
    return strapi.entityService.count(RELEASE_ACTION_MODEL_UID, query);
  },
  async findReleaseContentTypes(releaseId: Release['id']) {
    const contentTypesFromReleaseActions: { contentType: UID.ContentType }[] = await strapi.db
      .queryBuilder(RELEASE_ACTION_MODEL_UID)
      .select('content_type')
      .where({
        $and: [
          {
            release: releaseId,
          },
        ],
      })
      .groupBy('content_type')
      .execute();

    return contentTypesFromReleaseActions.map(({ contentType: contentTypeUid }) => contentTypeUid);
  },
  async findReleaseContentTypesMainFields(releaseId: Release['id']) {
    const contentTypesUids = await this.findReleaseContentTypes(releaseId);

    const contentManagerContentTypeService = strapi
      .plugin('content-manager')
      .service('content-types');
    const contentTypesMeta: Record<UID.ContentType, { mainField: string }> = {};

    for (const contentTypeUid of contentTypesUids) {
      const contentTypeConfig = await contentManagerContentTypeService.findConfiguration({
        uid: contentTypeUid,
      });

      if (contentTypeConfig) {
        contentTypesMeta[contentTypeUid] = {
          mainField: contentTypeConfig.settings.mainField,
        };
      }
    }

    return contentTypesMeta;
  },
  async publish(releaseId: PublishRelease.Request['params']['id']) {
    // We need to pass the type because entityService.findOne is not returning the correct type
    const releaseWithPopulatedActionEntries = (await strapi.entityService.findOne(
      RELEASE_MODEL_UID,
      releaseId,
      {
        populate: {
          actions: {
            populate: {
              entry: true,
            },
          },
        },
      }
    )) as unknown as Release;

    if (!releaseWithPopulatedActionEntries) {
      throw new errors.NotFoundError(`No release found for id ${releaseId}`);
    }

    if (releaseWithPopulatedActionEntries.releasedAt) {
      throw new errors.ValidationError('Release already published');
    }

    if (releaseWithPopulatedActionEntries.actions.length === 0) {
      throw new errors.ValidationError('No entries to publish');
    }

    /**
     * We separate publish and unpublish actions group by content type
     */
    const actions: {
      [key: UID.ContentType]: {
        publish: ReleaseAction['entry'][];
        unpublish: ReleaseAction['entry'][];
      };
    } = {};
    for (const action of releaseWithPopulatedActionEntries.actions) {
      const contentTypeUid = action.contentType;

      if (!actions[contentTypeUid]) {
        actions[contentTypeUid] = {
          publish: [],
          unpublish: [],
        };
      }

      if (action.type === 'publish') {
        actions[contentTypeUid].publish.push(action.entry);
      } else {
        actions[contentTypeUid].unpublish.push(action.entry);
      }
    }

    const entityManagerService = strapi.plugin('content-manager').service('entity-manager');

    // Only publish the release if all action updates are applied successfully to their entry, otherwise leave everything as is
    await strapi.db.transaction(async () => {
      for (const contentTypeUid of Object.keys(actions)) {
        const { publish, unpublish } = actions[contentTypeUid as UID.ContentType];

        if (publish.length > 0) {
          await entityManagerService.publishMany(publish, contentTypeUid);
        }

        if (unpublish.length > 0) {
          await entityManagerService.unpublishMany(unpublish, contentTypeUid);
        }
      }
    });

		// When the transaction fails it throws an error, when it is successful proceed to updating the release
    const release = await strapi.entityService.update(RELEASE_MODEL_UID, releaseId, {
      data: {
        /*
         * The type returned from the entity service: Partial<Input<"plugin::content-releases.release">> looks like it's wrong
         */
        // @ts-expect-error see above
        releasedAt: new Date(),
      },
    });

    return release;
  },
  async updateAction(
    actionId: UpdateReleaseAction.Request['params']['actionId'],
    releaseId: UpdateReleaseAction.Request['params']['releaseId'],
    update: UpdateReleaseAction.Request['body']
  ) {
    const updatedAction = await strapi.db.query(RELEASE_ACTION_MODEL_UID).update({
      where: {
        id: actionId,
        release: releaseId,
      },
      data: update,
    });

    if (!updatedAction) {
      throw new errors.NotFoundError(
        `Action with id ${actionId} not found in release with id ${releaseId}`
      );
    }

    return updatedAction;
  },
  async deleteAction(
    actionId: DeleteReleaseAction.Request['params']['actionId'],
    releaseId: DeleteReleaseAction.Request['params']['releaseId']
  ) {
    const deletedAction = await strapi.db.query(RELEASE_ACTION_MODEL_UID).delete({
      where: {
        id: actionId,
        release: releaseId,
      },
    });

    if (!deletedAction) {
      throw new errors.NotFoundError(
        `Action with id ${actionId} not found in release with id ${releaseId}`
      );
    }

    return deletedAction;
  },
});

export default createReleaseService;
