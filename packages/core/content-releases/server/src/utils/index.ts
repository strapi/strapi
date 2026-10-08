import { contentTypes as contentTypesUtils, errors } from '@strapi/utils';

import type { UID, Data, Core, Modules } from '@strapi/types';
import type { ReleaseAction } from '../../../shared/contracts/release-actions';
import type { ReleaseCondition } from '../constants';

import type { SettingsService } from '../services/settings';
import type { ReleaseService } from '../services/release';
import type { ReleaseActionService } from '../services/release-action';

type Services = {
  release: ReleaseService;
  'release-validation': any;
  scheduling: any;
  'release-action': ReleaseActionService;
  'event-manager': any;
  settings: SettingsService;
};

interface Action {
  contentType: UID.ContentType;
  documentId?: Data.DocumentID;
  locale?: string;
}

export const getService = <TName extends keyof Services>(
  name: TName,
  { strapi }: { strapi: Core.Strapi }
): Services[TName] => {
  return strapi.plugin('content-releases').service(name);
};

export const getDraftEntryValidStatus = async (
  { contentType, documentId, locale }: Action,
  { strapi }: { strapi: Core.Strapi }
) => {
  const populateBuilderService = strapi.plugin('content-manager').service('populate-builder');
  // @ts-expect-error - populateBuilderService should be a function but is returning service
  const populate = await populateBuilderService(contentType).populateDeep(Infinity).build();

  const entry = await getEntry({ contentType, documentId, locale, populate }, { strapi });

  return isEntryValid(contentType, entry, { strapi });
};

type StageRef = { id: Data.ID; name: string };

type WorkflowWithRequiredStage = { stageRequiredToPublish?: StageRef | null } | null | undefined;

// A draft read through the document service, with its review stage when it has one
type DraftEntry = Modules.Documents.AnyDocument & { strapi_stage?: StageRef | null };

export type PublishabilityOutcome = 'skipped_invalid' | 'skipped_not_approved';

export interface PublishabilityReason {
  validation?: { errors: { path: string[]; message: string }[] };
  stage?: { entryStage: StageRef | null; requiredStage: StageRef };
}

export type EntryPublishability =
  | { publishable: true; outcome: null; reason: null; error: null }
  | {
      publishable: false;
      outcome: PublishabilityOutcome;
      reason: PublishabilityReason;
      /** What publishing the entry would throw: its message is the one a rejected release reports */
      error: Error;
    };

// Thrown by review-workflows when an entry that isn't at the required stage is published
const STAGE_ERROR_MESSAGE = 'Entry is not at the required stage to publish';

const getAssignedWorkflow = async (
  contentTypeUid: UID.ContentType,
  { strapi }: { strapi: Core.Strapi }
): Promise<WorkflowWithRequiredStage> => {
  // Workflows service may not be available depending on the license
  const workflowsService = strapi.plugin('review-workflows')?.service('workflows');

  return workflowsService?.getAssignedWorkflow(contentTypeUid, {
    populate: 'stageRequiredToPublish',
  });
};

// Only the field paths and messages: the details also carry the submitted values
const getValidationErrors = (error: Error) => {
  // `instanceof` on a generic class types `details` as `any`: read it as `unknown` and check its shape
  const details: unknown = error instanceof errors.ValidationError ? error.details : null;
  const detailErrors: unknown[] =
    typeof details === 'object' &&
    details !== null &&
    'errors' in details &&
    Array.isArray(details.errors)
      ? details.errors
      : [];

  return detailErrors.map((detail) => {
    const isObject = typeof detail === 'object' && detail !== null;
    const path = isObject && 'path' in detail ? detail.path : undefined;
    const message = isObject && 'message' in detail ? detail.message : undefined;

    return {
      path: Array.isArray(path) ? path.map(String) : [],
      message: typeof message === 'string' ? message : '',
    };
  });
};

