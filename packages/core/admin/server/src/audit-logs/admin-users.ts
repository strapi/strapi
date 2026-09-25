import { isEqual, sortBy } from 'lodash/fp';
import type { Data, Modules } from '@strapi/types';
import { emitAudit } from '@strapi/utils';

export const AUDITED_EVENTS = {
  USER_CREATE: 'admin-user.create',
  USER_UPDATE: 'admin-user.update',
  USER_DELETE: 'admin-user.delete',
  PASSWORD_RESET_CREATE: 'admin-user.password-reset.create',
  PASSWORD_RESET_CONFIRM: 'admin-user.password-reset.confirm',
  PASSWORD_UPDATE: 'admin-user.password.update',
  INVITE_ACCEPT: 'admin-user.invite.accept',
} as const;

/**
 * Event hub events kept for custom listeners. The audit log no longer records them:
 * it records the AUDITED_EVENTS above, built from the row with before/after values.
 *
 * @deprecated Removed in the next major. Listen to the audit log events, or to the
 * database lifecycles, instead.
 */
export const LEGACY_USER_EVENTS = {
  CREATE: 'user.create',
  UPDATE: 'user.update',
  DELETE: 'user.delete',
} as const;

export interface AdminUserResource extends Modules.AuditLogs.Resource {
  type: 'admin-user';
  id: Data.ID;
  email: string;
}

/**
 * The affected account, as read from the `admin::user` row after the write. Never the
 * row itself: it carries the password hash and the reset and registration tokens.
 */
export interface AdminUserEvent {
  userId: Data.ID;
  email: string;
}

/**
 * The fields an audit reader needs to identify the account and its access. Never
 * `password`, the tokens, or the timestamps: the row has its own date.
 */
export const ADMIN_USER_TRACKED_FIELDS = [
  'firstname',
  'lastname',
  'email',
  'username',
  'preferedLanguage',
  'isActive',
] as const;

type TrackedField = (typeof ADMIN_USER_TRACKED_FIELDS)[number];

/** A user row, or the attributes of an update: roles come as rows or as ids. */
export interface AdminUserSnapshot {
  firstname?: string | null;
  lastname?: string | null;
  email?: string | null;
  username?: string | null;
  preferedLanguage?: string | null;
  isActive?: boolean | null;
  roles?: Array<Data.ID | { id: Data.ID }> | null;
}

export type AdminUserChanges = Partial<
  Record<TrackedField, Modules.AuditLogs.FieldChange<string | boolean | null>> & {
    roles: Modules.AuditLogs.FieldChange<Data.ID[]>;
  }
>;

export interface CreateDetails {
  email: string;
  firstname: string | null;
  lastname: string | null;
  roles: Data.ID[];
  isActive: boolean;
}

export type CreateEvent = AdminUserEvent & Omit<CreateDetails, 'email'>;
export type UpdateEvent = AdminUserEvent & { changes: AdminUserChanges };
export type PasswordResetCreateEvent = AdminUserEvent & { expiresAt: string | Date };

/** Sorted, so order alone is not a change. */
export const toRoleIds = (roles: AdminUserSnapshot['roles']): Data.ID[] =>
  sortBy(
    (id: Data.ID) => String(id),
    (roles ?? []).map((role) => (typeof role === 'object' ? role.id : role))
  );

export const getAdminUserChanges = (
  previous: AdminUserSnapshot,
  next: AdminUserSnapshot
): AdminUserChanges => {
  const changes: AdminUserChanges = {};

  for (const field of ADMIN_USER_TRACKED_FIELDS) {
    // isActive is a boolean column that older rows may hold as null
    const before = field === 'isActive' ? previous.isActive === true : (previous[field] ?? null);
    const after = field === 'isActive' ? next.isActive === true : (next[field] ?? null);

    if (before !== after) {
      changes[field] = { before, after };
    }
  }

  if (previous.roles != null || next.roles != null) {
    const before = toRoleIds(previous.roles);
    const after = toRoleIds(next.roles);

    if (!isEqual(before, after)) {
      changes.roles = { before, after };
    }
  }

  return changes;
};

/**
 * `email` is required by the admin::user schema; the contract type marks it optional
 * because it also describes creation payloads.
 */
export const toAdminUserEvent = (user: { id: Data.ID; email?: string | null }): AdminUserEvent => ({
  userId: user.id,
  email: user.email as string,
});

type AuditStrapi = Parameters<typeof emitAudit>[0]['strapi'];

interface AdminUserRow extends AdminUserSnapshot {
  id: Data.ID;
}

