import { contentTypes, errors } from '@strapi/utils';

import type { UID, Core, Modules, Schema } from '@strapi/types';
import type {
  ReleaseAction,
  ReleaseActionOutcome,
  ReleaseActionReason,
  StageRef,
} from '../../../shared/contracts/release-actions';
import { getEntry } from './entries';
import type { EntryPopulate } from './entries';

export interface EntryValidity {
  isEntryValid: boolean;
  reason: ReleaseActionReason | null;
}

export const UNPUBLISH_VALIDITY: EntryValidity = { isEntryValid: true, reason: null };

type WorkflowWithRequiredStage = { stageRequiredToPublish?: StageRef | null } | null | undefined;

type DraftEntry = Modules.Documents.AnyDocument & { strapi_stage?: StageRef | null };

export type PublishabilityOutcome = Extract<
  ReleaseActionOutcome,
  'skipped_invalid' | 'skipped_not_approved'
>;

export type EntryPublishability =
  | { publishable: true; outcome: null; reason: null; error: null }
  | {
      publishable: false;
      outcome: PublishabilityOutcome;
      reason: ReleaseActionReason;
      /** What publishing the entry would throw; a rejected release reports its message */
      error: Error;
    };

// The draft a publish action points at
export type DraftRef = Pick<ReleaseAction, 'contentType'> & {
  entryDocumentId?: ReleaseAction['entryDocumentId'];
  locale?: ReleaseAction['locale'];
};

type PublishActionRef = DraftRef & Pick<ReleaseAction, 'id' | 'type'>;

// Identifies an entry in one locale (or the only one, for a content type that isn't localized)
export const getEntryKey = (
  contentType: string,
  documentId: string | undefined,
  locale?: string | null
) => JSON.stringify([contentType, documentId, locale ?? null]);

// Thrown by review-workflows when an entry that isn't at the required stage is published
const STAGE_ERROR_MESSAGE = 'Entry is not at the required stage to publish';

// A publish review-workflows refused because the entry isn't at the required stage
export const isStageError = (error: unknown) =>
  error instanceof errors.ValidationError && error.message === STAGE_ERROR_MESSAGE;

const toStageReason = (
  entryStage: StageRef | null,
  requiredStage: StageRef
): NonNullable<ReleaseActionReason['stage']> => ({
  entryStage: entryStage && { id: entryStage.id, name: entryStage.name },
  requiredStage: { id: requiredStage.id, name: requiredStage.name },
});

// Strapi's type-mismatch message ends with the submitted value (`notType` in `@strapi/utils`'s
// yup.ts): cut off, the rest still names the field and the expected type
const SUBMITTED_VALUE_SUFFIX = /, but the final value was: [\s\S]*$/;

// Only the field paths and messages: the details also carry the submitted values
const getValidationErrors = (error: Error) => {
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
      message: typeof message === 'string' ? message.replace(SUBMITTED_VALUE_SUFFIX, '') : '',
    };
  });
};

// Something thrown that isn't an Error, kept as its cause
export const toError = (caught: unknown) =>
  caught instanceof Error ? caught : new Error('Non-Error thrown', { cause: caught });

// Only the error's name: its message can carry row contents
export const getErrorName = (error: unknown) => (error instanceof Error ? error.name : 'Error');

// A database driver's error code (e.g. node-postgres `23505`, mysql2 `ER_DUP_ENTRY`): it names the
// failure without any row contents
const getErrorCode = (error: unknown) =>
  typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code
    : undefined;

// A transient conflict with another transaction: a MySQL deadlock or lock wait timeout, a Postgres
// deadlock or serialization failure. InnoDB rolls back the whole transaction on a deadlock (on a
// lock wait timeout, only with `innodb_rollback_on_timeout`; else just the statement).
const CONFLICT_CODES = new Set(['ER_LOCK_DEADLOCK', 'ER_LOCK_WAIT_TIMEOUT', '40P01', '40001']);

/**
 * Whether an error in a transaction isn't the entry's own failure but the transaction's: a
 * conflict with another transaction, or a savepoint the database couldn't release or roll back to
 * (`SavepointError` from `@strapi/database`, matched by name: the transaction is lost or broken).
 * Nothing done in the transaction can then be recorded as the entry's outcome, so the caller's
 * transaction must fail with it, leaving the release planned for another run.
 */
export const isRunConflict = (error: unknown) =>
  (error instanceof Error && error.name === 'SavepointError') ||
  CONFLICT_CODES.has(getErrorCode(error) ?? '');

// The reason shapes an entry that wasn't released stores
export const toValidationReason = (error: Error) => ({
  validation: { errors: getValidationErrors(error) },
});