const computeEntryPublishability = async (
  contentTypeUid: UID.ContentType,
  entry: DraftEntry | null,
  workflow: WorkflowWithRequiredStage,
  { strapi }: { strapi: Core.Strapi }
): Promise<EntryPublishability> => {
  if (!entry) {
    return {
      publishable: false,
      outcome: 'skipped_invalid',
      reason: { validation: { errors: [] } },
      error: new errors.ValidationError('Entry not found'),
    };
  }

  // Publishing deletes the document's published version before it validates the draft, so
  // a unique value the draft shares with that version is no clash: the validator leaves it out
  const publishedVersion: { id: number } | null = await strapi.db.query(contentTypeUid).findOne({
    where: {
      documentId: entry.documentId,
      publishedAt: { $notNull: true },
      ...(entry.locale ? { locale: entry.locale } : {}),
    },
    select: ['id'],
  });

  let validationError: Error | null = null;
  try {
    // Mirror the document-service publish path: when `api.documents.strictRelations`
    // is on, required media/relations are enforced on non-draft writes. Reading the
    // flag here keeps the release "valid" badge consistent with what publish will
    // actually accept (otherwise the UI can mark an entry valid that publish rejects).
    const rawStrictRelations: unknown = strapi.config.get(
      'api.documents.strictRelations',
      undefined
    );
    const strictRelations = rawStrictRelations === true;

    // @TODO: When documents service has validateEntityCreation method, use it instead
    await strapi.entityValidator.validateEntityCreation(
      strapi.getModel(contentTypeUid),
      entry,
      { isDraft: false, locale: entry.locale, strictRelations },
      // @ts-expect-error - the validator takes the entry to leave out of unique checks, but its type doesn't declare it for creation
      publishedVersion
    );
  } catch (error) {
    // Anything can be thrown: it's turned into an Error once, here
    validationError =
      error instanceof Error ? error : new errors.ValidationError('Entry is not valid');
  }

  // Checked even when validation failed, so the reason can carry both
  const requiredStage = workflow?.stageRequiredToPublish ?? null;
  const entryStage = entry.strapi_stage ?? null;
  const isAtRequiredStage = requiredStage === null || entryStage?.id === requiredStage.id;

  if (isAtRequiredStage) {
    return validationError === null
      ? { publishable: true, outcome: null, reason: null, error: null }
      : {
          publishable: false,
          outcome: 'skipped_invalid',
          reason: { validation: { errors: getValidationErrors(validationError) } },
          error: validationError,
        };
  }

  return {
    publishable: false,
    // Failing both checks counts as invalid
    outcome: validationError ? 'skipped_invalid' : 'skipped_not_approved',
    reason: {
      ...(validationError && { validation: { errors: getValidationErrors(validationError) } }),
      stage: {
        entryStage: entryStage && { id: entryStage.id, name: entryStage.name },
        requiredStage: { id: requiredStage.id, name: requiredStage.name },
      },
    },
    // Same precedence as a publish: review-workflows rejects the stage before the entry is validated
    error: new errors.ValidationError(STAGE_ERROR_MESSAGE),
  };
};

/**
 * Whether a publish action's entry can be published right now: its draft passes publish
 * validation and, when its content type's workflow requires a stage to publish, it is at that
 * stage. Without review workflows (e.g. on a license without them) only validation applies.
 */
export const getEntryPublishability = async (
  contentTypeUid: UID.ContentType,
  entry: DraftEntry | null,
  { strapi }: { strapi: Core.Strapi }
) => {
  const workflow = await getAssignedWorkflow(contentTypeUid, { strapi });

  return computeEntryPublishability(contentTypeUid, entry, workflow, { strapi });
};

export const isEntryValid = async (
  contentTypeUid: UID.ContentType,
  entry: DraftEntry | null,
  { strapi }: { strapi: Core.Strapi }
) => {
  try {
    const { publishable } = await getEntryPublishability(contentTypeUid, entry, { strapi });

    return publishable;
  } catch {
    return false;
  }
};