export const emitAdminUserCreated = ({ strapi }: { strapi: AuditStrapi }, user: AdminUserRow) =>
  emitAudit({ strapi }, AUDITED_EVENTS.USER_CREATE, {
    ...toAdminUserEvent(user),
    firstname: user.firstname ?? null,
    lastname: user.lastname ?? null,
    roles: toRoleIds(user.roles),
    isActive: user.isActive === true,
  } satisfies CreateEvent);

export const emitAdminUserDeleted = ({ strapi }: { strapi: AuditStrapi }, user: AdminUserRow) =>
  emitAudit({ strapi }, AUDITED_EVENTS.USER_DELETE, toAdminUserEvent(user));

/** Whether an update touches a field the audit log compares, so the previous row is needed. */
export const touchesTrackedFields = (attributes: Record<string, unknown>) =>
  [...ADMIN_USER_TRACKED_FIELDS, 'roles'].some((field) => field in attributes);

/**
 * The account events an update can produce, emitted by updateById after the write:
 * `admin-user.update` with the fields that changed, `admin-user.password.update` when a
 * password was set. Both run through the request context, so a public flow (reset,
 * invitation) with no session emits them too and the subscriber drops them.
 */
export const emitAdminUserUpdateAudits = async (
  { strapi }: { strapi: AuditStrapi },
  {
    previous,
    updated,
    attributes,
  }: {
    previous: AdminUserSnapshot | null | undefined;
    updated: AdminUserRow | null | undefined;
    attributes: Record<string, unknown>;
  }
) => {
  if (!updated) {
    return;
  }

  if (previous) {
    const changes = getAdminUserChanges(previous, updated);

    if (Object.keys(changes).length > 0) {
      await emitAudit({ strapi }, AUDITED_EVENTS.USER_UPDATE, {
        ...toAdminUserEvent(updated),
        changes,
      } satisfies UpdateEvent);
    }
  }

  if ('password' in attributes) {
    await emitAudit({ strapi }, AUDITED_EVENTS.PASSWORD_UPDATE, toAdminUserEvent(updated));
  }
};

/**
 * The part of the audit-logs lifecycle service used here.
 * The full service type lives in the Admin EE package.
 */
interface AuditLogsLifecycle {
  registerEvent<TDetails>(
    name: string,
    transform: Modules.AuditLogs.EventTransformer<TDetails>,
    options?: { allowUnknownActor?: boolean }
  ): void;
}

export const registerAdminUserAuditEvents = (auditLogsLifecycle: AuditLogsLifecycle) => {
  const resource = (event: AdminUserEvent): AdminUserResource => ({
    type: 'admin-user',
    id: event.userId,
    email: event.email,
  });

  const withoutSession = { allowUnknownActor: true };

  // The first super admin registers from a public form too
  auditLogsLifecycle.registerEvent<CreateDetails>(
    AUDITED_EVENTS.USER_CREATE,
    (event: CreateEvent) => ({
      resource: resource(event),
      details: {
        email: event.email,
        firstname: event.firstname,
        lastname: event.lastname,
        roles: event.roles,
        isActive: event.isActive,
      },
    }),
    withoutSession
  );

  auditLogsLifecycle.registerEvent<{ changes: AdminUserChanges }>(
    AUDITED_EVENTS.USER_UPDATE,
    (event: UpdateEvent) => ({
      resource: resource(event),
      details: { changes: event.changes },
    })
  );

  auditLogsLifecycle.registerEvent<undefined>(
    AUDITED_EVENTS.USER_DELETE,
    (event: AdminUserEvent) => ({ resource: resource(event) })
  );

  auditLogsLifecycle.registerEvent<{ expiresAt: string }>(
    AUDITED_EVENTS.PASSWORD_RESET_CREATE,
    (event: PasswordResetCreateEvent) => ({
      resource: resource(event),
      details: { expiresAt: new Date(event.expiresAt).toISOString() },
    }),
    withoutSession
  );

  auditLogsLifecycle.registerEvent<undefined>(
    AUDITED_EVENTS.PASSWORD_RESET_CONFIRM,
    (event: AdminUserEvent) => ({ resource: resource(event) }),
    withoutSession
  );

  auditLogsLifecycle.registerEvent<undefined>(
    AUDITED_EVENTS.INVITE_ACCEPT,
    (event: AdminUserEvent) => ({ resource: resource(event) }),
    withoutSession
  );

  auditLogsLifecycle.registerEvent<undefined>(
    AUDITED_EVENTS.PASSWORD_UPDATE,
    (event: AdminUserEvent) => ({ resource: resource(event) })
  );
};
