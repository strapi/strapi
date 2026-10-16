import { errors, async } from '@strapi/utils';

import type { Core, Internal, Modules, UID, Data } from '@strapi/types';

import _ from 'lodash/fp';

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
  getDraftEntryValidity,
  getEntry,
  getEntryStatus,
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
export type EntryActionsWhere = Pick<ReleaseAction, 'contentType'> &
  Partial<Pick<ReleaseAction, 'entryDocumentId'>> & { locale?: ReleaseAction['locale'] | null };

// An action checked against its release, ready to be written
interface PreparedAction {
  release: Pick<Release, 'id' | 'name'>;
  action: CreateReleaseAction.Request['body'];
  validity: EntryValidity;
}

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

  // An action change and the release status it changes commit together: a failed status update
  // undoes the change, and the audit event the change emits waits for the commit
  const commitWithReleaseStatus = <T>(releaseId: Data.ID, change: () => Promise<T>) =>
    strapi.db.transaction(async () => {
      const result = await change();
      await getService('release', { strapi }).updateReleaseStatus(releaseId);

      return result;
    });

  // Checks an action can join its release and reads its entry's validity; writes nothing
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

    const release = await strapi.db.query(RELEASE_MODEL_UID).findOne({ where: { id: releaseId } });

    if (!release) {
      throw new errors.NotFoundError(`No release found for id ${releaseId}`);
    }

    if (release.releasedAt) {
      throw new errors.ValidationError('Release already published');
    }

    const validity =
      preparedAction.type === 'publish'
        ? await getDraftEntryValidity(
            {
              contentType: preparedAction.contentType,
              documentId: preparedAction.entryDocumentId,
              locale: preparedAction.locale,
            },
            { strapi }
          )
        : UNPUBLISH_VALIDITY;

    return { release, action: preparedAction, validity };
  };

  // Writes a prepared action; its audit event waits for the commit
  const writeAction = async ({ release, action, validity }: PreparedAction) => {
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
      const prepared = await prepareAction(releaseId, action);

      return commitWithReleaseStatus(prepared.release.id, () => writeAction(prepared));
    },

    // Entries already in the release are skipped and counted. The new actions and the release
    // status they change commit together, as for a single action
    async createMany(
      releaseId: CreateManyReleaseActions.Request['params']['releaseId'],
      actions: CreateManyReleaseActions.Request['body']
    ) {
      return commitWithReleaseStatus(releaseId, async () => {
        let alreadyInRelease = 0;
        const createdOrSkipped = await Promise.all(
          actions.map(async (action) => {
            try {
              return await writeAction(await prepareAction(releaseId, action));
            } catch (error) {
              if (error instanceof AlreadyOnReleaseError) {
                alreadyInRelease += 1;
                return null;
              }
              throw error;
            }
          })
        );

        return { created: createdOrSkipped.filter((action) => action !== null), alreadyInRelease };
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
      const action = await strapi.db.query(RELEASE_ACTION_MODEL_UID).findOne({
        where: {
          id: actionId,
          release: {
            id: releaseId,
            releasedAt: {
              $null: true,
            },
          },
        },
        populate: { release: { select: ['id', 'name'] } },
      });

      if (!action) {
        throw new errors.NotFoundError(
          `Action with id ${actionId} not found in release with id ${releaseId} or it is already published`
        );
      }

      const validity =
        update.type === 'publish'
          ? await getDraftEntryValidity(
              {
                contentType: action.contentType,
                documentId: action.entryDocumentId,
                locale: action.locale,
              },
              { strapi }
            )
          : UNPUBLISH_VALIDITY;

      return commitWithReleaseStatus(releaseId, async () => {
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
          // Only the field the PUT contract allows. Changing the entry is remove + add.
          data: {
            type: update.type,
            ...validity,
          },
        });

        // Validity and reason are recalculated, not edited: only the type change is audited
        if (updatedAction && action.type !== updatedAction.type) {
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
          where: {
            id: actionId,
            release: {
              id: releaseId,
              releasedAt: {
                $null: true,
              },
            },
          },
          populate: { release: { select: ['id', 'name'] } },
        });

        if (!deletedRow) {
          throw new errors.NotFoundError(
            `Action with id ${actionId} not found in release with id ${releaseId} or it is already published`
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
      const releases = await strapi.db.query(RELEASE_MODEL_UID).findMany({
        where: {
          releasedAt: { $null: true },
          actions: where,
        },
      });

      await strapi.db.query(RELEASE_ACTION_MODEL_UID).deleteMany({
        where: { ...where, release: { releasedAt: { $null: true } } },
      });

      for (const release of releases) {
        await getService('release', { strapi }).updateReleaseStatus(release.id);
      }
    },

    // After an entry is updated: its actions in planned releases that no run recorded get its
    // draft's validity, then those releases' status is recalculated
    async revalidateEntryActions(
      contentType: UID.ContentType,
      entry: Modules.Documents.AnyDocument
    ) {
      const entryActionsWhere: EntryActionsWhere = {
        contentType,
        entryDocumentId: entry.documentId,
        locale: entry.locale,
      };
      const plannedActionsWhere = {
        ...entryActionsWhere,
        outcome: null,
        release: { releasedAt: { $null: true } },
      };

      const releases = await strapi.db.query(RELEASE_MODEL_UID).findMany({
        where: { releasedAt: { $null: true }, actions: entryActionsWhere },
      });

      if (releases.length === 0) {
        return;
      }

      const publishActionsWhere = { ...plannedActionsWhere, type: 'publish' };

      if (
        (await strapi.db.query(RELEASE_ACTION_MODEL_UID).count({ where: publishActionsWhere })) > 0
      ) {
        const validity = await getDraftEntryValidity(
          { contentType, documentId: entry.documentId, locale: entry.locale },
          { strapi }
        );

        await strapi.db.query(RELEASE_ACTION_MODEL_UID).updateMany({
          where: publishActionsWhere,
          data: validity,
        });
      }

      await strapi.db.query(RELEASE_ACTION_MODEL_UID).updateMany({
        where: { ...plannedActionsWhere, type: 'unpublish', isEntryValid: false },
        data: UNPUBLISH_VALIDITY,
      });

      for (const release of releases) {
        await getService('release', { strapi }).updateReleaseStatus(release.id);
      }
    },

    async validateActionsByContentTypes(contentTypeUids: UID.ContentType[]) {
      const actions = await strapi.db.query(RELEASE_ACTION_MODEL_UID).findMany({
        where: {
          contentType: {
            $in: contentTypeUids,
          },
          // We only want to validate actions that are going to be published
          type: 'publish',
          outcome: null,
          release: {
            releasedAt: {
              $null: true,
            },
          },
        },
        populate: { release: true },
      });

      const releasesUpdated: Data.ID[] = [];

      await async.map(actions, async (action: ReleaseAction) => {
        const validity = await getDraftEntryValidity(
          {
            contentType: action.contentType,
            documentId: action.entryDocumentId,
            locale: action.locale,
          },
          { strapi }
        );

        await strapi.db.query(RELEASE_ACTION_MODEL_UID).updateMany({
          where: { id: action.id, outcome: null },
          data: validity,
        });

        if (!releasesUpdated.includes(action.release.id)) {
          releasesUpdated.push(action.release.id);
        }

        return { id: action.id, ...validity };
      });

      if (releasesUpdated.length > 0) {
        await async.map(releasesUpdated, async (releaseId: number) => {
          await getService('release', { strapi }).updateReleaseStatus(releaseId);
        });
      }
    },
  };
};

export type ReleaseActionService = ReturnType<typeof createReleaseActionService>;

export default createReleaseActionService;
