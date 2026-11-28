import type { Modules } from '@strapi/types';

export const AUDITED_EVENTS = {
  PROJECT_SETTINGS_UPDATE: 'project-settings.update',
} as const;

const AUDITED_LOGOS = ['menuLogo', 'authLogo'] as const;

type Logo = { name?: string; hash?: string } | null | undefined;

/** The logos as stored under the `project-settings` admin-store key. */
export type ProjectSettingsLogos = Partial<Record<(typeof AUDITED_LOGOS)[number], Logo>>;

export type ProjectSettingsChanges = Partial<
  Record<(typeof AUDITED_LOGOS)[number], Modules.AuditLogs.FieldChange<string | null>>
>;

export interface UpdateDetails {
  changes: ProjectSettingsChanges;
}

// The service stores `{}` for a logo when there were no settings yet and none was uploaded.
const toName = (logo: Logo) => logo?.name ?? null;

// A new upload gets a new hash, even when the file name is the same.
export const getProjectSettingsChanges = (
  previous: ProjectSettingsLogos | null | undefined,
  next: ProjectSettingsLogos
): ProjectSettingsChanges => {
  const changes: ProjectSettingsChanges = {};

  for (const logo of AUDITED_LOGOS) {
    const before = previous?.[logo];
    const after = next[logo];

    if (toName(before) !== toName(after) || (before?.hash ?? null) !== (after?.hash ?? null)) {
      changes[logo] = { before: toName(before), after: toName(after) };
    }
  }

  return changes;
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

export const registerProjectSettingsAuditEvents = (auditLogsLifecycle: AuditLogsLifecycle) => {
  auditLogsLifecycle.registerEvent<UpdateDetails>(
    AUDITED_EVENTS.PROJECT_SETTINGS_UPDATE,
    (event: UpdateDetails) => ({
      resource: { type: 'project-settings' },
      details: { changes: event.changes },
    })
  );
};
