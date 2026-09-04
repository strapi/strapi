import type { Core, Modules } from '@strapi/types';
import { emitAudit, type FieldChange } from '@strapi/utils';

import { AUDITED_EVENTS } from './constants';

/**
 * Transformers for the release audit events.
 * Each builds {resource, details, outcome} from its emitted event.
 */

interface ReleaseEvent {
  releaseId: number;
  name?: string;
  scheduledAt?: string | null;
  timezone?: string | null;
}

interface ReleaseEntryEvent {
  releaseId: number;
  name?: string;
  contentType: string;
  entryDocumentId: string;
  locale: string | null;
}

export interface CreateDetails {
  isScheduled: boolean;
  scheduledAt?: string | null;
  timezone?: string | null;
}

export const RELEASE_EDITABLE_FIELDS = ['name', 'scheduledAt', 'timezone'] as const;

/** Audit rows are never pruned by size, so the failure reason is capped */
const MAX_REASON_LENGTH = 100;

type ReleaseChangedField = (typeof RELEASE_EDITABLE_FIELDS)[number] | 'isScheduled';

export interface UpdateDetails {
  changes: Partial<Record<ReleaseChangedField, FieldChange>>;
}

/**
 * Returns the fields that changed in a release update.
 * `isScheduled` is included when the release changes between scheduled and unscheduled.
 */
export const getReleaseChanges = (
  previous: { name?: string; scheduledAt?: string | null; timezone?: string | null } | null,
  next: { name?: string; scheduledAt?: string | null; timezone?: string | null }
) => {
  const changes: Partial<Record<ReleaseChangedField, FieldChange>> = {};

  for (const field of RELEASE_EDITABLE_FIELDS) {
    const hasChanged = (previous?.[field] ?? null) !== (next[field] ?? null);

    if (hasChanged) {
      changes[field] = { before: previous?.[field] ?? null, after: next[field] ?? null };
    }

    if (field === 'scheduledAt' && changes.scheduledAt) {
      const wasScheduled = previous?.scheduledAt != null;
      const isScheduled = next.scheduledAt != null;

      if (wasScheduled !== isScheduled) {
        changes.isScheduled = { before: wasScheduled, after: isScheduled };
      }
    }
  }

  return changes;
};

export interface TriggerDetails {
  published: number;
  unpublished: number;
  failed: number;
}

export interface TriggerFailureDetails {
  /**
   * Only the error name is stored, capped in length. Error objects may contain
   * sensitive data such as database error details, and a custom error class can put
   * arbitrary text in its name.
   */
  reason: string;
  // A failed run is not atomic, so counts are not reported. Reserved for partial releases.
  published?: number;
  unpublished?: number;
  failed?: number;
}

type TriggerEvent = ReleaseEvent &
  (
    | { outcome: 'success'; published?: number; unpublished?: number }
    | {
        outcome: 'failure';
        reason: string;
        published?: number;
        unpublished?: number;
        failed?: number;
      }
  );

export interface SettingsUpdateDetails {
  changes: Partial<Record<'defaultTimezone', FieldChange>>;
}

interface EntryRef {
  contentType: string;
  documentId: string;
  locale: string | null;
}

export interface EntryAddDetails {
  entry: EntryRef;
  actionType: 'publish' | 'unpublish';
}

export interface EntryUpdateDetails {
  entry: EntryRef;
  actionType: { before: 'publish' | 'unpublish'; after: 'publish' | 'unpublish' };
}

export interface EntryRemoveDetails {
  entry: EntryRef;
}

/**
 * Emits an audit event for a write that may be part of a bulk transaction.
 * Inside one, the event waits for its commit, so a rollback leaves no rows for
 * entries that were never added. Standalone, it is emitted right away.
 */
export const emitAuditOnCommit = async (
  { strapi }: { strapi: Core.Strapi },
  event: string,
  payload: unknown
): Promise<void> => {
  if (!strapi.db.inTransaction()) {
    await emitAudit({ strapi }, event, payload);
    return;
  }

  await strapi.db.transaction(({ onCommit }) =>
    onCommit(() => emitAudit({ strapi }, event, payload))
  );
};

/**
 * Runs work as a system principal so events emitted during the operation
 * are recorded with a system actor.
 */
