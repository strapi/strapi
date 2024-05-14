import { setCreatorFields, errors } from '@strapi/utils';

import type { LoadedStrapi, EntityService, UID, Schema } from '@strapi/types';

import _ from 'lodash/fp';

import { ALLOWED_WEBHOOK_EVENTS, RELEASE_ACTION_MODEL_UID, RELEASE_MODEL_UID } from '../constants';
import type {
  GetReleases,
  CreateRelease,
  UpdateRelease,
  PublishRelease,
  GetRelease,
  Release,
  DeleteRelease,
  GetContentTypeEntryReleases,
  MapEntriesToReleases,
} from '../../../shared/contracts/releases';
import type {
  CreateReleaseAction,
  GetReleaseActions,
  ReleaseAction,
  UpdateReleaseAction,
  DeleteReleaseAction,
  ReleaseActionGroupBy,
} from '../../../shared/contracts/release-actions';
import type { Entity, UserInfo } from '../../../shared/types';
import { getService, getPopulatedEntry, getEntryValidStatus } from '../utils';

export interface Locale extends Entity {
  name: string;
  code: string;
}

type LocaleDictionary = {
  [key: Locale['code']]: Pick<Locale, 'name' | 'code'>;
};

const getGroupName = (queryValue?: ReleaseActionGroupBy) => {
  switch (queryValue) {
    case 'contentType':
      return 'contentType.displayName';
    case 'action':
      return 'type';
    case 'locale':
      return _.getOr('No locale', 'locale.name');
    default:
      return 'contentType.displayName';
  }
};