// Only the error's name, and its driver code: its message can carry row contents. An application
// error's message is meant for the client (a manual publish sends it as is), so it's kept, without
// the submitted value a type-mismatch message ends with.
export const toErrorReason = (error: unknown): ReleaseActionReason => {
  const code = getErrorCode(error);

  return {
    error: {
      name: getErrorName(error),
      ...(error instanceof errors.ApplicationError && {
        message: error.message.replace(SUBMITTED_VALUE_SUFFIX, ''),
      }),
      ...(code && { code }),
    },
  };
};

// The validity stored for a checked entry. One whose check threw (e.g. its draft can't be read)
// isn't publishable, with only the error's name (and an application error's message).
export const toEntryValidity = (check: EntryPublishability | Error): EntryValidity => {
  if (check instanceof Error) {
    return { isEntryValid: false, reason: toErrorReason(check) };
  }

  return check.publishable
    ? { isEntryValid: true, reason: null }
    : { isEntryValid: false, reason: check.reason };
};

// A check's result, or the error that stopped it. In a transaction, each check reads in its own
// savepoint: without one, on Postgres a failed read would abort the transaction, and every other
// check with it.
const readCheck = async <TResult>(
  read: () => Promise<TResult>,
  { strapi }: { strapi: Core.Strapi }
): Promise<TResult | Error> => {
  const inTransaction = strapi.db.inTransaction();

  try {
    return await (inTransaction ? strapi.db.savepoint(read) : read());
  } catch (error) {
    // In a transaction, the transaction fails with a conflict: no other check, nor what the caller
    // records, can be kept. Outside one, it only undid this read, so it's a failed check.
    if (inTransaction && isRunConflict(error)) {
      throw error;
    }
    return toError(error);
  }
};

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

// Whether an entry can be published now: its draft passes publish validation and, if its
// workflow requires a stage to publish, it is at that stage
const computeEntryPublishability = async (
  contentTypeUid: UID.ContentType,
  entry: DraftEntry | null,
  { workflow, strictRelations }: { workflow: WorkflowWithRequiredStage; strictRelations: boolean },
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

  // Publishing deletes the published version before validating the draft, so the validator
  // leaves that version out of unique checks
  const publishedVersion = await strapi.documents(contentTypeUid).findOne({
    documentId: entry.documentId,
    locale: entry.locale,
    status: 'published',
    fields: ['documentId'],
  });

  let validationError: Error | null = null;
  try {
    // @TODO: When documents service has validateEntityCreation method, use it instead
    await strapi.entityValidator.validateEntityCreation(
      strapi.getModel(contentTypeUid),
      entry,
      { isDraft: false, locale: entry.locale, strictRelations },
      // @ts-expect-error - the validator takes the entry to leave out of unique checks, but its type doesn't declare it for creation
      publishedVersion
    );
  } catch (error) {
    // Anything else isn't the entry's fault: the caller decides what an unchecked entry means
    if (!(error instanceof errors.ValidationError)) {
      throw error;
    }
    validationError = error;
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
          reason: toValidationReason(validationError),
          error: validationError,
        };
  }

  return {
    publishable: false,
    outcome: validationError ? 'skipped_invalid' : 'skipped_not_approved',
    reason: {
      ...(validationError && toValidationReason(validationError)),
      stage: toStageReason(entryStage, requiredStage),
    },
    // Same precedence as a publish: review-workflows rejects the stage before validation
    error: new errors.ValidationError(STAGE_ERROR_MESSAGE),
  };
};

// What the run's earlier actions leave each entry with, by entry key: published (a publish) or not
// (an unpublish)
type ReleasedInRun = ReadonlyMap<string, boolean>;

type RelationTarget = { documentId?: string; locale?: string | null };

interface TargetFilter {
  isTargetPublished: (
    targetUid: UID.ContentType,
    target: RelationTarget
  ) => boolean | Promise<boolean>;
  strapi: Core.Strapi;
}

// The target of a required relation publish can drop: one with draft and publish (any other
// target is always published), on a relation the validation reads
const getDroppableTarget = (
  attribute: Schema.Attribute.AnyAttribute,
  { strapi }: Pick<TargetFilter, 'strapi'>
): UID.ContentType | undefined =>
  attribute.type === 'relation' &&
  attribute.required &&
  'target' in attribute &&
  contentTypes.hasDraftAndPublish(strapi.getModel(attribute.target))
    ? attribute.target
    : undefined;

// The targets of a relation publish connects: a to-one relation without one is empty
const keepPublishedTargets = async (
  targetUid: UID.ContentType,
  value: unknown,
  { isTargetPublished }: TargetFilter
) => {
  if (!Array.isArray(value)) {
    return (await isTargetPublished(targetUid, value as RelationTarget)) ? value : null;
  }

  const kept = [];
  for (const target of value) {
    if (await isTargetPublished(targetUid, target)) {
      kept.push(target);
    }
  }
  return kept;
};

