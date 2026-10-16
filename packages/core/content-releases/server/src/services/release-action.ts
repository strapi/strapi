import { errors, async } from '@strapi/utils';

import type { Core, Internal, Modules, UID, Data } from '@strapi/types';

import _ from 'lodash/fp';

import {
  AUDITED_EVENTS,
  PLANNED_ACTION_WHERE,
  RELEASE_ACTION_MODEL_UID,
  RELEASE_MODEL_UID,
} from '../constants';
import { emitAuditOnCommit } from '../audit-logs';
import { AlreadyOnReleaseError } from './validation';

import type {
  CreateReleaseAction,
  CreateManyReleaseActions,
  GetReleaseActions,
  ReleaseAction,
  ReleaseActionGroupBy,
  UpdateReleaseAction,
  DeleteReleaseAction,
} from '../../../shared/contracts/release-actions';
import type { Release } from '../../../shared/contracts/releases';
import type { Entity } from '../../../shared/types';
import {
  getService,
  getActionValidity,
  getEntry,
  getEntryStatus,
  getValidityForActions,
  lockRelease,
  UNPUBLISH_VALIDITY,
} from '../utils';
import type { EntryValidity } from '../utils';

const getGroupName = (queryValue: string) => {
  switch (queryValue) {
    case 'contentType':
      return 'contentType.displayName';
    case 'type':
      return 'type';
    case 'locale':
      return _.getOr('No locale', 'locale.name');
    default:
      return 'contentType.displayName';
  }
};

export interface Locale extends Entity {
  name: string;
  code: string;
}

type LocaleDictionary = {
  [key: Locale['code']]: Pick<Locale, 'name' | 'code'>;
};

// The actions of an entry: `locale: null` matches a content type that isn't localized, an
// omitted locale every locale
type EntryActionsWhere = Pick<ReleaseAction, 'contentType'> &
  Partial<Pick<ReleaseAction, 'entryDocumentId'>> & { locale?: ReleaseAction['locale'] | null };

// A filter on release actions, in the filter syntax the query engine's `where` takes
type ReleaseActionWhere = Modules.Documents.Params.Filters.Any<typeof RELEASE_ACTION_MODEL_UID>;

// An action checked against its release, ready to be written
interface PreparedAction {
  action: CreateReleaseAction.Request['body'];
  validity: EntryValidity;
}

type LockedRelease = Pick<Release, 'id' | 'name' | 'releasedAt'>;

