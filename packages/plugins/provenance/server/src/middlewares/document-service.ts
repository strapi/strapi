import { contentTypes, errors } from '@strapi/utils';

import type { Core, Modules } from '@strapi/types';

import {
  claimForField,
  resolveBaseDeclaration,
  resolveFieldDeclaration,
} from '../domain/declaration';
import { isEmptyValue, isStructured, isTrackedContentType, type Schema } from '../domain/fields';
import {
  canEnterStage,
  isApproval,
  parseStageId,
  stageAfterWrite,
  type WorkflowRules,
} from '../domain/workflow';
import { STAGE_ATTRIBUTE } from '../services/review-workflows';

import type { ProvenanceService, Status, Target } from '../services/provenance';
import type { RequestService } from '../services/request';
import type { ReviewWorkflowsService } from '../services/review-workflows';
import type { SettingsService } from '../services/settings';
import type { ValuesService } from '../services/values';

type Dependencies = {
  provenance: ProvenanceService;
  request: RequestService;
  settings: SettingsService;
  reviewWorkflows: ReviewWorkflowsService;
  values: ValuesService;
};

type Middleware = Modules.Documents.Middleware.Middleware;

const APPROVAL_REFUSED =
  'Only a person can move an entry to the approval stage. AI agents and integrations can send content to review but cannot approve it';

// Passed on as `documentId $in`: databases limit the number of bound values
const MAX_FILTERED_DOCUMENTS = 10_000;
type Entry = Record<string, any>;

const localesOf = (entries: Entry[] | undefined) => {
  return [...new Set((entries ?? []).map((entry) => (entry.locale as string | undefined) ?? null))];
};

/**
 * Records field provenance around Document Service writes, and applies the review rules
 * that depend on it (publish guard, review workflow stages).
 *
 * The content write and its provenance share one transaction: a failure to record
 * provenance, or a rule that refuses the write, rolls the write back. Sharing the
 * transaction also saves the BEGIN/COMMIT pairs of nested writes.
 */
