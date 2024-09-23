import { setCreatorFields, errors } from '@strapi/utils';

import type { Core, Struct, UID, Data } from '@strapi/types';

import { ALLOWED_WEBHOOK_EVENTS, RELEASE_ACTION_MODEL_UID, RELEASE_MODEL_UID } from '../constants';
import type {
  GetReleases,
  CreateRelease,
  UpdateRelease,
  PublishRelease,
  GetRelease,
  Release,
  DeleteRelease,
} from '../../../shared/contracts/releases';
import type { ReleaseAction } from '../../../shared/contracts/release-actions';
import type { UserInfo } from '../../../shared/types';
import { getService } from '../utils';

const createReleaseService = ({ strapi }: { strapi: Core.Strapi }) => {
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

  /**
   * Given a release id, it returns the actions formatted ready to be used to publish them.
   * We split them by contentType and type (publish/unpublish) and extract only the documentIds and locales.
   */
  const getFormattedActions = async (releaseId: Release['id']) => {
    const actions = (await strapi.db.query(RELEASE_ACTION_MODEL_UID).findMany({
      where: {
        release: {
          id: releaseId,
        },
      },
    })) as ReleaseAction[];

    if (actions.length === 0) {
      throw new errors.ValidationError('No entries to publish');
    }

    /**
     * We separate publish and unpublish actions, grouping them by contentType and extracting only their documentIds and locales.
     */
    const formattedActions: {
      [key: UID.ContentType]: {
        publish: { documentId: ReleaseAction['entryDocumentId']; locale?: string }[];
        unpublish: { documentId: ReleaseAction['entryDocumentId']; locale?: string }[];
      };
    } = {};

    for (const action of actions) {
      const contentTypeUid: UID.ContentType = action.contentType;

      if (!formattedActions[contentTypeUid]) {
        formattedActions[contentTypeUid] = {
          publish: [],
          unpublish: [],
        };
      }

      formattedActions[contentTypeUid][action.type].push({
        documentId: action.entryDocumentId,
        locale: action.locale,
      });
    }

    return formattedActions;
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

      const release = await strapi.db.query(RELEASE_MODEL_UID).create({
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
      const dbQuery = strapi.get('query-params').transform(RELEASE_MODEL_UID, query);
      const release = await strapi.db.query(RELEASE_MODEL_UID).findOne({
        ...dbQuery,
        where: { id },
      });

      return release;
    },

    findPage(query?: GetReleases.Request['query']) {
      const dbQuery = strapi.get('query-params').transform(RELEASE_MODEL_UID, query ?? {});

      return strapi.db.query(RELEASE_MODEL_UID).findPage({
        ...dbQuery,
        populate: {
          actions: {
            count: true,
          },
        },
      });
    },

    findMany(query?: any) {
      const dbQuery = strapi.get('query-params').transform(RELEASE_MODEL_UID, query ?? {});

      return strapi.db.query(RELEASE_MODEL_UID).findMany({
        ...dbQuery,
      });
    },

    async update(
      id: Data.ID,
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

      const release = await strapi.db.query(RELEASE_MODEL_UID).findOne({ where: { id } });

      if (!release) {
        throw new errors.NotFoundError(`No release found for id ${id}`);
      }

      if (release.releasedAt) {
        throw new errors.ValidationError('Release already published');
      }

      const updatedRelease = await strapi.db.query(RELEASE_MODEL_UID).update({
        where: { id },
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

    async getAllComponents() {
      const contentManagerComponentsService = strapi
        .plugin('content-manager')
        .service('components');

      const components = await contentManagerComponentsService.findAllComponents();

      const componentsMap = components.reduce(
        (
          acc: { [key: Struct.ComponentSchema['uid']]: Struct.ComponentSchema },
          component: Struct.ComponentSchema
        ) => {
          acc[component.uid] = component;

          return acc;
        },
        {}
      );

      return componentsMap;
    },

    async delete(releaseId: DeleteRelease.Request['params']['id']) {
      const release: Release = await strapi.db.query(RELEASE_MODEL_UID).findOne({
        where: { id: releaseId },
        populate: {
          actions: {
            select: ['id'],
          },
        },
      });

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

        await strapi.db.query(RELEASE_MODEL_UID).delete({
          where: {
            id: releaseId,
          },
        });
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
      }: { release: Pick<Release, 'id' | 'releasedAt' | 'status'> | null; error: unknown | null } =
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

            const formattedActions = await getFormattedActions(releaseId);

            await strapi.db.transaction(async () =>
              Promise.all(
                Object.keys(formattedActions).map(async (contentTypeUid) => {
                  const contentType = contentTypeUid as UID.ContentType;
                  const { publish, unpublish } = formattedActions[contentType];

                  return Promise.all([
                    ...publish.map((params) => strapi.documents(contentType).publish(params)),
                    ...unpublish.map((params) => strapi.documents(contentType).unpublish(params)),
                  ]);
                })
              )
            );

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
      if (error instanceof Error) {
        throw error;
      }

      return release;
    },

    async updateReleaseStatus(releaseId: Release['id']) {
      const releaseActionService = getService('release-action', { strapi });

      const [totalActions, invalidActions] = await Promise.all([
        releaseActionService.countActions({
          filters: {
            release: releaseId,
          },
        }),
        releaseActionService.countActions({
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

export type ReleaseService = ReturnType<typeof createReleaseService>;

export default createReleaseService;