type PublishActionRef = Pick<ReleaseAction, 'id' | 'contentType' | 'entryDocumentId' | 'locale'>;

/**
 * Publishability of each publish action, read from its current draft, in the order given.
 * The deep populate and the workflow are looked up once per content type.
 *
 * Generic over the action type so callers get back their own actions, not a narrower shape.
 */
export const getPublishabilityForActions = async <TAction extends PublishActionRef>(
  actions: readonly TAction[],
  { strapi }: { strapi: Core.Strapi }
): Promise<{ action: TAction; publishability: EntryPublishability }[]> => {
  const populateBuilderService = strapi.plugin('content-manager').service('populate-builder');
  const lookupsByContentType = new Map<
    UID.ContentType,
    { populate: unknown; workflow: WorkflowWithRequiredStage }
  >();
  const results: { action: TAction; publishability: EntryPublishability }[] = [];

  for (const action of actions) {
    let lookups = lookupsByContentType.get(action.contentType);
    if (!lookups) {
      lookups = {
        // @ts-expect-error - populateBuilderService should be a function but is returning service
        populate: await populateBuilderService(action.contentType).populateDeep(Infinity).build(),
        workflow: await getAssignedWorkflow(action.contentType, { strapi }),
      };
      lookupsByContentType.set(action.contentType, lookups);
    }

    const entry = await getEntry(
      {
        contentType: action.contentType,
        documentId: action.entryDocumentId,
        locale: action.locale,
        populate: lookups.populate,
      },
      { strapi }
    );

    results.push({
      action,
      publishability: await computeEntryPublishability(
        action.contentType,
        entry,
        lookups.workflow,
        { strapi }
      ),
    });
  }

  return results;
};

/**
 * Whether publishing the release now would release nothing, given how many of its entries
 * aren't publishable. Unpublish entries are always publishable.
 * - `all_or_nothing` (also a missing condition, on releases from before it existed): any entry
 *   that isn't publishable holds back every other one.
 * - `allow_partial`: entries that aren't publishable are left out, so only a release where no
 *   entry is publishable releases nothing.
 *
 * The one rule behind the `blocked` status and the check that rejects or fails a run, so a
 * release reads blocked exactly when a run of it would release nothing.
 */
export const isReleaseBlocked = (
  releaseCondition: ReleaseCondition | null | undefined,
  { total, notPublishable }: { total: number; notPublishable: number }
) =>
  releaseCondition === 'allow_partial' ? total > 0 && notPublishable === total : notPublishable > 0;

export const getEntry = async (
  {
    contentType,
    documentId,
    locale,
    populate,
    status = 'draft',
  }: Action & { status?: 'draft' | 'published'; populate: any },
  { strapi }: { strapi: Core.Strapi }
) => {
  if (documentId) {
    // Try to get an existing draft or published document
    const entry = await strapi
      .documents(contentType)
      .findOne({ documentId, locale, populate, status });

    // The document isn't published yet, but the action is to publish it, fetch the draft
    if (status === 'published' && !entry) {
      return strapi
        .documents(contentType)
        .findOne({ documentId, locale, populate, status: 'draft' });
    }

    return entry;
  }

  return strapi.documents(contentType).findFirst({ locale, populate, status });
};

export const getEntryStatus = async (contentType: UID.ContentType, entry: Data.ContentType) => {
  if (entry.publishedAt) {
    return 'published';
  }

  const publishedEntry = await strapi.documents(contentType).findOne({
    documentId: entry.documentId,
    locale: entry.locale,
    status: 'published',
    fields: ['updatedAt'],
  });

  if (!publishedEntry) {
    return 'draft';
  }

  const entryUpdatedAt = new Date(entry.updatedAt).getTime();
  const publishedEntryUpdatedAt = new Date(publishedEntry.updatedAt).getTime();

  if (entryUpdatedAt > publishedEntryUpdatedAt) {
    return 'modified';
  }

  return 'published';
};

