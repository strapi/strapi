import { setCreatorFields, errors, emitAudit } from '@strapi/utils';

import type { Core, Struct, Data } from '@strapi/types';

import {
  ALLOWED_WEBHOOK_EVENTS,
  AUDITED_EVENTS,
  RELEASE_ACTION_MODEL_UID,
  RELEASE_MODEL_UID,
} from '../constants';
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
import { getService, getPublishOrderForContentTypes, getPublishabilityForActions } from '../utils';
import { getReleaseChanges } from '../audit-logs';

/** What started a publish: the publish button or API, or the scheduler at the release date */
export type PublishTrigger = 'manual' | 'scheduled';

type LockedRelease = Pick<Release, 'id' | 'name' | 'releasedAt' | 'status' | 'releaseCondition'>;

/**
 * How the locked part of a publish ended. One shape per case, so each case carries only what
 * it has: a released run has its updated release, a rejected publish never ran.
 */
type LockedPublishResult =
  | {
      kind: 'released';
      release: Pick<Release, 'id' | 'releasedAt' | 'status'>;
      lockedRelease: LockedRelease;
    }
  | { kind: 'failed'; error: unknown; lockedRelease: LockedRelease }
  | { kind: 'rejected'; error: Error };

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
   * The release's actions in the order a run handles them: content types in dependency order,
   * so that when entity A has a relation to entity B, B is published first to keep the relation;
   * within a content type, publishes then unpublishes, each in the order they were added.
   */
  const getActionsInRunOrder = async (releaseId: Release['id']) => {
    const actions = (await strapi.db.query(RELEASE_ACTION_MODEL_UID).findMany({
      where: {
        release: {
          id: releaseId,
        },
      },
      orderBy: { id: 'asc' },
    })) as ReleaseAction[];

    const contentTypeUids = getPublishOrderForContentTypes(
      [...new Set(actions.map((action) => action.contentType))],
      { strapi }
    );

    return contentTypeUids.flatMap((contentTypeUid) => [
      ...actions.filter(
        ({ contentType, type }) => contentType === contentTypeUid && type === 'publish'
      ),
      ...actions.filter(
        ({ contentType, type }) => contentType === contentTypeUid && type === 'unpublish'
      ),
    ]);
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

      // Audited before scheduling: a scheduling failure shouldn't leave the write
      // unrecorded.
      await emitAudit({ strapi }, AUDITED_EVENTS.RELEASE_CREATE, {
        releaseId: release.id,
        name: release.name,
        ...(release.scheduledAt && {
          scheduledAt: release.scheduledAt,
          timezone: release.timezone,
        }),
        releaseCondition: release.releaseCondition,
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

      // Audited before scheduling, against the pre-image read next to the write.
      // A write that matched no row (deleted in between) has nothing to report.
      if (updatedRelease) {
        const changes = getReleaseChanges(release, updatedRelease);

        if (Object.keys(changes).length > 0) {
          await emitAudit({ strapi }, AUDITED_EVENTS.RELEASE_UPDATE, {
            releaseId: updatedRelease.id,
            name: updatedRelease.name,
            changes,
          });
        }
      }

      const schedulingService = getService('scheduling', { strapi });

      if (releaseData.scheduledAt) {
        // set function always cancel the previous job if it exists, so we can call it directly
        await schedulingService.set(id, releaseData.scheduledAt);
      } else if (release.scheduledAt) {
        // When user don't send a scheduledAt and we have one on the release, means that user want to unschedule it
        schedulingService.cancel(id);
      }

      // Awaited so that a read right after the update sees the recalculated status
      await this.updateReleaseStatus(id);

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

      await emitAudit({ strapi }, AUDITED_EVENTS.RELEASE_DELETE, {
        releaseId: release.id,
        name: release.name,
      });

      return release;
    },

    async publish(
      releaseId: PublishRelease.Request['params']['id'],
      { trigger }: { trigger: PublishTrigger }
    ) {
      const result = await strapi.db.transaction(async ({ trx }): Promise<LockedPublishResult> => {
        /**
         * We lock the release in this transaction, so any other process trying to publish it will wait until this transaction is finished
         * In this transaction we don't care about rollback, becasue we want to persist the lock until the end and if it fails we want to change the release status to failed
         */
        const lockedRelease: LockedRelease | undefined = await strapi.db
          ?.queryBuilder(RELEASE_MODEL_UID)
          .where({ id: releaseId })
          .select(['id', 'name', 'releasedAt', 'status', 'releaseCondition'])
          .first()
          .transacting(trx)
          .forUpdate()
          .execute();

        if (!lockedRelease) {
          throw new errors.NotFoundError(`No release found for id ${releaseId}`);
        }

        if (lockedRelease.releasedAt) {
          throw new errors.ValidationError('Release already published');
        }

        if (lockedRelease.status === 'failed') {
          throw new errors.ValidationError('Release failed to publish');
        }

        // Any other value, null included, keeps the all-or-nothing behavior releases had before the condition existed
        const allowPartial = lockedRelease.releaseCondition === 'allow_partial';
        // Entries published or unpublished by this run. They stay so whatever happens next:
        // the entries share the lock transaction, which is committed even when the run fails.
        let releasedCount = 0;

        try {
          strapi.log.info(`[Content Releases] Starting to publish release ${lockedRelease.name}`);

          const actions = await getActionsInRunOrder(releaseId);

          // Checked before anything is written: a publish that fails validation halfway can
          // already have removed the entry's published version
          const checks = await getPublishabilityForActions(
            actions.filter((action) => action.type === 'publish'),
            { strapi }
          );
          // Narrowing on `publishable` types `error` as Error here, not Error | null
          const notPublishable = checks.flatMap(({ action, publishability }) =>
            publishability.publishable ? [] : [{ action, error: publishability.error }]
          );
          const skippedActionIds = new Set(notPublishable.map(({ action }) => action.id));

          const firstNotPublishable = notPublishable.at(0);
          // A release with no actions runs, and ends done
          const wouldReleaseNothing =
            firstNotPublishable !== undefined &&
            (!allowPartial || notPublishable.length === actions.length);

          // TypeScript narrows `firstNotPublishable` to defined through this alias
          if (wouldReleaseNothing) {
            if (trigger === 'manual') {
              // Not a run: nothing is written and the release stays planned. The check's
              // result is stored first, so the status reads blocked even if what was stored
              // had gone out of date.
              const publishableIds = checks.flatMap(({ action, publishability }) =>
                publishability.publishable ? [action.id] : []
              );
              if (publishableIds.length > 0) {
                await strapi.db.query(RELEASE_ACTION_MODEL_UID).updateMany({
                  where: { id: { $in: publishableIds } },
                  data: { isEntryValid: true },
                });
              }
              await strapi.db.query(RELEASE_ACTION_MODEL_UID).updateMany({
                where: { id: { $in: [...skippedActionIds] } },
                data: { isEntryValid: false },
              });
              await this.updateReleaseStatus(releaseId);

              // Thrown after commit, so these writes are kept
              return { kind: 'rejected', error: firstNotPublishable.error };
            }

            throw allowPartial
              ? new errors.ValidationError('No entries were published')
              : firstNotPublishable.error;
          }

          // Serialized, also within a content type: concurrent publishes of related documents
          // can race on shared join-table state (notably self-referential relations) and
          // leave inconsistent FK rows when one branch deletes a row another branch is
          // about to reference.
          for (const action of actions) {
            // Only an allow_partial run gets here with entries that aren't publishable: they're skipped
            if (skippedActionIds.has(action.id)) {
              continue;
            }

            const params = { documentId: action.entryDocumentId, locale: action.locale };

            try {
              if (action.type === 'publish') {
                await strapi.documents(action.contentType).publish(params);
              } else {
                await strapi.documents(action.contentType).unpublish(params);
              }

              releasedCount += 1;
            } catch (actionError) {
              // An all_or_nothing run stops at the first error
              if (!allowPartial) {
                throw actionError;
              }

              // Only the error's name: driver errors can carry row contents
              strapi.log.warn(
                `[Content Releases] Release ${lockedRelease.name}: skipped an entry that failed to ${action.type} (${actionError instanceof Error ? actionError.name : 'Error'})`
              );
            }
          }

          if (actions.length > 0 && releasedCount === 0) {
            throw new errors.ValidationError('No entries were published');
          }

          const release = await strapi.db.query(RELEASE_MODEL_UID).update({
            where: {
              id: releaseId,
            },
            data: {
              status: releasedCount === actions.length ? 'done' : 'partial',
              releasedAt: new Date(),
            },
          });

          dispatchWebhook(ALLOWED_WEBHOOK_EVENTS.RELEASES_PUBLISH, {
            isPublished: true,
            release,
          });

          strapi.telemetry.send('didPublishContentRelease');

          return { kind: 'released', release, lockedRelease };
        } catch (error) {
          dispatchWebhook(ALLOWED_WEBHOOK_EVENTS.RELEASES_PUBLISH, {
            isPublished: releasedCount > 0,
            error,
          });

          // We need to run the update in the same transaction because the release is locked.
          // A run stopped after releasing entries is partial: they stay released.
          await strapi.db
            ?.queryBuilder(RELEASE_MODEL_UID)
            .where({ id: releaseId })
            .update(
              releasedCount > 0
                ? { status: 'partial', releasedAt: new Date() }
                : { status: 'failed' }
            )
            .transacting(trx)
            .execute();

          // At this point, we don't want to throw the error because if that happen we rollback the change in the release status
          // We want to throw the error after the transaction is finished, so we return the error
          return {
            kind: 'failed',
            // A rejection can carry any value, even null: never mistake it for success
            error: error ?? new Error('Release publish failed with an empty error'),
            lockedRelease,
          };
        }
      });

      // A manual publish that would release nothing never ran: no failure to record
      if (result.kind === 'rejected') {
        throw result.error;
      }

      // The 'failed' or 'partial' status is already committed, so this emit cannot be rolled back.
      // Pre-flight rejections threw before the run and never reach it.
      if (result.kind === 'failed') {
        const { error, lockedRelease } = result;

        await emitAudit({ strapi }, AUDITED_EVENTS.RELEASE_TRIGGER, {
          releaseId: lockedRelease.id,
          name: lockedRelease.name,
          outcome: 'failure',
          // The error's name and nothing else from it: driver errors can carry row
          // contents in their properties
          reason: error instanceof Error ? error.name : 'Error',
        });

        // Swallowing a non-Error throwable would report the publish as successful
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Release publish failed', { cause: error });
      }

      // Only a run that released its entries is left
      const { release, lockedRelease } = result;

      // Counted after the publish, while the actions still exist.
      // A count failure doesn't fail the committed publish: the error is returned.
      const releaseActionService = getService('release-action', { strapi });
      let counts = null;
      let countsError: Error | null = null;

      try {
        const [published, unpublished] = await Promise.all([
          releaseActionService.countActions({ filters: { release: releaseId, type: 'publish' } }),
          releaseActionService.countActions({
            filters: { release: releaseId, type: 'unpublish' },
          }),
        ]);
        counts = { published, unpublished };
      } catch (err) {
        countsError = err instanceof Error ? err : new Error(String(err), { cause: err });
        strapi.log.error(
          `Failed to count the entries for the release.trigger entry of release ${releaseId}`,
          { error: countsError }
        );
      }

      await emitAudit({ strapi }, AUDITED_EVENTS.RELEASE_TRIGGER, {
        releaseId: lockedRelease.id,
        name: lockedRelease.name,
        outcome: 'success',
        published: counts?.published,
        unpublished: counts?.unpublished,
      });

      return { release, counts, countsError };
    },

    async updateReleaseStatus(releaseId: Release['id']) {
      const releaseActionService = getService('release-action', { strapi });

      // The query layer returns `any`: the annotation makes the condition comparison below type-checked
      const releaseRead: Promise<Pick<Release, 'releaseCondition'> | null> = strapi.db
        .query(RELEASE_MODEL_UID)
        .findOne({ where: { id: releaseId }, select: ['releaseCondition'] });

      const [totalActions, invalidActions, release] = await Promise.all([
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
        releaseRead,
      ]);

      let status: Release['status'] = 'empty';

      if (totalActions > 0) {
        // Blocked: publishing now would release nothing. Unpublish actions are always valid.
        const isBlocked =
          release?.releaseCondition === 'allow_partial'
            ? invalidActions === totalActions
            : invalidActions > 0;

        status = isBlocked ? 'blocked' : 'ready';
      }

      return strapi.db.query(RELEASE_MODEL_UID).update({
        where: {
          id: releaseId,
        },
        data: {
          status,
        },
      });
    },
  };
};

export type ReleaseService = ReturnType<typeof createReleaseService>;

export default createReleaseService;
