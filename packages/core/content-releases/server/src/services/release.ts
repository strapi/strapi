import { setCreatorFields, errors } from '@strapi/utils';
import type { LoadedStrapi, EntityService, UID } from '@strapi/types';
import { RELEASE_ACTION_MODEL_UID, RELEASE_MODEL_UID } from '../constants';
import type {
  GetReleases,
  CreateRelease,
  UpdateRelease,
  PublishRelease,
  GetRelease,
  Release,
  DeleteRelease,
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

  async findOne(id: GetRelease.Request['params']['id'], query = {}) {
    const release = await strapi.entityService.findOne(RELEASE_MODEL_UID, id, {
      ...query,
    });

    return release;
  },

  findPage(query?: GetReleases.Request['query']) {
    return strapi.entityService.findPage(RELEASE_MODEL_UID, {
      ...query,
      populate: {
        actions: {
          // @ts-expect-error Ignore missing properties
          count: true,
        },
      },
    });
  },

  async findManyForContentTypeEntry(
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
    const populateAttachedAction = hasEntryAttached
      ? {
          // Filter the action to get only the content type entry
          actions: {
            where: {
              target_type: contentTypeUid,
              target_id: entryId,
            },
          },
        }
      : {};

    const releases = await strapi.db.query(RELEASE_MODEL_UID).findMany({
      where: {
        ...whereActions,
        releasedAt: {
          $null: true,
        },
      },
      populate: {
        ...populateAttachedAction,
      },
    });

    return releases.map((release) => {
      if (release.actions?.length) {
        const [actionForEntry] = release.actions;

        // Remove the actions key to replace it with an action key
        delete release.actions;

        return {
          ...release,
          action: actionForEntry
        };
      }

      return release;
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
    query?: GetReleaseActions.Request['query']
  ) {
    const result = await strapi.entityService.findOne(RELEASE_MODEL_UID, releaseId);

    if (!result) {
      throw new errors.NotFoundError(`No release found for id ${releaseId}`);
    }

    return strapi.entityService.findPage(RELEASE_ACTION_MODEL_UID, {
      ...query,
      populate: {
        entry: true,
      },
      filters: {
        release: releaseId,
      },
    });
  },

  async countActions(query: EntityService.Params.Pick<typeof RELEASE_ACTION_MODEL_UID, 'filters'>) {
    return strapi.entityService.count(RELEASE_ACTION_MODEL_UID, query);
  },

  async getAllContentTypeUids(releaseId: Release['id']) {
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

  async getContentTypesDataForActions(releaseId: Release['id']) {
    const contentTypesUids = await this.getAllContentTypeUids(releaseId);

    const contentManagerContentTypeService = strapi
      .plugin('content-manager')
      .service('content-types');

    const contentTypesData: Record<
      UID.ContentType,
      { mainField: string; displayName: string }
    > = {};
    for (const contentTypeUid of contentTypesUids) {
      const contentTypeConfig = await contentManagerContentTypeService.findConfiguration({
        uid: contentTypeUid,
      });

      contentTypesData[contentTypeUid] = {
        mainField: contentTypeConfig.settings.mainField,
        displayName: strapi.getModel(contentTypeUid).info.displayName,
      };
    }

    return contentTypesData;
  },

  async delete(releaseId: DeleteRelease.Request['params']['id']) {
    const release = (await strapi.entityService.findOne(RELEASE_MODEL_UID, releaseId, {
      populate: {
        actions: {
          fields: ['id'],
        },
      },
    })) as unknown as Release;

    if (!release) {
      throw new errors.NotFoundError(`No release found for id ${releaseId}`);
    }

    if (release.releasedAt) {
      throw new errors.ValidationError('Release already published');
    }

    // Only delete the release and its actions is you in fact can delete all the actions and the release
    // Otherwise, if the transaction fails it throws an error
    await strapi.db.transaction(async () => {
      await strapi.db.query(RELEASE_ACTION_MODEL_UID).deleteMany({
        where: {
          id: {
            $in: release.actions.map((action) => action.id),
          },
        },
      });
      await strapi.entityService.delete(RELEASE_MODEL_UID, releaseId);
    });

    return release;
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