const keepInComponent = (componentUid: UID.Component, value: unknown, filter: TargetFilter) =>
  typeof value === 'object' && value !== null
    ? keepPublishedRequiredTargets(componentUid, value as Record<string, unknown>, filter)
    : value;

// An attribute's value as publish validates it: its droppable targets filtered, its components
// and dynamic zone items walked
const keepInAttribute = async (
  attribute: Schema.Attribute.AnyAttribute,
  value: unknown,
  filter: TargetFilter
): Promise<unknown> => {
  const targetUid = getDroppableTarget(attribute, filter);
  if (targetUid) {
    return keepPublishedTargets(targetUid, value, filter);
  }

  if (attribute.type === 'component') {
    return Array.isArray(value)
      ? Promise.all(
          value.map((component) => keepInComponent(attribute.component, component, filter))
        )
      : keepInComponent(attribute.component, value, filter);
  }

  if (attribute.type === 'dynamiczone' && Array.isArray(value)) {
    return Promise.all(
      value.map((component: { __component?: UID.Component }) =>
        component.__component
          ? keepInComponent(component.__component, component, filter)
          : component
      )
    );
  }

  return value;
};

/**
 * The draft as the document service's publish validates it under `api.documents.strictRelations`:
 * publish connects each relation to its target's published version and drops the targets without
 * one (`allowMissingId` in its data transform), then enforces required relations. Only required
 * relations to draft and publish targets are filtered: the others are never dropped, or never
 * validated. Components and dynamic zones are walked, as publish does.
 */
const keepPublishedRequiredTargets = async (
  modelUid: UID.Schema,
  data: Record<string, unknown>,
  filter: TargetFilter
): Promise<Record<string, unknown>> => {
  const attributes: Record<string, Schema.Attribute.AnyAttribute> =
    filter.strapi.getModel(modelUid)?.attributes ?? {};
  const result = { ...data };

  for (const [name, attribute] of Object.entries(attributes)) {
    const value = data[name];
    if (value !== null && value !== undefined) {
      result[name] = await keepInAttribute(attribute, value, filter);
    }
  }

  return result;
};

// Whether an entry has a published version, read once per entry. A target without a document id
// can't be connected.
const createPublishedVersionLookup = ({ strapi }: { strapi: Core.Strapi }) => {
  const hasPublishedVersionByEntry = new Map<string, Promise<boolean>>();

  return (targetUid: UID.ContentType, { documentId, locale }: RelationTarget) => {
    const key = getEntryKey(targetUid, documentId, locale);
    let hasPublished = hasPublishedVersionByEntry.get(key);
    if (!hasPublished) {
      hasPublished = documentId
        ? strapi
            .documents(targetUid)
            .findOne({
              documentId,
              locale: locale ?? undefined,
              status: 'published',
              fields: ['documentId'],
            })
            .then((published) => published !== null)
        : Promise.resolve(false);
      hasPublishedVersionByEntry.set(key, hasPublished);
    }

    return hasPublished;
  };
};

// Checks drafts, looking up the populate and the workflow once per content type and reading
// each draft once (an entry in several planned releases has one action in each)
const createDraftPublishabilityCheck = ({ strapi }: { strapi: Core.Strapi }) => {
  const populateBuilderService = strapi.plugin('content-manager').service('populate-builder');
  // Same strict relations rule as the document service's publish
  const strictRelations = strapi.config.get('api.documents.strictRelations', undefined) === true;
  const lookupsByContentType = new Map<
    UID.ContentType,
    { populate: EntryPopulate; workflow: WorkflowWithRequiredStage }
  >();
  const publishabilityByDraft = new Map<string, Promise<EntryPublishability>>();
  const hasPublishedVersion = createPublishedVersionLookup({ strapi });

  const readDraft = async (
    draft: DraftRef,
    releasedInRun: ReleasedInRun | undefined
  ): Promise<EntryPublishability> => {
    let lookups = lookupsByContentType.get(draft.contentType);
    if (!lookups) {
      lookups = {
        // @ts-expect-error - populateBuilderService should be a function but is returning service
        populate: await populateBuilderService(draft.contentType).populateDeep(Infinity).build(),
        workflow: await getAssignedWorkflow(draft.contentType, { strapi }),
      };
      lookupsByContentType.set(draft.contentType, lookups);
    }

    const entry = await getEntry(
      {
        contentType: draft.contentType,
        documentId: draft.entryDocumentId,
        locale: draft.locale,
        populate: lookups.populate,
      },
      { strapi }
    );

    // A planned release's validity checks the draft as is: which targets the run releases first
    // is only known in the run
    const checkedEntry =
      entry && strictRelations && releasedInRun
        ? ((await keepPublishedRequiredTargets(draft.contentType, entry, {
            isTargetPublished: (targetUid, target) =>
              releasedInRun.get(getEntryKey(targetUid, target.documentId, target.locale)) ??
              hasPublishedVersion(targetUid, target),
            strapi,
          })) as DraftEntry)
        : entry;

    return computeEntryPublishability(
      draft.contentType,
      checkedEntry,
      { workflow: lookups.workflow, strictRelations },
      { strapi }
    );
  };

  return (draft: DraftRef, releasedInRun?: ReleasedInRun): Promise<EntryPublishability> => {
    const key = getEntryKey(draft.contentType, draft.entryDocumentId, draft.locale);
    let publishability = publishabilityByDraft.get(key);
    if (!publishability) {
      publishability = readDraft(draft, releasedInRun);
      publishabilityByDraft.set(key, publishability);
    }

    return publishability;
  };
};

