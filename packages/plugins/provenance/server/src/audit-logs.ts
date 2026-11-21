import type { Core, Modules } from '@strapi/types';

import type { Target } from './services/provenance';

export const AUDIT_EVENTS = {
  FIELDS_REVIEWED: 'provenance.fields.review',
  FIELDS_DECLARED: 'provenance.fields.declare',
  SETTINGS_UPDATE: 'provenance.settings.update',
} as const;

export type FieldsEvent = { target: Target; fields: string[]; pendingActionId?: string };

export type SettingsEvent = {
  changes: { requireReviewBeforePublish: Modules.AuditLogs.FieldChange<boolean> };
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

const toFieldsShape = ({ target, fields, pendingActionId }: FieldsEvent) => ({
  resource: { type: 'provenance-entry', id: target.documentId },
  details: { uid: target.uid, locale: target.locale, fields, pendingActionId },
});

export const registerAuditEvents = (strapi: Core.Strapi) => {
  if (!strapi.has('audit-logs-lifecycle')) {
    return;
  }

  const lifecycle: AuditLogsLifecycle = strapi.get('audit-logs-lifecycle');

  lifecycle.registerEvent(AUDIT_EVENTS.FIELDS_REVIEWED, toFieldsShape);
  lifecycle.registerEvent(AUDIT_EVENTS.FIELDS_DECLARED, toFieldsShape);
  lifecycle.registerEvent(AUDIT_EVENTS.SETTINGS_UPDATE, ({ changes }: SettingsEvent) => ({
    resource: { type: 'provenance-settings' },
    details: { changes },
  }));
};
