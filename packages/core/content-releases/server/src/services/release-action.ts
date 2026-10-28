import { errors, async, contentTypes } from '@strapi/utils';

import type { Core, Internal, Modules, UID, Data } from '@strapi/types';

import _ from 'lodash';

import { AUDITED_EVENTS, RELEASE_ACTION_MODEL_UID, RELEASE_MODEL_UID } from '../constants';
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
  getEntryKey,
  getEntryStatus,
  getReleaseActionsWhere,
  getValidityForActions,
  lockPlannedRelease,
  lockRelease,
  NOT_READY_ACTION_WHERE,
  PLANNED_ACTION_WHERE,
  runAfterCommit,
  UNPUBLISH_VALIDITY,
} from '../utils';
import type { DraftRef, EntryValidity, ReleaseActionWhere } from '../utils';

const getGroupName = (queryValue: string) => {
  switch (queryValue) {
    case 'contentType':
      return 'contentType.displayName';
    case 'type':
      return 'type';
    case 'locale':
      return (action: { locale?: Locale | null }) => _.get(action, 'locale.name', 'No locale');
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

// An action checked against its release, ready to be written
export interface PreparedAction {
  action: CreateReleaseAction.Request['body'];
  validity: EntryValidity;
}

type ReleaseRef = Pick<Release, 'id' | 'name'>;

const actionNotFound = (actionId: ReleaseAction['id'], releaseId: Release['id']) =>
  new errors.NotFoundError(`Action with id ${actionId} not found in release with id ${releaseId}`);

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
      const model = strapi.getModel(contentTypeUid);

      // Deleted after its release froze: only the uid is left
      if (!model) {
        contentTypesData[contentTypeUid] = { mainField: 'id', displayName: contentTypeUid };
        continue;
      }

      const contentTypeConfig = await contentManagerContentTypeService.findConfiguration({
        uid: contentTypeUid,
      });

      contentTypesData[contentTypeUid] = {
        mainField: contentTypeConfig.settings.mainField,
        displayName: model.info.displayName,
      };
    }

    return contentTypesData;
  };

  // A request's change to a planned release's actions, committed with the status it changes
  const commitWithReleaseStatus = <T>(
    releaseId: Data.ID,
    change: (release: ReleaseRef) => Promise<T>
  ) =>
    strapi.db.transaction(async () => {
      const release = await lockPlannedRelease(releaseId, ['id', 'name'], { strapi });

      const result = await change(release);
      await getService('release', { strapi }).updateReleaseStatus(releaseId);

      return result;
    });

  // A background change to the planned actions of several releases, one release per
  // transaction: a release that ran in between is left alone, and one that fails is logged
  // without stopping the others. Returns the releases whose change failed.
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
        await strapi.db.transaction(async () => {
          const release = await lockRelease(releaseId, ['releasedAt'], { strapi });

          if (!release || release.releasedAt) {
            return;
          }

          await change(releaseActions);
          await getService('release', { strapi }).updateReleaseStatus(releaseId);
        });
      } catch (error: unknown) {
        failedReleaseIds.push(releaseId);
        strapi.log.error(`Error while changing the actions of release ${releaseId}`, { error });
      }
    }

    return failedReleaseIds;
  };

  // One write per distinct validity (most share `{ isEntryValid: true, reason: null }`). By type
  // too: an action changed to unpublish since its draft was checked keeps its own validity
  const storePublishValidities = async (validities: Map<ReleaseAction['id'], EntryValidity>) => {
    const idsByValidity = new Map<
      string,
      { validity: EntryValidity; ids: ReleaseAction['id'][] }
    >();

    for (const [actionId, validity] of validities) {
      const key = JSON.stringify(validity);
      const group = idsByValidity.get(key);
      if (group) {
        group.ids.push(actionId);
      } else {
        idsByValidity.set(key, { validity, ids: [actionId] });
      }
    }

    for (const { validity, ids } of idsByValidity.values()) {
      await strapi.db
        .query(RELEASE_ACTION_MODEL_UID)
        .updateMany({ where: { id: { $in: ids }, type: 'publish' }, data: validity });
    }
  };

  /**
   * Stores the current validity of the planned actions matching `where` (an unpublish action
   * stored as invalid by an earlier version becomes valid), then recalculates their releases'
   * status.
   */
  const revalidatePlannedActions = async (where: ReleaseActionWhere) => {
    const actions: (ReleaseAction & { release: { id: Data.ID } })[] = await strapi.db
      .query(RELEASE_ACTION_MODEL_UID)
      .findMany({
        where: { ...where, ...PLANNED_ACTION_WHERE },
        populate: { release: { select: ['id'] } },
      });

    // The drafts are read before taking any lock
    const publishValidities = await getValidityForActions(actions, { strapi });

    await changePlannedActionsByRelease(actions, async (releaseActions) => {
      const releaseValidities = new Map<ReleaseAction['id'], EntryValidity>();
      for (const action of releaseActions) {
        const validity = publishValidities.get(action.id);

        if (validity) {
          releaseValidities.set(action.id, validity);
        } else if (!action.isEntryValid) {
          await strapi.db
            .query(RELEASE_ACTION_MODEL_UID)
            .update({ where: { id: action.id, type: 'unpublish' }, data: UNPUBLISH_VALIDITY });
        }
      }

      await storePublishValidities(releaseValidities);
    });
  };

  // Deletes the planned actions matching `where` (a release that ran keeps them, with what its
  // run recorded), then recalculates their releases' status. Returns the releases that failed.
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

  // Checks an action can join a release and reads its entry's validity; writes nothing
  const prepareAction = async (
    releaseId: CreateReleaseAction.Request['params']['releaseId'],
    action: CreateReleaseAction.Request['body']
  ): Promise<PreparedAction> => {
    const { validateEntryData, validateUniqueEntry } = getService('release-validation', {
      strapi,
    });

    validateEntryData(action.contentType, action.entryDocumentId);
    await validateUniqueEntry(releaseId, action);

    // If we are adding a singleType, its action points at the singleType's document
    const model = strapi.contentType(action.contentType);
    let { entryDocumentId } = action;
    if (model.kind === 'singleType') {
      const document = await strapi
        .documents(model.uid)
        .findFirst({ locale: action.locale, fields: ['documentId'] });

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
  const writeAction = async (release: ReleaseRef, { action, validity }: PreparedAction) => {
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

  // Keeps the actions whose entry still exists (in its locale, for a localized content type)
  // under a Draft & Publish content type. One query per content type.
  const filterExistingEntries = async <TAction extends DraftRef>(actions: TAction[]) => {
    const existing = new Set<string>();
    const localizedTypes = new Set<string>();
    // A localized action stored without a locale is run in the default locale, as the Document
    // Service resolves a missing locale
    let defaultLocale: string | null = null;

    for (const contentType of new Set(actions.map((action) => action.contentType))) {
      const model = strapi.contentType(contentType);

      if (model && contentTypes.hasDraftAndPublish(model)) {
        const isLocalized = strapi.localization.isLocalizedContentType(model);
        if (isLocalized) {
          localizedTypes.add(contentType);
          defaultLocale ??= await strapi.localization.getDefaultLocale();
        }

        const entries = await strapi.documents(contentType).findMany({
          filters: {
            documentId: {
              $in: actions
                .filter((action) => action.contentType === contentType)
                .map((action) => action.entryDocumentId),
            },
          },
          fields: ['documentId', ...(isLocalized ? ['locale'] : [])],
          ...(isLocalized && { locale: '*' }),
        });

        for (const entry of entries) {
          existing.add(
            getEntryKey(contentType, entry.documentId, isLocalized ? entry.locale : null)
          );
        }
      }
    }

    return actions.filter((action) =>
      existing.has(
        getEntryKey(
          action.contentType,
          action.entryDocumentId,
          localizedTypes.has(action.contentType) ? (action.locale ?? defaultLocale) : null
        )
      )
    );
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

    // Entries already in the release are skipped and counted
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

    /**
     * The skipped entries of a release that ran (only `actionIds`, if given), oldest first, with
     * their current validity. Entries deleted since the run are left out. Writes nothing.
     */
    async prepareSkippedActions(
      releaseId: Release['id'],
      actionIds?: ReleaseAction['id'][]
    ): Promise<PreparedAction[]> {
      const skippedActions: ReleaseAction[] = await strapi.db
        .query(RELEASE_ACTION_MODEL_UID)
        .findMany({
          where: {
            ...getReleaseActionsWhere(releaseId, 'skipped'),
            ...(actionIds && { id: { $in: actionIds } }),
          },
          orderBy: { id: 'asc' },
        });

      if (actionIds) {
        const skippedIds = new Set(skippedActions.map((action) => String(action.id)));
        const notSkippedIds = actionIds.filter((id) => !skippedIds.has(String(id)));

        if (notSkippedIds.length > 0) {
          throw new errors.ValidationError(
            `Actions with ids ${notSkippedIds.join(', ')} are not skipped entries of release ${releaseId}`
          );
        }
      }

      const actions = await filterExistingEntries(skippedActions);
      const publishValidities = await getValidityForActions(actions, { strapi });

      return actions.map((action) => ({
        action: {
          type: action.type,
          contentType: action.contentType,
          entryDocumentId: action.entryDocumentId,
          locale: action.locale,
        },
        validity: publishValidities.get(action.id) ?? UNPUBLISH_VALIDITY,
      }));
    },

    // Writes prepared actions in order, with the release status they change
    async createPrepared(releaseId: Data.ID, prepared: PreparedAction[]) {
      return commitWithReleaseStatus(releaseId, async (release) => {
        for (const preparedAction of prepared) {
          await writeAction(release, preparedAction);
        }
      });
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

      const { filter, ...params } = query ?? {};
      const dbQuery = strapi.get('query-params').transform(RELEASE_ACTION_MODEL_UID, params);
      const { results: actions, pagination } = await strapi.db
        .query(RELEASE_ACTION_MODEL_UID)
        .findPage({
          ...dbQuery,
          // Any other filter narrows the actions further
          where: dbQuery.where
            ? { $and: [dbQuery.where, getReleaseActionsWhere(releaseId, filter)] }
            : getReleaseActionsWhere(releaseId, filter),
        });

      // For each contentType on the release, we create a custom populate object for nested relations
      const populateBuilderService = strapi.plugin('content-manager').service('populate-builder');

      const actionsWithEntry = await async.map(actions, async (action: ReleaseAction) => {
        // Deleted after its release froze
        if (!strapi.contentType(action.contentType)) {
          return { ...action, entry: null, status: null };
        }

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
          status: entry ? await getEntryStatus(action.contentType, entry, { strapi }) : null,
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
            mainFieldValue: action.entry?.[mainField],
            uid: action.contentType,
          },
        };
      });

      const groupName = getGroupName(groupBy);
      return _.groupBy(formattedData, groupName);
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

          // Deleted after its release froze
          if (!contentTypeModel) {
            return acc;
          }

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
          populate: { actions: { count: true, where: NOT_READY_ACTION_WHERE } },
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
        throw actionNotFound(actionId, releaseId);
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
          throw actionNotFound(actionId, releaseId);
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
          throw actionNotFound(actionId, releaseId);
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

    deletePlannedActions,

    // After a content type is deleted or loses Draft and Publish: its entries can no longer be
    // released, so its actions leave every planned release
    async deleteContentTypeActions(contentTypeUids: UID.ContentType[]) {
      const where = { contentType: { $in: contentTypeUids } };

      const failedReleaseIds = await deletePlannedActions(where);
      if (failedReleaseIds.length === 0) {
        return;
      }

      // Without the lock for the releases whose locked removal failed
      await strapi.db
        .query(RELEASE_ACTION_MODEL_UID)
        .deleteMany({ where: { ...where, ...PLANNED_ACTION_WHERE } });

      for (const releaseId of failedReleaseIds) {
        await getService('release', { strapi })
          .updateReleaseStatus(releaseId)
          .catch((error: unknown) => {
            strapi.log.error(`Error while updating the status of release ${releaseId}`, { error });
          });
      }
    },

    revalidatePlannedActions,

    storePublishValidities,

    // After a review workflow change: what "at the required stage" means may have changed. Not
    // awaited, and after the workflow's commit, so its writes never wait on a release lock.
    validateActionsByContentTypes(contentTypeUids: UID.ContentType[]) {
      runAfterCommit(
        () => revalidatePlannedActions({ contentType: { $in: contentTypeUids } }),
        'Error while revalidating release actions after a review workflow change',
        { strapi }
      );
    },
  };
};

export type ReleaseActionService = ReturnType<typeof createReleaseActionService>;

export default createReleaseActionService;