export const createDocumentServiceMiddleware = ({
  strapi,
  getDependencies,
}: {
  strapi: Core.Strapi;
  // Resolved on each call: plugin services do not exist yet when the middleware is registered
  getDependencies: () => Dependencies;
}): Middleware => {
  return async (ctx, next) => {
    const { uid, contentType, action } = ctx;

    if (!isTrackedContentType(uid)) {
      return next();
    }

    const { provenance, request, settings, reviewWorkflows, values } = getDependencies();
    const hasDraftAndPublish = contentTypes.hasDraftAndPublish(contentType);
    const writeStatus: Status = hasDraftAndPublish ? 'draft' : 'published';
    const params = ctx.params as Entry;
    const { attributes } = contentType as unknown as Schema;
    const tracked = values.getTracked(uid);

    const readTracked = async (target: Target, fields = tracked) => {
      return (await values.read(target, { fields })) ?? {};
    };

    /**
     * Refuses to publish entries with unreviewed AI fields, when the setting asks for it.
     */
    const assertReviewedBeforePublish = async (
      documentId: string,
      locales: Array<string | null>
    ) => {
      if (!hasDraftAndPublish || !(await settings.requiresReview())) {
        return;
      }

      for (const locale of locales) {
        const target: Target = { uid, documentId, locale, status: 'draft' };
        // Most entries have no AI field: then nothing needs reading
        const aiFields = await provenance.findAiFields(target);

        if (aiFields.length === 0) {
          continue;
        }

        const unreviewed = await provenance.findUnreviewedAi(
          target,
          await readTracked(target, aiFields)
        );

        if (unreviewed.length > 0) {
          // The Content Manager shows `{ [field]: messages[] }` details under each input
          throw new errors.ValidationError(
            `AI content must be reviewed before publishing. Fields without a human review: ${unreviewed.join(', ')}`,
            Object.fromEntries(
              unreviewed.map((field) => [
                field,
                ['This AI content needs a human review before publishing'],
              ])
            )
          );
        }
      }
    };

    /**
     * The review workflow stage of an entry version. Read rather than parsed from the
     * request: the Document Service accepts many relation syntaxes for it.
     */
    const readStage = async (target: Target) => {
      const entry = (await strapi.documents(uid).findOne({
        documentId: target.documentId,
        locale: target.locale ?? undefined,
        status: target.status,
        fields: ['documentId'],
        populate: { [STAGE_ATTRIBUTE]: { fields: ['id'] } },
      } as any)) as Entry | null;

      return parseStageId(entry?.[STAGE_ATTRIBUTE]);
    };

    switch (action) {
      case 'create':
      case 'update': {
        const data: Entry = params.data ?? {};
        const fields = tracked.filter((field) => field in data);
        const withStages = reviewWorkflows.hasStages(contentType as any);
        // Review Workflows give a created entry its first stage
        const touchesStage = withStages && (STAGE_ATTRIBUTE in data || action === 'create');
        const publishes = hasDraftAndPublish && params.status === 'published';

        if (fields.length === 0 && !touchesStage && !publishes) {
          // Still waits for a review or a publish of this document in progress, for
          // instance the update the Content Manager runs before publishing
          if (action === 'update' && params.documentId && strapi.db.dialect.client !== 'sqlite') {
            return strapi.db.transaction(async () => {
              await provenance.lockDocument(uid, params.documentId);

              return next();
            });
          }

          return next();
        }

        return strapi.db.transaction(async () => {
          // Concurrent requests on this document wait here: what is read below stays current
          if (action === 'update' && params.documentId) {
            await provenance.lockDocument(uid, params.documentId);
          }

          const snapshot = await request.getSnapshot();
          const base = resolveBaseDeclaration(snapshot);

          let rules: WorkflowRules | null = null;

          if (withStages) {
            const workflowId = await reviewWorkflows.getWorkflowId(uid);
            rules = workflowId !== null ? await settings.getRules(workflowId) : null;
          }

          const previous: Target = {
            uid,
            documentId: params.documentId,
            locale: params.locale ?? null,
            status: writeStatus,
          };
          // An AI create goes to AI review: set it in the create itself rather than with a
          // second update, which would run every hook, event and history version again
          if (
            action === 'create' &&
            rules?.aiReviewStageId != null &&
            data[STAGE_ATTRIBUTE] == null &&
            fields.some(
              (field) =>
                !isEmptyValue(data[field]) &&
                resolveFieldDeclaration(base, claimForField(snapshot, field)).origin === 'ai'
            )
          ) {
            data[STAGE_ATTRIBUTE] = { id: rules.aiReviewStageId };
          }

          let before: Entry | null = null;
          let stageBefore: number | null = null;

          if (action === 'update' && fields.length > 0) {
            before = await values.read(previous, {
              fields,
              extra: rules !== null ? { populate: { [STAGE_ATTRIBUTE]: { fields: ['id'] } } } : {},
            });
            stageBefore = parseStageId(before?.[STAGE_ATTRIBUTE]);
          } else if (action === 'update' && rules !== null && touchesStage) {
            stageBefore = await readStage(previous);
          }

          // An update can create a locale. Its non-localized fields hold the values of the
          // other locales: they start from those values and their provenance.
          let inherited: { locale: string; fields: string[] } | null = null;

          if (action === 'update' && fields.length > 0 && before === null) {
            // Core copies them even when the payload does not send them
            inherited = await provenance.findInheritedFields(previous, tracked);

            if (inherited !== null) {
              before = await values.read(
                { ...previous, locale: inherited.locale },
                { fields: inherited.fields }
              );
            }
          }

          const output = await next();
          const result = output as Entry | null;

          if (!result) {
            return output;
          }

          const target: Target = {
            uid,
            documentId: result.documentId as string,
            locale: (result.locale as string | undefined) ?? null,
            status: writeStatus,
          };

          // A new document gets its lock row now, while nothing else can contend for it
          if (action === 'create') {
            await provenance.lockDocument(uid, target.documentId);
          }

          let stageAfter = stageBefore;

          if (rules !== null && touchesStage) {
            stageAfter = await readStage(target);
          }

          const enteredStageId =
            stageAfter !== null && stageAfter !== stageBefore ? stageAfter : null;

          // Throwing rolls the whole write back
          if (
            rules !== null &&
            enteredStageId !== null &&
            !canEnterStage(rules, enteredStageId, base)
          ) {
            throw new errors.ForbiddenError(APPROVAL_REFUSED);
          }

          let changed: Awaited<ReturnType<ProvenanceService['recordWrite']>> = [];

          if (fields.length > 0) {
            // The caller may have narrowed or populated the result differently: components
            // are always read again, in the shape their hashes are computed from
            const recorded =
              inherited !== null ? [...new Set([...fields, ...inherited.fields])] : fields;
            const after = recorded.every(
              (field) => field in result && !isStructured(attributes[field])
            )
              ? result
              : await readTracked(target, recorded);

            if (inherited !== null) {
              await provenance.copyRows({
                from: { ...target, locale: inherited.locale },
                to: target,
                fields: inherited.fields,
              });
            }

            changed = await provenance.recordWrite({
              target,
              fields: recorded,
              // Fields of a new locale that are not inherited start empty
              before: inherited !== null ? (before ?? {}) : before,
              after,
              snapshot,
              // A created document has a fresh documentId, so no provenance to look up
              isNewDocument: action === 'create',
            });

            if (action === 'update') {
              await provenance.syncAcrossLocales(
                target,
                changed.map(({ field }) => field)
              );
            }
          }

          if (rules !== null) {
            if (
              enteredStageId !== null &&
              isApproval(rules, enteredStageId, base) &&
              snapshot?.userId !== undefined
            ) {
              // A human approving takes editorial responsibility for every current value
              await provenance.markReviewed({
                target,
                fields: tracked,
                current: await readTracked(target),
                userId: snapshot.userId,
              });
            } else {
              // An AI change goes to AI review even when the write chose another stage
              const nextStageId = stageAfterWrite({
                rules,
                currentStageId: stageAfter,
                changed: changed.map(({ declaration }) => declaration),
              });

              if (nextStageId !== null) {
                await strapi.documents(uid).update({
                  documentId: target.documentId,
                  locale: target.locale ?? undefined,
                  data: { [STAGE_ATTRIBUTE]: { id: nextStageId } },
                } as any);
              }
            }
          }

          // `status: 'published'` publishes inside the repository, without a `publish` action
          if (publishes) {
            await assertReviewedBeforePublish(target.documentId, [target.locale]);
            await provenance.copyStatus({
              uid,
              documentId: target.documentId,
              locales: [target.locale],
              from: 'draft',
              to: 'published',
            });
          }

          return output;
        });
      }

      case 'clone': {
        return strapi.db.transaction(async () => {
          // Like a create: an AI clone starts in AI review, set in the clone itself
          if (reviewWorkflows.hasStages(contentType as any)) {
            const workflowId = await reviewWorkflows.getWorkflowId(uid);
            const rules = workflowId !== null ? await settings.getRules(workflowId) : null;
            const cloneData: Entry | undefined = params.data;

            if (
              rules?.aiReviewStageId != null &&
              cloneData &&
              cloneData[STAGE_ATTRIBUTE] == null &&
              resolveBaseDeclaration(await request.getSnapshot()).origin === 'ai'
            ) {
              cloneData[STAGE_ATTRIBUTE] = { id: rules.aiReviewStageId };
            }
          }

          const output = await next();
          const result = output as { documentId?: string; entries?: Entry[] } | null;

          if (!result?.documentId || !params.documentId) {
            return output;
          }

          const snapshot = await request.getSnapshot();
          const base = resolveBaseDeclaration(snapshot);
          const data: Entry = params.data ?? {};
          const fields = tracked.filter((field) => field in data);
          const declarations = [base];

          // The clone keeps the provenance of the values it copies, and records the ones the
          // request overrides like an update
          for (const locale of localesOf(result.entries)) {
            const source: Target = {
              uid,
              documentId: params.documentId,
              locale,
              status: writeStatus,
            };
            const target: Target = { ...source, documentId: result.documentId };

            await provenance.copyRows({ from: source, to: target });

            if (fields.length > 0) {
              const changed = await provenance.recordWrite({
                target,
                fields,
                before: await readTracked(source, fields),
                after: await readTracked(target, fields),
                snapshot,
              });

              declarations.push(...changed.map(({ declaration }) => declaration));
            }
          }

          // A clone is a write: the same stage rules apply as on create
          const firstLocale = localesOf(result.entries)[0] ?? null;

          if (reviewWorkflows.hasStages(contentType as any)) {
            const workflowId = await reviewWorkflows.getWorkflowId(uid);
            const rules = workflowId !== null ? await settings.getRules(workflowId) : null;

            if (rules !== null) {
              const target: Target = {
                uid,
                documentId: result.documentId,
                locale: firstLocale,
                status: writeStatus,
              };
              const stageId = await readStage(target);

              if (stageId !== null && !canEnterStage(rules, stageId, base)) {
                throw new errors.ForbiddenError(APPROVAL_REFUSED);
              }

              const nextStageId = stageAfterWrite({
                rules,
                currentStageId: stageId,
                // Cloning copies AI content as such: an AI clone goes to AI review
                changed: base.origin === 'ai' ? declarations : declarations.slice(1),
              });

              if (nextStageId !== null) {
                await strapi.documents(uid).update({
                  documentId: target.documentId,
                  locale: target.locale ?? undefined,
                  data: { [STAGE_ATTRIBUTE]: { id: nextStageId } },
                } as any);
              }
            }
          }

          return output;
        });
      }

      case 'publish':
      case 'discardDraft':
      case 'unpublish':
      case 'delete': {
        return strapi.db.transaction(async () => {
          if (params.documentId) {
            await provenance.lockDocument(uid, params.documentId);
          }

          // Checked before publishing: Content Releases run publishes in a transaction that
          // commits even when one of them throws. Several locales are checked after instead.
          let checkedLocale: string | null | undefined;

          if (
            action === 'publish' &&
            hasDraftAndPublish &&
            params.documentId &&
            !Array.isArray(params.locale) &&
            params.locale !== '*' &&
            (await settings.requiresReview())
          ) {
            // Only the locale it resolves to
            const draft = await values.read(
              {
                uid,
                documentId: params.documentId,
                locale: params.locale ?? null,
                status: 'draft',
              },
              { fields: [], extra: { fields: ['locale'] } }
            );

            if (draft) {
              checkedLocale = (draft.locale as string | undefined) ?? null;
              await assertReviewedBeforePublish(params.documentId, [checkedLocale]);
            }
          }

          const output = await next();
          const result = output as { documentId?: string; entries?: Entry[] } | null;
          const locales = localesOf(result?.entries);

          if (!result?.documentId || locales.length === 0) {
            return output;
          }

          const { documentId } = result;

          if (action === 'publish') {
            await assertReviewedBeforePublish(
              documentId,
              locales.filter((locale) => locale !== checkedLocale)
            );
            await provenance.copyStatus({
              uid,
              documentId,
              locales,
              from: 'draft',
              to: 'published',
            });
          } else if (action === 'discardDraft') {
            await provenance.copyStatus({
              uid,
              documentId,
              locales,
              from: 'published',
              to: 'draft',
            });
          } else if (action === 'unpublish') {
            await provenance.deleteFor({ uid, documentId, locales, statuses: ['published'] });
          } else {
            await provenance.deleteFor({ uid, documentId, locales });
          }

          return output;
        });
      }

      case 'findMany':
      case 'count': {
        if (!request.isAiReviewListing(uid) || !settings.isGovernanceEnabled()) {
          return next();
        }

        // Computed once per request: the list runs `findMany` then `count`
        const cacheKey = `${uid}|${params.locale}|${params.status}`;
        const cache = request.getListingCache();
        // The promise is cached: the Content Manager runs `findMany` and `count` concurrently
        let pendingIds = cache.get(cacheKey);

        if (pendingIds === undefined) {
          pendingIds = provenance.findDocumentsToReview({
            uid,
            status: hasDraftAndPublish && params.status !== 'published' ? 'draft' : 'published',
            // Content types without i18n store rows without a locale, whatever the request says
            locale: (contentType as { pluginOptions?: { i18n?: { localized?: boolean } } })
              .pluginOptions?.i18n?.localized
              ? params.locale
              : undefined,
            limit: MAX_FILTERED_DOCUMENTS,
          });
          cache.set(cacheKey, pendingIds);
        }

        const documentIds = await pendingIds;

        if (documentIds === null) {
          throw new errors.ValidationError(
            `More than ${MAX_FILTERED_DOCUMENTS} entries of this content type have AI content to review: this filter cannot list them`
          );
        }

        ctx.params = {
          ...params,
          filters: { $and: [params.filters ?? {}, { documentId: { $in: documentIds } }] },
        } as typeof ctx.params;

        return next();
      }

      default:
        return next();
    }
  };
};
