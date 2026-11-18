import { isEqual } from 'lodash';
import type { Data, Modules } from '@strapi/types';

export const AUDITED_EVENTS = {
  SSO_SETTINGS_UPDATE: 'sso-settings.update',
} as const;

/** The SSO login options as stored under `providers` in the `auth` admin-store key. */
export interface SsoSettings {
  autoRegister: boolean;
  defaultRole: Data.ID | null;
  ssoLockedRoles?: Data.ID[] | null;
}

export type SsoSettingsChanges = Partial<{
  autoRegister: Modules.AuditLogs.FieldChange<boolean>;
  defaultRole: Modules.AuditLogs.FieldChange<Data.ID | null>;
  ssoLockedRoles: Modules.AuditLogs.FieldChange<Data.ID[] | null>;
}>;

export interface UpdateDetails {
  changes: SsoSettingsChanges;
}

const AUDITED_FIELDS = ['autoRegister', 'defaultRole', 'ssoLockedRoles'] as const;

const sortRoleIds = (ids: Data.ID[]): Data.ID[] =>
  [...ids].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));

// The admin form sends role ids as strings; rows record them as numbers, like other audit events.
const toRecordedId = (id: Data.ID): Data.ID =>
  typeof id === 'string' && /^\d+$/.test(id) ? Number(id) : id;

const toRecorded = (settings: Partial<SsoSettings>, field: (typeof AUDITED_FIELDS)[number]) => {
  if (field === 'defaultRole') {
    return settings.defaultRole == null ? null : toRecordedId(settings.defaultRole);
  }

  if (field === 'ssoLockedRoles') {
    return settings.ssoLockedRoles == null
      ? null
      : sortRoleIds(settings.ssoLockedRoles).map(toRecordedId);
  }

  return settings[field] ?? null;
};

// Role ids are accepted as numbers or strings, so `3` and `"3"` are the same role.
const toComparable = (settings: Partial<SsoSettings>, field: (typeof AUDITED_FIELDS)[number]) => {
  if (field === 'defaultRole') {
    return settings.defaultRole == null ? null : String(settings.defaultRole);
  }

  if (field === 'ssoLockedRoles') {
    return sortRoleIds(settings.ssoLockedRoles ?? []).map(String);
  }

  return settings[field];
};

export const getSsoSettingsChanges = (
  previous: Partial<SsoSettings>,
  next: Partial<SsoSettings>
): SsoSettingsChanges => {
  const changes: Record<string, Modules.AuditLogs.FieldChange<unknown>> = {};

  for (const field of AUDITED_FIELDS) {
    if (!isEqual(toComparable(previous, field), toComparable(next, field))) {
      changes[field] = { before: toRecorded(previous, field), after: toRecorded(next, field) };
    }
  }

  return changes as SsoSettingsChanges;
};

/**
 * The part of the audit-logs lifecycle service used here.
 * The full service type lives in the Admin EE package.
 */
interface AuditLogsLifecycle {
  registerEvent<TDetails>(
    name: string,
    transform: Modules.AuditLogs.EventTransformer<TDetails>
  ): void;
}

export const registerSsoSettingsAuditEvents = (auditLogsLifecycle: AuditLogsLifecycle) => {
  auditLogsLifecycle.registerEvent<UpdateDetails>(
    AUDITED_EVENTS.SSO_SETTINGS_UPDATE,
    (event: UpdateDetails) => ({
      resource: { type: 'sso-settings' },
      details: { changes: event.changes },
    })
  );
};