const createReleaseService = ({ strapi }: { strapi: LoadedStrapi }) => {
  const dispatchWebhook = (
    event: string,
    { isPublished, release, error }: { isPublished: boolean; release?: any; error?: unknown }
  ) => {
    strapi.eventHub.emit(event, {
      isPublished,
      error,
      release,
    });
  };

  const publishSingleTypeAction = async (
    uid: UID.ContentType,
    actionType: 'publish' | 'unpublish',
    entryId: Entity['id']
  ) => {
    const entityManagerService = strapi.plugin('content-manager').service('entity-manager');
    const populateBuilderService = strapi.plugin('content-manager').service('populate-builder');

    // @ts-expect-error - populateBuilderService should be a function but is returning service
    const populate = await populateBuilderService(uid).populateDeep(Infinity).build();

    const entry = await strapi.entityService.findOne(uid, entryId, { populate });

    try {
      if (actionType === 'publish') {
        await entityManagerService.publish(entry, uid);
      } else {
        await entityManagerService.unpublish(entry, uid);
      }
    } catch (error) {
      if (
        error instanceof errors.ApplicationError &&
        (error.message === 'already.published' || error.message === 'already.draft')
      ) {
        // We don't want throw an error if the entry is already published or draft
      } else {
        throw error;
      }
    }
  };

  const publishCollectionTypeAction = async (
    uid: UID.ContentType,
    entriesToPublishIds: Array<Entity['id']>,
    entriestoUnpublishIds: Array<Entity['id']>
  ) => {
    const entityManagerService = strapi.plugin('content-manager').service('entity-manager');
    const populateBuilderService = strapi.plugin('content-manager').service('populate-builder');

    // @ts-expect-error - populateBuilderService should be a function but is returning service
    const populate = await populateBuilderService(uid).populateDeep(Infinity).build();

    /**
     * We need to get the populate entries to be able to publish without errors on components/relations/dynamicZones
     * Considering that populate doesn't work well with morph relations we can't get the entries from the Release model
     * So, we need to fetch them manually
     */
    const entriesToPublish = (await strapi.entityService.findMany(uid, {
      filters: {
        id: {
          $in: entriesToPublishIds,
        },
      },
      populate,
    })) as Entity[];

    const entriesToUnpublish = (await strapi.entityService.findMany(uid, {
      filters: {
        id: {
          $in: entriestoUnpublishIds,
        },
      },
      populate,
    })) as Entity[];

    if (entriesToPublish.length > 0) {
      await entityManagerService.publishMany(entriesToPublish, uid);
    }

    if (entriesToUnpublish.length > 0) {
      await entityManagerService.unpublishMany(entriesToUnpublish, uid);
    }
  };

  /**
   * Given a release id, it returns the actions formatted ready to be used to publish them.
   * First we separate actions by collectiontType and singleType,
   * Then, we split the collectionType based on the action type (publish/unpublish)
   */
  const getFormattedActions = async (releaseId: Release['id']) => {
    const actions = await strapi.db.query(RELEASE_ACTION_MODEL_UID).findMany({
      where: {
        release: {
          id: releaseId,
        },
      },
      populate: {
        entry: {
          fields: ['id'],
        },
      },
    });

    if (actions.length === 0) {
      throw new errors.ValidationError('No entries to publish');
    }

    /**
     * We separate publish and unpublish actions, grouping them by contentType and extracting only their IDs. Then we can fetch more data for each entry
     * We need to separate collectionTypes from singleTypes because findMany work as findOne for singleTypes and publishMany can't be used for singleTypes
     */
    const collectionTypeActions: {
      [key: UID.ContentType]: {
        entriesToPublishIds: ReleaseAction['entry']['id'][];
        entriesToUnpublishIds: ReleaseAction['entry']['id'][];
      };
    } = {};
    const singleTypeActions: {
      uid: UID.ContentType;
      id: ReleaseAction['entry']['id'];
      action: ReleaseAction['type'];
    }[] = [];

    for (const action of actions) {
      const contentTypeUid = action.contentType;

      if (strapi.contentTypes[contentTypeUid].kind === 'collectionType') {
        if (!collectionTypeActions[contentTypeUid]) {
          collectionTypeActions[contentTypeUid] = {
            entriesToPublishIds: [],
            entriesToUnpublishIds: [],
          };
        }

        if (action.type === 'publish') {
          collectionTypeActions[contentTypeUid].entriesToPublishIds.push(action.entry.id);
        } else {
          collectionTypeActions[contentTypeUid].entriesToUnpublishIds.push(action.entry.id);
        }
      } else {
        singleTypeActions.push({
          uid: contentTypeUid,
          action: action.type,
          id: action.entry.id,
        });
      }
    }

    return { collectionTypeActions, singleTypeActions };
  };

  return {
    async create(releaseData: CreateRelease.Request['body'], { user }: { user: UserInfo }) {
      const releaseWithCreatorFields = await setCreatorFields({ user })(releaseData);

      const {
        validatePendingReleasesLimit,
        validateUniqueNameForPendingRelease,
        validateScheduledAtIsLaterThanNow,
      } = getService('release-validation', { strapi });

      await Promise.all([
        validatePendingReleasesLimit(),
        validateUniqueNameForPendingRelease(releaseWithCreatorFields.name),
        validateScheduledAtIsLaterThanNow(releaseWithCreatorFields.scheduledAt),
      ]);

      const release = await strapi.entityService.create(RELEASE_MODEL_UID, {
        data: {
          ...releaseWithCreatorFields,
          status: 'empty',
        },
      });

      if (releaseWithCreatorFields.scheduledAt) {
        const schedulingService = getService('scheduling', { strapi });

        await schedulingService.set(release.id, release.scheduledAt);
      }

      strapi.telemetry.send('didCreateContentRelease');

      return release;
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

    async findManyWithContentTypeEntryAttached(
      contentTypeUid: GetContentTypeEntryReleases.Request['query']['contentTypeUid'],
      entriesIds:
        | GetContentTypeEntryReleases.Request['query']['entryId']
        | MapEntriesToReleases.Request['query']['entriesIds']
    ) {
      // entriesIds could be an array or a single value
      let entries = entriesIds;
      if (!Array.isArray(entriesIds)) {
        entries = [entriesIds];
      }

      const releases = await strapi.db.query(RELEASE_MODEL_UID).findMany({
        where: {
          actions: {
            target_type: contentTypeUid,
            target_id: {
              $in: entries,
            },
          },
          releasedAt: {
            $null: true,
          },
        },
        populate: {
          // Filter the action to get only the content type entry
          actions: {
            where: {
              target_type: contentTypeUid,
              target_id: {
                $in: entries,
              },
            },
            populate: {
              entry: {
                select: ['id'],
              },
            },
          },
        },
      });

      return releases.map((release) => {
        if (release.actions?.length) {
          const actionsForEntry = release.actions;

          // Remove the actions key to replace it with an action key
          delete release.actions;

          return {
            ...release,
            actions: actionsForEntry,
          };
        }

        return release;
      });
    },

    async findManyWithoutContentTypeEntryAttached(
      contentTypeUid: GetContentTypeEntryReleases.Request['query']['contentTypeUid'],
      entryId: GetContentTypeEntryReleases.Request['query']['entryId']
    ) {
      // We get the list of releases where the entry is present
      const releasesRelated = await strapi.db.query(RELEASE_MODEL_UID).findMany({
        where: {
          releasedAt: {
            $null: true,
          },
          actions: {
            target_type: contentTypeUid,
            target_id: entryId,
          },
        },
      });

      const releases = await strapi.db.query(RELEASE_MODEL_UID).findMany({
        where: {
          $or: [
            {
              id: {
                $notIn: releasesRelated.map((release) => release.id),
              },
            },
            {
              actions: null,
            },
          ],
          releasedAt: {
            $null: true,
          },
        },
      });

      return releases.map((release) => {
        if (release.actions?.length) {
          const [actionForEntry] = release.actions;

          // Remove the actions key to replace it with an action key
          delete release.actions;

          return {
            ...release,
            action: actionForEntry,
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
      const releaseWithCreatorFields = await setCreatorFields({ user, isEdition: true })(
        releaseData
      );

      const { validateUniqueNameForPendingRelease, validateScheduledAtIsLaterThanNow } = getService(
        'release-validation',
        { strapi }
      );

      await Promise.all([
        validateUniqueNameForPendingRelease(releaseWithCreatorFields.name, id),
        validateScheduledAtIsLaterThanNow(releaseWithCreatorFields.scheduledAt),
      ]);

      const release = await strapi.entityService.findOne(RELEASE_MODEL_UID, id);

      if (!release) {
        throw new errors.NotFoundError(`No release found for id ${id}`);
      }

      if (release.releasedAt) {
        throw new errors.ValidationError('Release already published');
      }

      const updatedRelease = await strapi.entityService.update(RELEASE_MODEL_UID, id, {
        /*
         * The type returned from the entity service: Partial<Input<"plugin::content-releases.release">>
         * is not compatible with the type we are passing here: UpdateRelease.Request['body']
         */
        // @ts-expect-error see above
        data: releaseWithCreatorFields,
      });

      const schedulingService = getService('scheduling', { strapi });

      if (releaseData.scheduledAt) {
        // set function always cancel the previous job if it exists, so we can call it directly
        await schedulingService.set(id, releaseData.scheduledAt);
      } else if (release.scheduledAt) {
        // When user don't send a scheduledAt and we have one on the release, means that user want to unschedule it
        schedulingService.cancel(id);
      }

      this.updateReleaseStatus(id);

      strapi.telemetry.send('didUpdateContentRelease');

      return updatedRelease;
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

      const release = await strapi.entityService.findOne(RELEASE_MODEL_UID, releaseId);

      if (!release) {
        throw new errors.NotFoundError(`No release found for id ${releaseId}`);
      }

      if (release.releasedAt) {
        throw new errors.ValidationError('Release already published');
      }

      const { entry, type } = action;

      const populatedEntry = await getPopulatedEntry(entry.contentType, entry.id, { strapi });
      const isEntryValid = await getEntryValidStatus(entry.contentType, populatedEntry, { strapi });

      const releaseAction = await strapi.entityService.create(RELEASE_ACTION_MODEL_UID, {
        data: {
          type,
          contentType: entry.contentType,
          locale: entry.locale,
          isEntryValid,
          entry: {
            id: entry.id,
            __type: entry.contentType,
            __pivot: { field: 'entry' },
          },
          release: releaseId,
        },
        populate: { release: { fields: ['id'] }, entry: { fields: ['id'] } },
      });

      this.updateReleaseStatus(releaseId);

      return releaseAction;
    },

    async findActions(
      releaseId: GetReleaseActions.Request['params']['releaseId'],
      query?: GetReleaseActions.Request['query']
    ) {
      const release = await strapi.entityService.findOne(RELEASE_MODEL_UID, releaseId, {
        fields: ['id'],
      });

      if (!release) {
        throw new errors.NotFoundError(`No release found for id ${releaseId}`);
      }

      return strapi.entityService.findPage(RELEASE_ACTION_MODEL_UID, {
        ...query,
        populate: {
          entry: {
            populate: '*',
          },
        },
        filters: {
          release: releaseId,
        },
      });
    },

    async countActions(
      query: EntityService.Params.Pick<typeof RELEASE_ACTION_MODEL_UID, 'filters'>
    ) {
      return strapi.entityService.count(RELEASE_ACTION_MODEL_UID, query);
    },

    async groupActions(actions: ReleaseAction[], groupBy: ReleaseActionGroupBy) {
      const contentTypeUids = actions.reduce<ReleaseAction['contentType'][]>((acc, action) => {
        if (!acc.includes(action.contentType)) {
          acc.push(action.contentType);
        }

        return acc;
      }, []);
      const allReleaseContentTypesDictionary = await this.getContentTypesDataForActions(
        contentTypeUids
      );
      const allLocalesDictionary = await this.getLocalesDataForActions();

      const formattedData = actions.map((action: ReleaseAction) => {
        const { mainField, displayName } = allReleaseContentTypesDictionary[action.contentType];

        return {
          ...action,
          locale: action.locale ? allLocalesDictionary[action.locale] : null,
          contentType: {
            displayName,
            mainFieldValue: action.entry[mainField],
            uid: action.contentType,
          },
        };
      });

      const groupName = getGroupName(groupBy);
      return _.groupBy(groupName)(formattedData);
    },

    async getLocalesDataForActions() {
      if (!strapi.plugin('i18n')) {
        return {};
      }

      const allLocales: Locale[] = (await strapi.plugin('i18n').service('locales').find()) || [];
      return allLocales.reduce<LocaleDictionary>((acc, locale) => {
        acc[locale.code] = { name: locale.name, code: locale.code };

        return acc;
      }, {});
    },

    async getContentTypesDataForActions(contentTypesUids: ReleaseAction['contentType'][]) {
      const contentManagerContentTypeService = strapi
        .plugin('content-manager')
        .service('content-types');

      const contentTypesData: Record<UID.ContentType, { mainField: string; displayName: string }> =
        {};
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

    getContentTypeModelsFromActions(actions: ReleaseAction[]) {
      const contentTypeUids = actions.reduce<ReleaseAction['contentType'][]>((acc, action) => {
        if (!acc.includes(action.contentType)) {
          acc.push(action.contentType);
        }

        return acc;
      }, []);

      const contentTypeModelsMap = contentTypeUids.reduce(
        (
          acc: { [key: ReleaseAction['contentType']]: Schema.ContentType },
          contentTypeUid: ReleaseAction['contentType']
        ) => {
          acc[contentTypeUid] = strapi.getModel(contentTypeUid);

          return acc;
        },
        {}
      );

      return contentTypeModelsMap;
    },

    async getAllComponents() {
      const contentManagerComponentsService = strapi
        .plugin('content-manager')
        .service('components');

      const components = await contentManagerComponentsService.findAllComponents();

      const componentsMap = components.reduce(
        (
          acc: { [key: Schema.Component['uid']]: Schema.Component },
          component: Schema.Component
        ) => {
          acc[component.uid] = component;

          return acc;
        },
        {}
      );

      return componentsMap;
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

      if (release.scheduledAt) {
        const schedulingService = getService('scheduling', { strapi });
        await schedulingService.cancel(release.id);
      }

      strapi.telemetry.send('didDeleteContentRelease');

      return release;
    },

    async publish(releaseId: PublishRelease.Request['params']['id']) {
      const {
        release,
        error,
      }: { release: Pick<Release, 'id' | 'releasedAt' | 'status'>; error: Error } =
        await strapi.db.transaction(async ({ trx }) => {
          /**
           * We lock the release in this transaction, so any other process trying to publish it will wait until this transaction is finished
           * In this transaction we don't care about rollback, becasue we want to persist the lock until the end and if it fails we want to change the release status to failed
           */
          const lockedRelease = (await strapi.db
            ?.queryBuilder(RELEASE_MODEL_UID)
            .where({ id: releaseId })
            .select(['id', 'name', 'releasedAt', 'status'])
            .first()
            .transacting(trx)
            .forUpdate()
            .execute()) as Pick<Release, 'id' | 'name' | 'releasedAt' | 'status'> | undefined;

          if (!lockedRelease) {
            throw new errors.NotFoundError(`No release found for id ${releaseId}`);
          }

          if (lockedRelease.releasedAt) {
            throw new errors.ValidationError('Release already published');
          }

          if (lockedRelease.status === 'failed') {
            throw new errors.ValidationError('Release failed to publish');
          }

          try {
            strapi.log.info(`[Content Releases] Starting to publish release ${lockedRelease.name}`);

            const { collectionTypeActions, singleTypeActions } = await getFormattedActions(
              releaseId
            );

            await strapi.db.transaction(async () => {
              // First we publish all the singleTypes
              for (const { uid, action, id } of singleTypeActions) {
                await publishSingleTypeAction(uid, action, id);
              }

              // Then, we can continue with publishing the collectionTypes
              for (const contentTypeUid of Object.keys(collectionTypeActions)) {
                const uid = contentTypeUid as UID.ContentType;

                await publishCollectionTypeAction(
                  uid,
                  collectionTypeActions[uid].entriesToPublishIds,
                  collectionTypeActions[uid].entriesToUnpublishIds
                );
              }
            });

            const release = await strapi.db.query(RELEASE_MODEL_UID).update({
              where: {
                id: releaseId,
              },
              data: {
                status: 'done',
                releasedAt: new Date(),
              },
            });

            dispatchWebhook(ALLOWED_WEBHOOK_EVENTS.RELEASES_PUBLISH, {
              isPublished: true,
              release,
            });

            strapi.telemetry.send('didPublishContentRelease');

            return { release, error: null };
          } catch (error) {
            dispatchWebhook(ALLOWED_WEBHOOK_EVENTS.RELEASES_PUBLISH, {
              isPublished: false,
              error,
            });

            // We need to run the update in the same transaction because the release is locked
            await strapi.db
              ?.queryBuilder(RELEASE_MODEL_UID)
              .where({ id: releaseId })
              .update({
                status: 'failed',
              })
              .transacting(trx)
              .execute();

            // At this point, we don't want to throw the error because if that happen we rollback the change in the release status
            // We want to throw the error after the transaction is finished, so we return the error
            return {
              release: null,
              error,
            };
          }
        });

      // Now the first transaction is commited, we can safely throw the error if it exists
      if (error) {
        throw error;
      }

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
          release: {
            id: releaseId,
            releasedAt: {
              $null: true,
            },
          },
        },
        data: update,
      });

      if (!updatedAction) {
        throw new errors.NotFoundError(
          `Action with id ${actionId} not found in release with id ${releaseId} or it is already published`
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
          release: {
            id: releaseId,
            releasedAt: {
              $null: true,
            },
          },
        },
      });

      if (!deletedAction) {
        throw new errors.NotFoundError(
          `Action with id ${actionId} not found in release with id ${releaseId} or it is already published`
        );
      }

      this.updateReleaseStatus(releaseId);

      return deletedAction;
    },

    async updateReleaseStatus(releaseId: Release['id']) {
      const [totalActions, invalidActions] = await Promise.all([
        this.countActions({
          filters: {
            release: releaseId,
          },
        }),
        this.countActions({
          filters: {
            release: releaseId,
            isEntryValid: false,
          },
        }),
      ]);

      if (totalActions > 0) {
        if (invalidActions > 0) {
          return strapi.db.query(RELEASE_MODEL_UID).update({
            where: {
              id: releaseId,
            },
            data: {
              status: 'blocked',
            },
          });
        }

        return strapi.db.query(RELEASE_MODEL_UID).update({
          where: {
            id: releaseId,
          },
          data: {
            status: 'ready',
          },
        });
      }

      return strapi.db.query(RELEASE_MODEL_UID).update({
        where: {
          id: releaseId,
        },
        data: {
          status: 'empty',
        },
      });
    },
  };
};

export default createReleaseService;
