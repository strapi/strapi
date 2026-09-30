import { isEqual, sortBy } from 'lodash/fp';
import type { Data, Modules } from '@strapi/types';

import type { Permission } from '../../../shared/contracts/shared';

export const AUDITED_EVENTS = {
  TOKEN_CREATE: 'token.create',
  TOKEN_UPDATE: 'token.update',
  TOKEN_DELETE: 'token.delete',
  TOKEN_REGENERATE: 'token.regenerate',
} as const;

export type TokenKind = 'content-api' | 'admin' | 'transfer';

/**
 * A token permission as recorded in the audit log: action, subject and properties.
 * The row id says nothing to an auditor, and conditions are not part of the token:
 * they are copied from the owner's role and cannot be set per token.
 */
export interface AdminPermissionRef {
  action: string;
  subject: string | null;
  properties: Permission['properties'];
}

export type PermissionRef = string | AdminPermissionRef;

export const toAdminPermissionRefs = (
  permissions: Array<Pick<Permission, 'action' | 'subject' | 'properties'>> | null | undefined
): AdminPermissionRef[] =>
  (permissions ?? []).map((permission) => ({
    action: permission.action,
    subject: permission.subject ?? null,
    properties: permission.properties ?? {},
  }));

export const toActionRefs = (
  permissions: Array<string | { action: string }> | null | undefined
): string[] =>
  (permissions ?? []).map((permission) =>
    typeof permission === 'string' ? permission : permission.action
  );

/**
 * The owner is recorded as an id: the user object carries the email, which has no place
 * in the log.
 */
export interface TokenEvent {
  tokenId: Data.ID;
  name: string;
  kind: TokenKind;
  adminUserOwner?: Data.ID;
}

export interface TokenResource extends Modules.AuditLogs.Resource {
  type: TokenKind;
}

export interface CreateDetails {
  description: string | null;
  /** Milliseconds. The column is a biginteger and comes back as a string. */
  lifespan: number | null;
  expiresAt: string | null;
  /** content-api only: read-only | full-access | custom */
  type?: string;
  /** content-api (custom), transfer and admin tokens */
  permissions?: PermissionRef[];
  adminUserOwner?: Data.ID;
}

export type CreateEvent = TokenEvent & {
  description?: string | null;
  lifespan?: string | number | null;
  expiresAt?: string | number | Date | null;
  type?: string;
  permissions?: PermissionRef[];
};

export const TOKEN_EDITABLE_FIELDS = ['name', 'description', 'type'] as const;

export type TokenChanges = Partial<{
  name: Modules.AuditLogs.FieldChange<string | null>;
  description: Modules.AuditLogs.FieldChange<string | null>;
  type: Modules.AuditLogs.FieldChange<string | null>;
  permissions: Modules.AuditLogs.FieldChange<PermissionRef[]>;
}>;

export interface UpdateDetails {
  changes: TokenChanges;
  adminUserOwner?: Data.ID;
}

export type UpdateEvent = TokenEvent & { changes: TokenChanges };

export interface TokenSnapshot {
  name?: string | null;
  description?: string | null;
  type?: string | null;
  permissions?: PermissionRef[];
}

/**
 * Sorted, and passed through JSON so undefined fields drop: neither order nor an absent
 * field counts as a change.
 */
const sortRefs = (refs: PermissionRef[]): PermissionRef[] =>
  sortBy((ref: PermissionRef) => JSON.stringify(ref), JSON.parse(JSON.stringify(refs)));

export const getTokenChanges = (previous: TokenSnapshot, next: TokenSnapshot): TokenChanges => {
  const changes: TokenChanges = {};

  for (const field of TOKEN_EDITABLE_FIELDS) {
    const before = previous[field] ?? null;
    const after = next[field] ?? null;

    if (before !== after) {
      changes[field] = { before, after };
    }
  }

  if (previous.permissions !== undefined || next.permissions !== undefined) {
    const before = sortRefs(previous.permissions ?? []);
    const after = sortRefs(next.permissions ?? []);

    if (!isEqual(before, after)) {
      changes.permissions = { before, after };
    }
  }

  return changes;
};

const toIso = (value: string | number | Date | null | undefined): string | null =>
  value == null ? null : new Date(value).toISOString();

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

export const registerTokenAuditEvents = (auditLogsLifecycle: AuditLogsLifecycle) => {
  const tokenResource = (event: TokenEvent): TokenResource => ({
    type: event.kind,
    id: event.tokenId,
    name: event.name,
  });

  const owner = (event: TokenEvent) =>
    event.adminUserOwner != null ? { adminUserOwner: event.adminUserOwner } : {};

  auditLogsLifecycle.registerEvent<CreateDetails>(
    AUDITED_EVENTS.TOKEN_CREATE,
    (event: CreateEvent) => ({
      resource: tokenResource(event),
      details: {
        description: event.description ?? null,
        lifespan: event.lifespan == null ? null : Number(event.lifespan),
        expiresAt: toIso(event.expiresAt),
        ...(event.type !== undefined && { type: event.type }),
        ...(event.permissions !== undefined && { permissions: sortRefs(event.permissions) }),
        ...owner(event),
      },
    })
  );

  auditLogsLifecycle.registerEvent<UpdateDetails>(
    AUDITED_EVENTS.TOKEN_UPDATE,
    (event: UpdateEvent) => ({
      resource: tokenResource(event),
      details: { changes: event.changes, ...owner(event) },
    })
  );

  auditLogsLifecycle.registerEvent<{ adminUserOwner: Data.ID } | undefined>(
    AUDITED_EVENTS.TOKEN_DELETE,
    (event: TokenEvent) => ({
      resource: tokenResource(event),
      ...(event.adminUserOwner != null && { details: { adminUserOwner: event.adminUserOwner } }),
    })
  );

  auditLogsLifecycle.registerEvent<{ adminUserOwner: Data.ID } | undefined>(
    AUDITED_EVENTS.TOKEN_REGENERATE,
    (event: TokenEvent) => ({
      resource: tokenResource(event),
      ...(event.adminUserOwner != null && { details: { adminUserOwner: event.adminUserOwner } }),
    })
  );
};
