import type { Data, Modules } from '@strapi/types';
import { emitAudit } from '@strapi/utils';

import { toRoleIds, type AdminUserResource, type AdminUserSnapshot } from './admin-users';

/**
 * Event hub events bound to the `admin.auth.events` config callbacks
 * (`onConnectionError`, `onSSOAutoRegistration`). Their names and payloads are public.
 */
export const AUTH_EVENTS = {
  LOGIN_FAILURE: 'admin.auth.error',
  AUTO_REGISTRATION: 'admin.auth.autoRegistration',
} as const;

/** One fixed value per emit site. */
export type LoginFailureReason =
  | 'login_not_allowed'
  | 'unexpected_error'
  | 'invalid_credentials'
  | 'account_inactive'
  | 'sso_connection_error'
  | 'sso_registration_disabled'
  | 'sso_role_misconfigured';

/**
 * Payload of `admin.auth.error`, also passed to the `onConnectionError` callback.
 * The audit log stores `provider`, `reason` and the account, never `error`.
 */
export interface LoginFailureEvent {
  error: Error;
  provider: string;
  reason: LoginFailureReason;
  /** The account the login was for, when known. */
  user?: { id: Data.ID; email: string };
}

/** Payload of `admin.auth.autoRegistration`: the created `admin::user` row, roles populated. */
export interface AutoRegistrationEvent {
  user: { id: Data.ID; email?: string | null; roles?: AdminUserSnapshot['roles'] };
  provider: string;
}

export interface LoginFailureDetails {
  provider: string;
  reason: LoginFailureReason;
}

export interface AutoRegistrationDetails {
  provider: string;
  roles: Data.ID[];
}

type AuditStrapi = Parameters<typeof emitAudit>[0]['strapi'];

export const emitLoginFailure = ({ strapi }: { strapi: AuditStrapi }, event: LoginFailureEvent) =>
  emitAudit({ strapi }, AUTH_EVENTS.LOGIN_FAILURE, {
    error: event.error,
    provider: event.provider,
    reason: event.reason,
    ...(event.user ? { user: { id: event.user.id, email: event.user.email } } : {}),
  } satisfies LoginFailureEvent);

/**
 * Whether the audit log records a failed login. Not recorded: failures anyone can produce
 * from outside before any verification, a local login for an email with no account and an
 * SSO connection with no valid profile.
 */
export const isRecordedLoginFailure = (event: LoginFailureEvent) =>
  event.reason !== 'sso_connection_error' && !(event.provider === 'local' && !event.user);

/**
 * The part of the audit-logs lifecycle service used here.
 * The full service type lives in the Admin EE package.
 */
interface AuditLogsLifecycle {
  registerEvent<TDetails>(
    name: string,
    transform: Modules.AuditLogs.EventTransformer<TDetails>,
    options?: { allowUnknownActor?: boolean; shouldRecord?: (...args: any[]) => boolean }
  ): void;
}

const toResource = (user: { id: Data.ID; email?: string | null }): AdminUserResource => ({
  type: 'admin-user',
  id: user.id,
  email: user.email as string,
});

export const registerAuthAuditEvents = (auditLogsLifecycle: AuditLogsLifecycle) => {
  auditLogsLifecycle.registerEvent<LoginFailureDetails>(
    AUTH_EVENTS.LOGIN_FAILURE,
    (event: LoginFailureEvent) => ({
      ...(event.user ? { resource: toResource(event.user) } : {}),
      outcome: 'failure',
      details: { provider: event.provider, reason: event.reason },
    }),
    { allowUnknownActor: true, shouldRecord: isRecordedLoginFailure }
  );

  auditLogsLifecycle.registerEvent<AutoRegistrationDetails>(
    AUTH_EVENTS.AUTO_REGISTRATION,
    (event: AutoRegistrationEvent) => ({
      resource: toResource(event.user),
      details: { provider: event.provider, roles: toRoleIds(event.user.roles) },
    })
  );
};
