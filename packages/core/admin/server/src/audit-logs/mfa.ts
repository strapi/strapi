import { isEqual } from 'lodash';
import type { Core, Data, Modules } from '@strapi/types';

import type { AdminUserResource } from './admin-users';

/**
 * The hub events `admin::mfa`'s `notify` emits: `admin.mfa.<notice type, underscores as dots>`.
 * Written out rather than derived from the notice union, so adding a notice type is a decision
 * about the audit log too and cannot start recording rows nobody designed a shape for.
 */
export const MFA_NOTICE_EVENTS = [
  'admin.mfa.enabled',
  'admin.mfa.disabled',
  'admin.mfa.reset',
  'admin.mfa.challenge.failed',
  'admin.mfa.authenticator.replaced',
  'admin.mfa.locked',
  'admin.mfa.unlocked',
  'admin.mfa.device.trusted',
  'admin.mfa.device.trust.revoked',
  'admin.mfa.trusted.device.used',
  'admin.mfa.passkey.registered',
  'admin.mfa.passkey.removed',
  'admin.mfa.passkey.used',
] as const;

/** Emitted by `/login` and `/reset-password` when the account must present a second factor. */
export const MFA_REQUIRED_EVENT = 'admin.auth.mfa_required';

/** Emitted by `admin::security-settings` after a save. */
export const SECURITY_SETTINGS_UPDATE_EVENT = 'admin.security-settings.update';

/** Payload of every `MFA_NOTICE_EVENTS` emit. `byUserId` names the administrator who acted on
 * somebody else's account; `count` is how many credentials one action covered. */
interface MfaNoticeEvent {
  userId: Data.ID;
  byUserId?: Data.ID;
  count?: number;
}

interface MfaNoticeDetails {
  byUserId?: Data.ID;
  count?: number;
}

interface MfaRequiredEvent {
  user: { id: Data.ID; email?: string | null };
  provider: string;
}

/** The settings document as `admin::security-settings` returns it. */
interface SecuritySettingsSnapshot {
  mfa: { mode: string; graceDays: number; requiredRoles: string[] };
  trustedDevices: { enabled: boolean; days: number };
  passkeys: { enabled: boolean };
}

interface SecuritySettingsUpdateEvent {
  previous: SecuritySettingsSnapshot;
  next: SecuritySettingsSnapshot;
}

type SettingsChanges = Record<string, Modules.AuditLogs.FieldChange<unknown>>;

interface AuditLogsLifecycle {
  registerEvent<TDetails>(
    name: string,
    transform: Modules.AuditLogs.EventTransformer<TDetails>,
    options?: { allowUnknownActor?: boolean; alwaysUnknownActor?: boolean }
  ): void;
}

/**
 * Only the fields that moved, as dotted paths, the same `{ before, after }` shape
 * `admin-user.update` records. The whole document on both sides would be two copies of every
 * setting per save, most of them unchanged and none of them telling the reader what happened.
 */
export const diffSecuritySettings = (
  previous: SecuritySettingsSnapshot,
  next: SecuritySettingsSnapshot
): SettingsChanges => {
  const flatten = (settings: SecuritySettingsSnapshot): Record<string, unknown> => ({
    'mfa.mode': settings.mfa.mode,
    'mfa.graceDays': settings.mfa.graceDays,
    // Order is not meaning: the same roles in a new order is not a change.
    'mfa.requiredRoles': [...settings.mfa.requiredRoles].sort(),
    'trustedDevices.enabled': settings.trustedDevices.enabled,
    'trustedDevices.days': settings.trustedDevices.days,
    'passkeys.enabled': settings.passkeys.enabled,
  });

  const before = flatten(previous);
  const after = flatten(next);

  return Object.keys(before).reduce<SettingsChanges>((changes, key) => {
    if (!isEqual(before[key], after[key])) {
      changes[key] = { before: before[key], after: after[key] };
    }
    return changes;
  }, {});
};

/**
 * Registers the second-factor events on the standard audit shape.
 *
 * The actor follows develop's model rather than guessing. When a session exists it is the actor --
 * an administrator resetting a colleague's factor, or a user enabling their own. When none does,
 * as on `/login/mfa` before the session is issued, the actor is `unknown` and the account the event
 * concerns is the `resource`. Attributing those rows to the account holder, as this branch used to,
 * would put a failed guess by an attacker on the victim's name.
 *
 * Takes `strapi` because the notices carry only the account id, and an audit reader recognises an
 * email, not a row number. Looked up at audit time, inside the subscriber, so it costs nothing on
 * an install without audit logs.
 */
export const registerMfaAuditEvents = (
  auditLogsLifecycle: AuditLogsLifecycle,
  { strapi }: { strapi: Core.Strapi }
) => {
  const accountResource = async (
    userId: Data.ID
  ): Promise<AdminUserResource | Modules.AuditLogs.Resource> => {
    const user = await strapi.db
      .query('admin::user')
      .findOne({ where: { id: userId }, select: ['id', 'email'] });

    // A deleted account still has an id worth recording; it just no longer has an email to read.
    return user?.email
      ? { type: 'admin-user', id: user.id, email: user.email }
      : { type: 'admin-user', id: userId };
  };

  for (const name of MFA_NOTICE_EVENTS) {
    auditLogsLifecycle.registerEvent<MfaNoticeDetails>(
      name,
      async (event: MfaNoticeEvent) => ({
        resource: await accountResource(event.userId),
        details: {
          ...(event.byUserId !== undefined ? { byUserId: event.byUserId } : {}),
          ...(event.count !== undefined ? { count: event.count } : {}),
        },
      }),
      { allowUnknownActor: true }
    );
  }

  // A login that has not completed, like `admin.auth.error`: never attributed to the session --
  // there is none yet on `/login`, and on `/reset-password` there never is one.
  auditLogsLifecycle.registerEvent<{ provider: string }>(
    MFA_REQUIRED_EVENT,
    (event: MfaRequiredEvent) => ({
      resource: event.user.email
        ? { type: 'admin-user', id: event.user.id, email: event.user.email }
        : { type: 'admin-user', id: event.user.id },
      details: { provider: event.provider },
    }),
    { alwaysUnknownActor: true }
  );

  // Only reachable with a session and the update permission, so the default -- an actor is
  // required -- is right.
  auditLogsLifecycle.registerEvent<{ changes: SettingsChanges }>(
    SECURITY_SETTINGS_UPDATE_EVENT,
    (event: SecuritySettingsUpdateEvent) => ({
      resource: { type: 'security-settings' },
      details: { changes: diffSecuritySettings(event.previous, event.next) },
    })
  );
};