export const runAsSystem = async <T>(
  { strapi }: { strapi: Core.Strapi },
  origin: Modules.AuditLogs.SystemOrigin,
  work: () => Promise<T>
): Promise<T> => {
  let result: T;

  await strapi.requestContext.run(
    { state: { auditSource: origin }, request: { url: '' } } as any,
    async () => {
      result = await work();
    }
  );

  return result!;
};

/**
 * The part of the audit-logs lifecycle service used by this plugin.
 * The full service type lives in the Admin EE package and cannot be imported here.
 */
interface AuditLogsLifecycle {
  registerEvent<TDetails>(
    name: string,
    transform: Modules.AuditLogs.EventTransformer<TDetails>
  ): void;
}

export const registerAuditEvents = (auditLogsLifecycle: AuditLogsLifecycle) => {
  const releaseResource = (event: ReleaseEvent): Modules.AuditLogs.Resource => ({
    type: 'release',
    id: event.releaseId,
    name: event.name,
  });

  const entryRef = (event: ReleaseEntryEvent): EntryRef => ({
    contentType: event.contentType,
    documentId: event.entryDocumentId,
    locale: event.locale ?? null,
  });

  auditLogsLifecycle.registerEvent<CreateDetails>(
    AUDITED_EVENTS.RELEASE_CREATE,
    (event: ReleaseEvent) => ({
      resource: releaseResource(event),
      details: {
        isScheduled: event.scheduledAt != null,
        ...(event.scheduledAt && { scheduledAt: event.scheduledAt, timezone: event.timezone }),
      },
    })
  );

  auditLogsLifecycle.registerEvent<UpdateDetails>(
    AUDITED_EVENTS.RELEASE_UPDATE,
    (event: ReleaseEvent & UpdateDetails) => ({
      resource: releaseResource(event),
      details: { changes: event.changes },
    })
  );

  auditLogsLifecycle.registerEvent(AUDITED_EVENTS.RELEASE_DELETE, (event: ReleaseEvent) => ({
    resource: releaseResource(event),
  }));

  auditLogsLifecycle.registerEvent<TriggerDetails | TriggerFailureDetails>(
    AUDITED_EVENTS.RELEASE_TRIGGER,
    (event: TriggerEvent) => {
      const base = { resource: releaseResource(event), outcome: event.outcome };

      if (event.outcome === 'failure') {
        return {
          ...base,
          details: {
            reason: event.reason?.slice(0, MAX_REASON_LENGTH),
            // Only when the emitter can attribute the counts.
            ...(event.published != null && {
              published: event.published,
              unpublished: event.unpublished,
              failed: event.failed,
            }),
          },
        };
      }

      if (event.published != null && event.unpublished != null) {
        return {
          ...base,
          details: { published: event.published, unpublished: event.unpublished, failed: 0 },
        };
      }

      return base;
    }
  );

  auditLogsLifecycle.registerEvent<EntryAddDetails>(
    AUDITED_EVENTS.RELEASE_ENTRY_ADD,
    (event: ReleaseEntryEvent & { type: 'publish' | 'unpublish' }) => ({
      resource: releaseResource(event),
      details: { entry: entryRef(event), actionType: event.type },
    })
  );

  auditLogsLifecycle.registerEvent<EntryUpdateDetails>(
    AUDITED_EVENTS.RELEASE_ENTRY_UPDATE,
    (
      event: ReleaseEntryEvent & {
        from: 'publish' | 'unpublish';
        to: 'publish' | 'unpublish';
      }
    ) => ({
      resource: releaseResource(event),
      details: { entry: entryRef(event), actionType: { before: event.from, after: event.to } },
    })
  );

  auditLogsLifecycle.registerEvent<EntryRemoveDetails>(
    AUDITED_EVENTS.RELEASE_ENTRY_REMOVE,
    (event: ReleaseEntryEvent) => ({
      resource: releaseResource(event),
      details: { entry: entryRef(event) },
    })
  );

  auditLogsLifecycle.registerEvent<SettingsUpdateDetails>(
    AUDITED_EVENTS.RELEASE_SETTINGS_UPDATE,
    (event: SettingsUpdateDetails) => ({
      resource: { type: 'release' },
      details: { changes: event.changes },
    })
  );
};
