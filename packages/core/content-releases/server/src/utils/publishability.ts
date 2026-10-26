import { errors } from '@strapi/utils';

import type { UID, Core, Modules } from '@strapi/types';
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

// Strapi's type-mismatch message ends with the submitted value (`notType` in `@strapi/utils`'s
// yup.ts): cut off, the rest still names the field and the expected type
const SUBMITTED_VALUE_SUFFIX = /, but the final value was: [\s\S]*$/;

// Only the field paths and messages: the details also carry the submitted values
export const getValidationErrors = (error: Error) => {
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

// InnoDB rolls back the whole transaction on a deadlock, savepoints included: nothing done in it
// can be kept or recorded, so the caller's transaction must fail with it
export const isMySqlDeadlock = (error: unknown) =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 'ER_LOCK_DEADLOCK';

// The reason shapes an entry that wasn't released stores
export const toValidationReason = (error: Error) => ({
  validation: { errors: getValidationErrors(error) },
});
export const toErrorReason = (error: unknown) => ({ error: { name: getErrorName(error) } });

// The validity stored for a checked entry. One whose check threw (e.g. its draft can't be read)
// isn't publishable, with only the error's name.
export const toEntryValidity = (check: EntryPublishability | Error): EntryValidity => {
  if (check instanceof Error) {
    return { isEntryValid: false, reason: toErrorReason(check) };
  }

  return check.publishable
    ? { isEntryValid: true, reason: null }
    : { isEntryValid: false, reason: check.reason };
};

// A check's result, or the error that stopped it. In a transaction, each check reads in its own
// savepoint: on Postgres a failed read aborts the transaction, and every other check with it.
const readCheck = async (
  readPublishability: () => Promise<EntryPublishability>,
  { strapi }: { strapi: Core.Strapi }
): Promise<EntryPublishability | Error> => {
  const inTransaction = strapi.db.inTransaction();

  try {
    return await (inTransaction ? strapi.db.savepoint(readPublishability) : readPublishability());
  } catch (error) {
    // In a transaction, a deadlock rolled it all back: no other check, nor what the caller
    // records, can be kept. Outside one, it only undid this read, so it's a failed check.
    if (inTransaction && isMySqlDeadlock(error)) {
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
    // Same strict relations rule as the document service's publish
    const strictRelations = strapi.config.get('api.documents.strictRelations', undefined) === true;

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
      stage: {
        entryStage: entryStage && { id: entryStage.id, name: entryStage.name },
        requiredStage: { id: requiredStage.id, name: requiredStage.name },
      },
    },
    // Same precedence as a publish: review-workflows rejects the stage before validation
    error: new errors.ValidationError(STAGE_ERROR_MESSAGE),
  };
};

// Checks drafts, looking up the populate and the workflow once per content type and reading
// each draft once (an entry in several planned releases has one action in each)
const createDraftPublishabilityCheck = ({ strapi }: { strapi: Core.Strapi }) => {
  const populateBuilderService = strapi.plugin('content-manager').service('populate-builder');
  const lookupsByContentType = new Map<
    UID.ContentType,
    { populate: EntryPopulate; workflow: WorkflowWithRequiredStage }
  >();
  const publishabilityByDraft = new Map<string, Promise<EntryPublishability>>();

  const readDraft = async (draft: DraftRef): Promise<EntryPublishability> => {
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

    return computeEntryPublishability(draft.contentType, entry, lookups.workflow, { strapi });
  };

  return (draft: DraftRef): Promise<EntryPublishability> => {
    const key = getEntryKey(draft.contentType, draft.entryDocumentId, draft.locale);
    let publishability = publishabilityByDraft.get(key);
    if (!publishability) {
      publishability = readDraft(draft);
      publishabilityByDraft.set(key, publishability);
    }

    return publishability;
  };
};

const checkPublishActions = async <TAction extends PublishActionRef, TResult>(
  actions: readonly TAction[],
  toResult: (readPublishability: () => Promise<EntryPublishability>) => Promise<TResult>,
  { strapi }: { strapi: Core.Strapi }
): Promise<Map<TAction['id'], TResult>> => {
  const check = createDraftPublishabilityCheck({ strapi });
  const results = new Map<TAction['id'], TResult>();

  for (const action of actions) {
    if (action.type === 'publish') {
      results.set(action.id, await toResult(() => check(action)));
    }
  }

  return results;
};

/**
 * Publishability of each publish action from its current draft, by action id, or the error that
 * stopped the check (a draft that can't be read): the run decides what that entry means.
 */
export const getPublishabilityForActions = <TAction extends PublishActionRef>(
  actions: readonly TAction[],
  { strapi }: { strapi: Core.Strapi }
) => checkPublishActions(actions, (read) => readCheck(read, { strapi }), { strapi });

/**
 * The validity to store on each publish action, by action id. A draft that can't be read is
 * stored as not publishable and doesn't stop the others.
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