// With `inRunOrder`, the actions are a run's, in the order it releases them: each check sees what
// the actions before it release
const checkPublishActions = async <TAction extends PublishActionRef, TResult>(
  actions: readonly TAction[],
  toResult: (readPublishability: () => Promise<EntryPublishability>) => Promise<TResult>,
  { strapi, inRunOrder = false }: { strapi: Core.Strapi; inRunOrder?: boolean }
): Promise<Map<TAction['id'], TResult>> => {
  const check = createDraftPublishabilityCheck({ strapi });
  const results = new Map<TAction['id'], TResult>();
  const releasedInRun = new Map<string, boolean>();

  for (const action of actions) {
    if (action.type === 'publish') {
      results.set(
        action.id,
        await toResult(() => check(action, inRunOrder ? releasedInRun : undefined))
      );
    }
    if (inRunOrder) {
      releasedInRun.set(
        getEntryKey(action.contentType, action.entryDocumentId, action.locale),
        action.type === 'publish'
      );
    }
  }

  return results;
};

/**
 * Why review-workflows refused to publish an entry: its stage and the one its workflow requires,
 * read as the check reads them. Null if they can't be read, or no stage is required anymore; in a
 * transaction, a run conflict is rethrown.
 */
export const getStageReason = async (
  draft: DraftRef,
  { strapi }: { strapi: Core.Strapi }
): Promise<ReleaseActionReason | null> => {
  const reason = await readCheck(
    async () => {
      const workflow = await getAssignedWorkflow(draft.contentType, { strapi });
      const requiredStage = workflow?.stageRequiredToPublish ?? null;
      if (!requiredStage) {
        return null;
      }

      const entry: DraftEntry | null = await getEntry(
        {
          contentType: draft.contentType,
          documentId: draft.entryDocumentId,
          locale: draft.locale,
          populate: ['strapi_stage'],
        },
        { strapi }
      );

      return { stage: toStageReason(entry?.strapi_stage ?? null, requiredStage) };
    },
    { strapi }
  );

  return reason instanceof Error ? null : reason;
};

/**
 * Publishability of each of a run's publish actions from its current draft, by action id, or the
 * error that stopped the check (a draft that can't be read): the run decides what that entry
 * means. The actions come in run order: under `api.documents.strictRelations`, a required
 * relation's target counts as published if it has a published version or an earlier action of the
 * run publishes it (and not if an earlier action unpublishes it).
 */
export const getPublishabilityForActions = <TAction extends PublishActionRef>(
  actions: readonly TAction[],
  { strapi }: { strapi: Core.Strapi }
) =>
  checkPublishActions(actions, (read) => readCheck(read, { strapi }), {
    strapi,
    inRunOrder: true,
  });

/**
 * The validity to store on each publish action, by action id. A draft that can't be read is
 * stored as not publishable and doesn't stop the others, except in a transaction a run conflict
 * (see `isRunConflict`), which is rethrown.
 */
export const getValidityForActions = <TAction extends PublishActionRef>(
  actions: readonly TAction[],
  { strapi }: { strapi: Core.Strapi }
) =>
  checkPublishActions(
    actions,
    async (readPublishability) => toEntryValidity(await readCheck(readPublishability, { strapi })),
    { strapi }
  );

// What an action stores when it's added or changes type
export const getActionValidity = async (
  action: DraftRef & Pick<ReleaseAction, 'type'>,
  { strapi }: { strapi: Core.Strapi }
): Promise<EntryValidity> =>
  action.type === 'publish'
    ? toEntryValidity(
        await readCheck(() => createDraftPublishabilityCheck({ strapi })(action), { strapi })
      )
    : UNPUBLISH_VALIDITY;