const createReleaseActionService = ({ strapi }: { strapi: Core.Strapi }) => {
  const getLocalesDataForActions = async () => {
    const allLocales = await strapi.localization.getLocales();
    return allLocales.reduce<LocaleDictionary>((acc, locale) => {
      acc[locale.code] = { name: locale.name, code: locale.code };

      return acc;
    }, {});
  };

  const getContentTypesDataForActions = async (
    contentTypesUids: ReleaseAction['contentType'][]
  ) => {
    const contentManagerContentTypeService = strapi
      .plugin('content-manager')
      .service('content-types');

    const contentTypesData: Record<
      Internal.UID.ContentType,
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
  };

  // A request's change to a release's actions: written with the status it changes in one
  // transaction, under the release lock, so a failed status update undoes the change, the audit
  // event waits for the commit, and a release that ran never gains, loses or changes an action
  const commitWithReleaseStatus = <T>(
    releaseId: Data.ID,
    change: (release: LockedRelease) => Promise<T>
  ) =>
    strapi.db.transaction(async () => {
      const release: LockedRelease | undefined = await lockRelease({ strapi }, releaseId, [
        'id',
        'name',
        'releasedAt',
      ]);

      if (!release) {
        throw new errors.NotFoundError(`No release found for id ${releaseId}`);
      }

      if (release.releasedAt) {
        throw new errors.ValidationError('Release already published');
      }

      const result = await change(release);
      await getService('release', { strapi }).updateReleaseStatus(releaseId);

      return result;
    });

  // A background change to planned actions of several releases (after an entry or a workflow
  // changed): one release at a time, each under its lock with its status. A release that ran or
  // was deleted in between is left alone. A release whose change fails is rolled back and logged
  // without stopping the others; the savepoint keeps a caller's transaction (a review workflow
  // change) usable after such a failure. Returns the releases whose change failed.
  const changePlannedActionsByRelease = async <TAction extends { release: { id: Data.ID } }>(
    actions: TAction[],
    change: (releaseActions: TAction[]) => Promise<void>
  ) => {
    const actionsByRelease = new Map<Data.ID, TAction[]>();
    for (const action of actions) {
      const releaseActions = actionsByRelease.get(action.release.id);
      if (releaseActions) {
        releaseActions.push(action);
      } else {
        actionsByRelease.set(action.release.id, [action]);
      }
    }

    const failedReleaseIds: Data.ID[] = [];
    for (const [releaseId, releaseActions] of actionsByRelease) {
      try {
        await strapi.db.transaction(() =>
          strapi.db.savepoint(async () => {
            const release = await lockRelease({ strapi }, releaseId, ['releasedAt']);

            if (!release || release.releasedAt) {
              return;
            }

            await change(releaseActions);
            await getService('release', { strapi }).updateReleaseStatus(releaseId);
          })
        );
      } catch (error: unknown) {
        failedReleaseIds.push(releaseId);
        strapi.log.error(`Error while changing the actions of release ${releaseId}`, { error });
      }
    }

    return failedReleaseIds;
  };

  /**
   * Stores the current validity and reason of the planned actions matching `where`: a publish
   * action gets its draft's (a draft that can't be read is stored as not publishable, so it
   * doesn't stop the others), an unpublish action stored as invalid by an earlier version becomes
   * valid. Then recalculates their releases' status.
   */
  const revalidatePlannedActions = async (where: ReleaseActionWhere) => {
    const actions: (ReleaseAction & { release: { id: Data.ID } })[] = await strapi.db
      .query(RELEASE_ACTION_MODEL_UID)
      .findMany({
        where: { ...where, ...PLANNED_ACTION_WHERE },
        populate: { release: { select: ['id'] } },
      });

    // The drafts are read before taking any lock
    const publishValidities = new Map(
      (
        await getValidityForActions(
          actions.filter((action) => action.type === 'publish'),
          { strapi }
        )
      ).map(({ action, validity }) => [action.id, validity])
    );

    await changePlannedActionsByRelease(actions, async (releaseActions) => {
      for (const action of releaseActions) {
        const validity = publishValidities.get(action.id);

        // By type too: a type change committed since the read keeps its own validity
        if (validity) {
          await strapi.db
            .query(RELEASE_ACTION_MODEL_UID)
            .update({ where: { id: action.id, type: 'publish' }, data: validity });
        } else if (!action.isEntryValid) {
          await strapi.db
            .query(RELEASE_ACTION_MODEL_UID)
            .update({ where: { id: action.id, type: 'unpublish' }, data: UNPUBLISH_VALIDITY });
        }
      }
    });
  };

  // Deletes the planned actions matching `where`, then recalculates their releases' status.
  // Returns the releases whose change failed.
  const deletePlannedActions = async (where: ReleaseActionWhere) => {
    const actions: { id: Data.ID; release: { id: Data.ID } }[] = await strapi.db
      .query(RELEASE_ACTION_MODEL_UID)
      .findMany({
        where: { ...where, ...PLANNED_ACTION_WHERE },
        select: ['id'],
        populate: { release: { select: ['id'] } },
      });

    return changePlannedActionsByRelease(actions, async (releaseActions) => {
      await strapi.db.query(RELEASE_ACTION_MODEL_UID).deleteMany({
        where: { id: { $in: releaseActions.map((action) => action.id) } },
      });
    });
  };

  // Checks an action can join a release and reads its entry's validity; writes nothing. Whether
  // the release still takes changes is decided under its lock.
  const prepareAction = async (
    releaseId: CreateReleaseAction.Request['params']['releaseId'],
    action: CreateReleaseAction.Request['body']
  ): Promise<PreparedAction> => {
    const { validateEntryData, validateUniqueEntry } = getService('release-validation', {
      strapi,
    });

    await Promise.all([
      validateEntryData(action.contentType, action.entryDocumentId),
      validateUniqueEntry(releaseId, action),
    ]);

    // If we are adding a singleType, its action points at the singleType's document
    const model = strapi.contentType(action.contentType);
    let { entryDocumentId } = action;
    if (model.kind === 'singleType') {
      const document = await strapi.db.query(model.uid).findOne({ select: ['documentId'] });

      if (!document) {
        throw new errors.NotFoundError(`No entry found for contentType ${action.contentType}`);
      }

      entryDocumentId = document.documentId;
    }
    const preparedAction = { ...action, entryDocumentId };

    return {
      action: preparedAction,
      validity: await getActionValidity(preparedAction, { strapi }),
    };
  };

  // Writes a prepared action into a locked release; its audit event waits for the commit
  const writeAction = async (release: LockedRelease, { action, validity }: PreparedAction) => {
    const releaseAction = await strapi.db.query(RELEASE_ACTION_MODEL_UID).create({
      data: {
        type: action.type,
        contentType: action.contentType,
        entryDocumentId: action.entryDocumentId,
        locale: action.locale,
        release: release.id,
        ...validity,
      },
      populate: { release: { select: ['id'] } },
    });

    await emitAuditOnCommit({ strapi }, AUDITED_EVENTS.RELEASE_ENTRY_ADD, {
      releaseId: release.id,
      name: release.name,
      actionId: releaseAction.id,
      type: releaseAction.type,
      contentType: releaseAction.contentType,
      entryDocumentId: releaseAction.entryDocumentId,
      locale: releaseAction.locale,
    });

    return releaseAction;
  };

  return {
    async create(
      releaseId: CreateReleaseAction.Request['params']['releaseId'],
      action: CreateReleaseAction.Request['body']
    ) {
      // Prepared before the lock: reading the draft doesn't hold up a run
      const prepared = await prepareAction(releaseId, action);

      return commitWithReleaseStatus(releaseId, (release) => writeAction(release, prepared));
    },

    // Entries already in the release are skipped and counted. As for a single action, the
    // actions are prepared before the lock, then written with the status they change
    async createMany(
      releaseId: CreateManyReleaseActions.Request['params']['releaseId'],
      actions: CreateManyReleaseActions.Request['body']
    ) {
      const preparedOrSkipped = await Promise.all(
        actions.map(async (action) => {
          try {
            return await prepareAction(releaseId, action);
          } catch (error) {
            if (error instanceof AlreadyOnReleaseError) {
              return null;
            }
            throw error;
          }
        })
      );
      const prepared = preparedOrSkipped.filter((action) => action !== null);

      return commitWithReleaseStatus(releaseId, async (release) => ({
        created: await Promise.all(prepared.map((action) => writeAction(release, action))),
        alreadyInRelease: actions.length - prepared.length,
      }));
    },

    async findPage(
      releaseId: GetReleaseActions.Request['params']['releaseId'],
      query?: GetReleaseActions.Request['query']
    ) {
      const release = await strapi.db.query(RELEASE_MODEL_UID).findOne({
        where: { id: releaseId },
        select: ['id'],
      });

      if (!release) {
        throw new errors.NotFoundError(`No release found for id ${releaseId}`);
      }

      const dbQuery = strapi.get('query-params').transform(RELEASE_ACTION_MODEL_UID, query ?? {});
      const { results: actions, pagination } = await strapi.db
        .query(RELEASE_ACTION_MODEL_UID)
        .findPage({
          ...dbQuery,
          where: {
            release: releaseId,
          },
        });

      // For each contentType on the release, we create a custom populate object for nested relations
      const populateBuilderService = strapi.plugin('content-manager').service('populate-builder');

      const actionsWithEntry = await async.map(actions, async (action: ReleaseAction) => {
        // @ts-expect-error - Core.Service type is not a function
        const populate = await populateBuilderService(action.contentType)
          .populateDeep(Infinity)
          .build();

        const entry = await getEntry(
          {
            contentType: action.contentType,
            documentId: action.entryDocumentId,
            locale: action.locale,
            populate,
            status: action.type === 'publish' ? 'draft' : 'published',
          },
          { strapi }
        );

        return {
          ...action,
          entry,
          status: entry ? await getEntryStatus(action.contentType, entry) : null,
        };
      });

      return {
        results: actionsWithEntry,
        pagination,
      };
    },

    async groupActions(actions: ReleaseAction[], groupBy: ReleaseActionGroupBy) {
      const contentTypeUids = actions.reduce<ReleaseAction['contentType'][]>((acc, action) => {
        if (!acc.includes(action.contentType)) {
          acc.push(action.contentType);
        }

        return acc;
      }, []);
      const allReleaseContentTypesDictionary = await getContentTypesDataForActions(contentTypeUids);
      const allLocalesDictionary = await getLocalesDataForActions();

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

    async getContentTypeModelsFromActions(actions: ReleaseAction[]) {
      const contentTypeUids = actions.reduce<ReleaseAction['contentType'][]>((acc, action) => {
        if (!acc.includes(action.contentType)) {
          acc.push(action.contentType);
        }

        return acc;
      }, []);

      const workflowsService = strapi.plugin('review-workflows').service('workflows');

      const contentTypeModelsMap = await async.reduce(contentTypeUids)(
        async (
          accPromise: Promise<GetReleaseActions.Response['meta']['contentTypes']>,
          contentTypeUid: ReleaseAction['contentType']
        ) => {
          const acc = await accPromise;
          const contentTypeModel = strapi.getModel(contentTypeUid);

          // Workflows service may not be available depending on the license
          const workflow = await workflowsService?.getAssignedWorkflow(contentTypeUid, {
            populate: 'stageRequiredToPublish',
          });

          acc[contentTypeUid] = {
            ...contentTypeModel,
            hasReviewWorkflow: !!workflow,
            stageRequiredToPublish: workflow?.stageRequiredToPublish,
          };

          return acc;
        },
        {}
      );

      return contentTypeModelsMap;
    },

    async countNotReadyByRelease(releaseIds: Data.ID[]): Promise<Map<Data.ID, number>> {
      if (releaseIds.length === 0) {
        return new Map();
      }

      const releases: { id: Data.ID; actions: { count: number } }[] = await strapi.db
        .query(RELEASE_MODEL_UID)
        .findMany({
          where: { id: { $in: releaseIds }, releasedAt: null },
          select: ['id'],
          populate: { actions: { count: true, where: { type: 'publish', isEntryValid: false } } },
        });

      return new Map(releases.map((release) => [release.id, release.actions.count]));
    },

    async countActions(
      query: Modules.EntityService.Params.Pick<typeof RELEASE_ACTION_MODEL_UID, 'filters'>
    ) {
      const dbQuery = strapi.get('query-params').transform(RELEASE_ACTION_MODEL_UID, query ?? {});

      return strapi.db.query(RELEASE_ACTION_MODEL_UID).count(dbQuery);
    },

    async update(
      actionId: UpdateReleaseAction.Request['params']['actionId'],
      releaseId: UpdateReleaseAction.Request['params']['releaseId'],
      update: UpdateReleaseAction.Request['body']
    ) {
      // A release that ran is refused under the lock, as for any change
      const action = await strapi.db.query(RELEASE_ACTION_MODEL_UID).findOne({
        where: { id: actionId, release: { id: releaseId } },
        populate: { release: { select: ['id', 'name'] } },
      });

      if (!action) {
        throw new errors.NotFoundError(
          `Action with id ${actionId} not found in release with id ${releaseId}`
        );
      }

      const validity = await getActionValidity({ ...action, type: update.type }, { strapi });

      return commitWithReleaseStatus(releaseId, async () => {
        const updatedAction = await strapi.db.query(RELEASE_ACTION_MODEL_UID).update({
          where: { id: actionId, release: { id: releaseId } },
          // Only the field the PUT contract allows. Changing the entry is remove + add.
          data: {
            type: update.type,
            ...validity,
          },
        });

        // Removed since the read above
        if (!updatedAction) {
          throw new errors.NotFoundError(
            `Action with id ${actionId} not found in release with id ${releaseId}`
          );
        }

        // Validity and reason are recalculated, not edited: only the type change is audited
        if (action.type !== updatedAction.type) {
          await emitAuditOnCommit({ strapi }, AUDITED_EVENTS.RELEASE_ENTRY_UPDATE, {
            releaseId: action.release?.id ?? Number(releaseId),
            name: action.release?.name,
            actionId: updatedAction.id,
            contentType: updatedAction.contentType,
            entryDocumentId: updatedAction.entryDocumentId,
            locale: updatedAction.locale,
            from: action.type,
            to: updatedAction.type,
          });
        }

        return updatedAction;
      });
    },

    async delete(
      actionId: DeleteReleaseAction.Request['params']['actionId'],
      releaseId: DeleteReleaseAction.Request['params']['releaseId']
    ) {
      return commitWithReleaseStatus(releaseId, async () => {
        const deletedRow = await strapi.db.query(RELEASE_ACTION_MODEL_UID).delete({
          where: { id: actionId, release: { id: releaseId } },
          populate: { release: { select: ['id', 'name'] } },
        });

        if (!deletedRow) {
          throw new errors.NotFoundError(
            `Action with id ${actionId} not found in release with id ${releaseId}`
          );
        }

        const { release: populatedRelease, ...deletedAction } = deletedRow;

        await emitAuditOnCommit({ strapi }, AUDITED_EVENTS.RELEASE_ENTRY_REMOVE, {
          releaseId: populatedRelease?.id ?? Number(releaseId),
          name: populatedRelease?.name,
          actionId: deletedAction.id,
          type: deletedAction.type,
          contentType: deletedAction.contentType,
          entryDocumentId: deletedAction.entryDocumentId,
          locale: deletedAction.locale,
        });

        return deletedAction;
      });
    },

    // After an entry is deleted. Only planned releases: a release that ran keeps the entry's
    // action and what its run recorded
    async deleteEntryActions(where: EntryActionsWhere) {
      await deletePlannedActions(where);
    },

    // After a content type is deleted or loses Draft and Publish: its entries can no longer be
    // read or released, so its actions leave every release, including releases that ran (they
    // keep their status and totals). The planned releases' statuses are recalculated.
    async deleteContentTypeActions(contentTypeUids: UID.ContentType[]) {
      const where = { contentType: { $in: contentTypeUids } };

      const failedReleaseIds = await deletePlannedActions(where);
      await strapi.db.query(RELEASE_ACTION_MODEL_UID).deleteMany({ where });

      // A planned release whose locked removal failed lost its actions with the rest
      for (const releaseId of failedReleaseIds) {
        await getService('release', { strapi })
          .updateReleaseStatus(releaseId)
          .catch((error: unknown) => {
            strapi.log.error(`Error while updating the status of release ${releaseId}`, { error });
          });
      }
    },

    revalidatePlannedActions,

    // After an entry's draft changes (updated, or discarded for the published version)
    async revalidateEntryActions(
      contentType: UID.ContentType,
      entry: Modules.Documents.AnyDocument
    ) {
      await revalidatePlannedActions({
        contentType,
        entryDocumentId: entry.documentId,
        locale: entry.locale,
      });
    },

    // After a review workflow change: what "at the required stage" means may have changed
    async validateActionsByContentTypes(contentTypeUids: UID.ContentType[]) {
      await revalidatePlannedActions({ contentType: { $in: contentTypeUids } });
    },
  };
};

export type ReleaseActionService = ReturnType<typeof createReleaseActionService>;

export default createReleaseActionService;
