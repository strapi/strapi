import { contentTypes, emitAudit, errors } from '@strapi/utils';

import type { Core } from '@strapi/types';

import { AUDIT_EVENTS } from '../audit-logs';
import { hashValue } from '../domain/hash';
import { getService } from '../utils';

import type { AgentPrincipal, ClientClaim } from '../domain/types';
import type { FieldView, Target } from './provenance';

type Entry = Record<string, unknown>;

type DocumentRef = { uid: string; documentId: string; locale?: string | null };

export type FieldReviewState = FieldView & { hash: string };

/**
 * What a reviewer saw no longer is what would be written. An approval queue should answer 409.
 */
export class StaleApprovalError extends errors.ApplicationError<
  'StaleApprovalError',
  string,
  { fields: string[] }
> {
  constructor(fields: string[]) {
    super('The content changed since it was shown to the reviewer', { fields });
    this.name = 'StaleApprovalError';
  }
}

/**
 * What an approval queue needs from provenance. Optional for the queue:
 * `strapi.plugin('provenance')?.service('approvals')`.
 */
export const createApprovalsService = ({ strapi }: { strapi: Core.Strapi }) => {
  const readDraft = async ({ uid, documentId, locale }: DocumentRef) => {
    const contentType = strapi.contentTypes[uid as keyof typeof strapi.contentTypes];
    const status = contentTypes.hasDraftAndPublish(contentType) ? 'draft' : 'published';
    const entry = await getService(strapi, 'values').read(
      { uid, documentId, locale: locale ?? null, status },
      { extra: { fields: 'locale' in contentType.attributes ? ['locale'] : [] } }
    );

    if (!entry) {
      return null;
    }

    const target: Target = {
      uid,
      documentId,
      locale: (entry.locale as string | undefined) ?? null,
      status,
    };

    return { target, entry: entry as Entry };
  };

  const review = async (
    target: Target,
    fields: string[],
    current: Entry,
    decidedBy: string | number
  ) => {
    const provenance = getService(strapi, 'provenance');

    await provenance.markReviewed({ target, fields, current, userId: decidedBy });
    await provenance.syncAcrossLocales(target, fields);
  };

  return {
    /**
     * The fields of a draft for an approval card: source, agent and review of each, the hash
     * to send back on approval, and the AI fields that block publishing. A card must show
     * those even when they did not change, or approving the publish cannot succeed.
     */
    async getReviewState(ref: DocumentRef) {
      const draft = await readDraft(ref);

      if (draft === null) {
        return null;
      }

      const provenance = getService(strapi, 'provenance');
      const views = await provenance.getForEntry(draft.target, draft.entry);

      return {
        locale: draft.target.locale,
        fields: Object.fromEntries(
          Object.entries(views).map(([field, view]): [string, FieldReviewState] => [
            field,
            { ...view, hash: hashValue(draft.entry[field]) },
          ])
        ),
        toReview: await provenance.findUnreviewedAi(draft.target, draft.entry),
      };
    },

    /**
     * Runs an action a person approved, as one transaction:
     *
     * - `hashes` are the values the reviewer saw. Any difference throws `StaleApprovalError`.
     * - Writes inside `run` are attributed to the agent, not to the reviewer whose request
     *   this is.
     * - A publish reviews the shown fields before it runs, so the publish guard lets it
     *   through. An update reviews what it changed, since the queued edit is what was shown.
     */
    async executeApproved<T>(
      {
        action,
        agent,
        decidedBy,
        hashes,
        claim,
        pendingActionId,
        ...ref
      }: DocumentRef & {
        action: 'publish' | 'unpublish' | 'delete' | 'update';
        agent: AgentPrincipal;
        /** The admin user who approved */
        decidedBy: string | number;
        hashes: Record<string, string>;
        /** What the agent declared when it asked, such as its model */
        claim?: ClientClaim | null;
        pendingActionId?: string;
      },
      run: () => Promise<T>
    ): Promise<T> {
      const values = getService(strapi, 'values');
      const tracked = values.getTracked(ref.uid);
      const shown = Object.keys(hashes);
      const untracked = shown.filter((field) => !tracked.includes(field));

      if (untracked.length > 0) {
        throw new errors.ValidationError(`Fields without provenance: ${untracked.join(', ')}`);
      }

      let audited: { target: Target; fields: string[] } | null = null;

      const output = await strapi.db.transaction(async () => {
        await getService(strapi, 'provenance').lockDocument(ref.uid, ref.documentId);

        const before = await readDraft(ref);

        if (before === null) {
          throw new errors.NotFoundError('Entry not found');
        }

        const stale = shown.filter((field) => hashValue(before.entry[field]) !== hashes[field]);

        if (stale.length > 0) {
          throw new StaleApprovalError(stale);
        }

        if (action === 'publish') {
          await review(before.target, shown, before.entry, decidedBy);
          audited = { target: before.target, fields: shown };
        }

        const result = await getService(strapi, 'request').withExecution({ agent, claim }, run);

        if (action === 'update') {
          const after = await readDraft(ref);

          if (after !== null) {
            const changed = tracked.filter(
              (field) => hashValue(before.entry[field]) !== hashValue(after.entry[field])
            );

            await review(after.target, changed, after.entry, decidedBy);
            audited = { target: after.target, fields: changed };
          }
        }

        return result;
      });

      // After the commit: a rollback must not leave an audit entry behind
      if (audited !== null) {
        await emitAudit({ strapi }, AUDIT_EVENTS.FIELDS_REVIEWED, {
          ...(audited as { target: Target; fields: string[] }),
          pendingActionId,
        });
      }

      return output as T;
    },
  };
};

export type ApprovalsService = ReturnType<typeof createApprovalsService>;
