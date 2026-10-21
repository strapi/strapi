import type { Modules } from '@strapi/types';

import type { Settings } from './controllers/validation/admin/settings';

export const AUDITED_EVENTS = {
  UPLOAD_SETTINGS_UPDATE: 'upload-settings.update',
} as const;

const AUDITED_SETTINGS = [
  'sizeOptimization',
  'responsiveDimensions',
  'autoOrientation',
  'aiMetadata',
] as const;

export type UploadSettingsChanges = Partial<
  Record<(typeof AUDITED_SETTINGS)[number], Modules.AuditLogs.FieldChange<boolean | null>>
>;

export interface SettingsUpdateDetails {
  changes: UploadSettingsChanges;
}

// The store replaces the whole value, so an option missing from the request is removed and recorded as null.
export const getUploadSettingsChanges = (
  previous: Partial<Settings> | null,
  next: Partial<Settings>
): UploadSettingsChanges => {
  const changes: UploadSettingsChanges = {};

  for (const setting of AUDITED_SETTINGS) {
    const before = previous?.[setting] ?? null;
    const after = next[setting] ?? null;

    if (before !== after) {
      changes[setting] = { before, after };
    }
  }

  return changes;
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
  auditLogsLifecycle.registerEvent<SettingsUpdateDetails>(
    AUDITED_EVENTS.UPLOAD_SETTINGS_UPDATE,
    (event: SettingsUpdateDetails) => ({
      resource: { type: 'upload-settings' },
      details: { changes: event.changes },
    })
  );
};
