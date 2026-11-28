import type { Data, Modules, UID } from '@strapi/types';

export const AUDITED_EVENTS = {
  ENTRY_DRAFT_DISCARD: 'entry.draft-discard',
  ENTRY_HISTORY_RESTORE: 'entry.history.restore',
} as const;

interface EntryResource extends Modules.AuditLogs.Resource {
  type: 'entry';
  uid: UID.ContentType;
  id: string;
}

/** The payload of the existing entry.draft-discard event, emitted by the document service. */
export interface DraftDiscardEvent {
  uid: UID.ContentType;
  entry: { documentId: string; locale?: string | null };
}

export interface DraftDiscardDetails {
  locale: string | null;
}

export interface HistoryRestoreEvent {
  uid: UID.ContentType;
  documentId: string;
  locale: string | null;
  versionId: Data.ID;
  versionCreatedAt: string;
}

export interface HistoryRestoreDetails {
  locale: string | null;
  version: { id: Data.ID; createdAt: string };
}

/**
 * The part of the audit-logs lifecycle service used by this plugin.
 * The full service type lives in the Admin EE package and cannot be imported here.
 */
interface AuditLogsLifecycle {
  registerEvent<TDetails, TResource extends Modules.AuditLogs.Resource>(
    name: string,
    transform: Modules.AuditLogs.EventTransformer<TDetails, TResource>
  ): void;
}

export const registerAuditEvents = (auditLogsLifecycle: AuditLogsLifecycle) => {
  auditLogsLifecycle.registerEvent<DraftDiscardDetails, EntryResource>(
    AUDITED_EVENTS.ENTRY_DRAFT_DISCARD,
    (event: DraftDiscardEvent) => ({
      resource: { type: 'entry', uid: event.uid, id: event.entry.documentId },
      details: { locale: event.entry.locale ?? null },
    })
  );

  auditLogsLifecycle.registerEvent<HistoryRestoreDetails, EntryResource>(
    AUDITED_EVENTS.ENTRY_HISTORY_RESTORE,
    (event: HistoryRestoreEvent) => ({
      resource: { type: 'entry', uid: event.uid, id: event.documentId },
      details: {
        locale: event.locale,
        version: { id: event.versionId, createdAt: event.versionCreatedAt },
      },
    })
  );
};