/**
 * Recursively collects content type UIDs that a model (content type or component) has relations to.
 * Go through component and dynamic zone attributes to find nested relations.
 */
const collectRelationTargets = (
  modelUid: string,
  strapi: Core.Strapi,
  visited = new Set<string>()
): Set<string> => {
  const targets = new Set<string>();
  if (visited.has(modelUid)) {
    return targets;
  }
  visited.add(modelUid);

  const model = strapi.getModel(modelUid as UID.Schema);
  if (!model?.attributes) {
    return targets;
  }

  for (const attribute of Object.values(model.attributes) as Array<{
    type?: string;
    target?: string;
    component?: string;
    components?: string[];
  }>) {
    if (attribute?.type === 'relation' && attribute.target) {
      targets.add(attribute.target);
    }
    if (attribute?.type === 'component' && attribute.component) {
      for (const t of collectRelationTargets(attribute.component, strapi, visited)) {
        targets.add(t);
      }
    }
    if (attribute?.type === 'dynamiczone' && attribute.components) {
      for (const compUid of attribute.components) {
        for (const t of collectRelationTargets(compUid, strapi, visited)) {
          targets.add(t);
        }
      }
    }
  }
  return targets;
};

/**
 * Returns content type UIDs sorted by relation dependency order for publishing.
 * When content type A has a relation to content type B (both with draft & publish),
 * B will appear before A in the result. This ensures that when publishing a release,
 * related entities are published first, so that relation IDs can be correctly
 * resolved (published target must exist when publishing source).
 *
 * Relations in components (nested or not) and dynamic zones are also considered.
 *
 * @param contentTypeUids - Content type UIDs that will be published in the release, repeats allowed
 * @param strapi - Strapi instance
 * @returns Content type UIDs in publish order (dependencies first)
 */
export const getPublishOrderForContentTypes = (
  contentTypeUids: UID.ContentType[],
  { strapi }: { strapi: Core.Strapi }
): UID.ContentType[] => {
  const uidSet = new Set(contentTypeUids);

  // Build dependency graph: source depends on target (source must be published after target)
  const dependencies = new Map<UID.ContentType, Set<UID.ContentType>>();

  for (const uid of uidSet) {
    const model = strapi.getModel(uid);
    if (model && contentTypesUtils.hasDraftAndPublish(model)) {
      const relationTargets = collectRelationTargets(uid, strapi);

      for (const targetUid of relationTargets) {
        const targetContentTypeUid = targetUid as UID.ContentType;
        const isTargetInRelease =
          uidSet.has(targetContentTypeUid) && targetContentTypeUid in strapi.contentTypes;
        const targetModel = strapi.getModel(targetContentTypeUid);
        const targetHasDraftAndPublish =
          targetModel && contentTypesUtils.hasDraftAndPublish(targetModel);

        if (isTargetInRelease && targetHasDraftAndPublish) {
          let dependencySet = dependencies.get(uid);
          if (!dependencySet) {
            dependencySet = new Set();
            dependencies.set(uid, dependencySet);
          }
          dependencySet.add(targetContentTypeUid);
        }
      }
    }
  }

  // Topological sort: dependencies first
  const sorted: UID.ContentType[] = [];
  const visited = new Set<UID.ContentType>();
  const visiting = new Set<UID.ContentType>();

  const visit = (uid: UID.ContentType) => {
    if (visited.has(uid)) return;
    if (visiting.has(uid)) return; // No cycle in valid schemas

    visiting.add(uid);
    for (const dep of dependencies.get(uid) ?? []) {
      visit(dep);
    }
    visiting.delete(uid);
    visited.add(uid);
    sorted.push(uid);
  };

  for (const uid of uidSet) {
    visit(uid);
  }

  return sorted;
};
