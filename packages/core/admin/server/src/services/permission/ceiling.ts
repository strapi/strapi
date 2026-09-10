import { isEqual, uniq } from 'lodash/fp';
import { errors } from '@strapi/utils';
import type { Data } from '@strapi/types';

import { getService } from '../../utils';
import { hasSuperAdminRole } from '../../domain/user';
import type { AdminUser, Permission } from '../../../../shared/contracts/shared';

const { PolicyError } = errors;

/**
 * Raised when a grant exceeds the caller's ceiling. Extends `PolicyError` on
 * purpose: the endpoint composer turns every other `ForbiddenError` thrown by a
 * controller into a bare 403 (no message, no details), whereas policy errors
 * are allowed to carry a public message — and this refusal must be explicit.
 */
export class PermissionCeilingError extends PolicyError<string, { violations: unknown[] }> {
  constructor(message: string, details: { violations: unknown[] }) {
    super(message, details);
    // `PolicyError` types `name` as its own literal; the explicit name is part of the contract.
    Object.defineProperty(this, 'name', { value: 'PermissionCeilingError', enumerable: false });
  }
}

/**
 * The permission ceiling: an admin cannot grant, through a role or a role
 * assignment, a permission they do not hold themselves (CMS-1718).
 *
 * Comparison rules for a requested permission against the caller's
 * permissions with the same action and subject:
 *   - `properties.fields`  must be a subset of the union of the caller's fields
 *     (a caller permission without fields grants every field; a field-restricted
 *     caller rejects a request that omits fields, since that would mean "all");
 *   - `properties.locales` follows the same rule (`null` = every locale);
 *   - any other property key must deep-equal the same key on one of the caller's
 *     matching permissions;
 *   - `conditions` are OR-ed by the permission engine, so more conditions mean
 *     broader access: an unconditional caller permission grants anything, a
 *     conditional one only grants a non-empty subset of its conditions.
 *
 * Super admins hold everything and bypass the ceiling.
 */

export type PermissionLike = Pick<Permission, 'action'> &
  Partial<Pick<Permission, 'subject' | 'properties' | 'conditions'>>;

export type CeilingViolationReason =
  | 'action-not-held'
  | 'fields-required'
  | 'fields-exceed'
  | 'locales-required'
  | 'locales-exceed'
  | 'property-mismatch'
  | 'conditions-exceed';

export interface CeilingViolation {
  action: string;
  subject: string | null;
  reason: CeilingViolationReason;
  details?: {
    fields?: string[];
    locales?: string[];
    property?: string;
    conditions?: string[];
  };
}

export interface CeilingCheckResult {
  allowed: boolean;
  violations: CeilingViolation[];
}

export interface RoleCeilingCheckResult {
  allowed: boolean;
  roles: Array<{ roleId: Data.ID; violations: CeilingViolation[] }>;
}

const normalizeSubject = (subject: string | null | undefined): string | null => subject ?? null;

const isAllFields = (fields: string[] | null | undefined) => !fields || fields.length === 0;

/** `a.b` is covered by `a` (the role editor grants component fields by prefix). */
const isFieldCovered = (field: string, allowed: string[]) =>
  allowed.some((candidate) => field === candidate || field.startsWith(`${candidate}.`));

const RESERVED_PROPERTY_KEYS = new Set(['fields', 'locales']);

/**
 * Pure comparison of a requested permission set against a ceiling. Returns
 * every violation, not the first.
 */
export const checkPermissionsWithinCeiling = (
  ceilingPermissions: PermissionLike[],
  requestedPermissions: PermissionLike[]
): CeilingCheckResult => {
  const violations: CeilingViolation[] = [];

  for (const requested of requestedPermissions) {
    const subject = normalizeSubject(requested.subject);
    const matches = ceilingPermissions.filter(
      (candidate) =>
        candidate.action === requested.action && normalizeSubject(candidate.subject) === subject
    );

    if (matches.length === 0) {
      violations.push({ action: requested.action, subject, reason: 'action-not-held' });
      continue;
    }

    /* ---- fields ---- */
    const requestedFields = requested.properties?.fields;
    if (!matches.some((match) => isAllFields(match.properties?.fields))) {
      const allowedFields = uniq(matches.flatMap((match) => match.properties?.fields ?? []));
      if (requestedFields === undefined || requestedFields === null) {
        violations.push({ action: requested.action, subject, reason: 'fields-required' });
      } else {
        const exceeding = requestedFields.filter((field) => !isFieldCovered(field, allowedFields));
        if (exceeding.length > 0) {
          violations.push({
            action: requested.action,
            subject,
            reason: 'fields-exceed',
            details: { fields: exceeding },
          });
        }
      }
    }

    /* ---- locales ---- */
    const requestedLocales = requested.properties?.locales;
    const ceilingLocales = matches.map((match) => match.properties?.locales);
    if (!ceilingLocales.some((locales) => locales === undefined || locales === null)) {
      const allowedLocales = uniq(ceilingLocales.flatMap((locales) => locales ?? []));
      if (requestedLocales === undefined || requestedLocales === null) {
        violations.push({ action: requested.action, subject, reason: 'locales-required' });
      } else {
        const exceeding = requestedLocales.filter((locale) => !allowedLocales.includes(locale));
        if (exceeding.length > 0) {
          violations.push({
            action: requested.action,
            subject,
            reason: 'locales-exceed',
            details: { locales: exceeding },
          });
        }
      }
    }

    /* ---- other property keys ---- */
    for (const [key, value] of Object.entries(requested.properties ?? {})) {
      if (RESERVED_PROPERTY_KEYS.has(key)) {
        continue;
      }
      const matched = matches.some((match) => isEqual(match.properties?.[key], value));
      if (!matched) {
        violations.push({
          action: requested.action,
          subject,
          reason: 'property-mismatch',
          details: { property: key },
        });
      }
    }

    /* ---- conditions ---- */
    const anyUnconditional = matches.some(
      (match) => !match.conditions || match.conditions.length === 0
    );
    if (!anyUnconditional) {
      const allowedConditions = uniq(matches.flatMap((match) => match.conditions ?? []));
      const requestedConditions = requested.conditions ?? [];
      const exceeding = requestedConditions.filter(
        (condition) => !allowedConditions.includes(condition)
      );
      if (requestedConditions.length === 0 || exceeding.length > 0) {
        violations.push({
          action: requested.action,
          subject,
          reason: 'conditions-exceed',
          details: { conditions: exceeding },
        });
      }
    }
  }

  return { allowed: violations.length === 0, violations };
};

const describeViolation = (violation: CeilingViolation): string => {
  const target =
    violation.subject !== null ? `${violation.action} on ${violation.subject}` : violation.action;
  switch (violation.reason) {
    case 'action-not-held':
      return target;
    case 'fields-required':
      return `${target} (fields must be specified)`;
    case 'fields-exceed':
      return `${target} (fields: ${violation.details?.fields?.join(', ')})`;
    case 'locales-required':
      return `${target} (locales must be specified)`;
    case 'locales-exceed':
      return `${target} (locales: ${violation.details?.locales?.join(', ')})`;
    case 'property-mismatch':
      return `${target} (property: ${violation.details?.property})`;
    case 'conditions-exceed':
      return `${target} (conditions)`;
    default:
      return target;
  }
};

export const formatCeilingMessage = (violations: CeilingViolation[]): string =>
  `Cannot grant permissions that exceed your own: ${violations.map(describeViolation).join(', ')}`;

/**
 * Checks requested permissions against the caller's own permissions. Super
 * admins always pass.
 */
export const checkUserCanGrantPermissions = async (
  user: AdminUser | undefined | null,
  requestedPermissions: PermissionLike[]
): Promise<CeilingCheckResult> => {
  if (!user) {
    return {
      allowed: false,
      violations: requestedPermissions.map((permission) => ({
        action: permission.action,
        subject: normalizeSubject(permission.subject),
        reason: 'action-not-held' as const,
      })),
    };
  }
  if (requestedPermissions.length === 0 || hasSuperAdminRole(user)) {
    return { allowed: true, violations: [] };
  }

  const ceiling: Permission[] = await getService('permission').findUserPermissions(user);
  return checkPermissionsWithinCeiling(ceiling, requestedPermissions);
};

export const assertUserCanGrantPermissions = async (
  user: AdminUser | undefined | null,
  requestedPermissions: PermissionLike[]
): Promise<void> => {
  const { allowed, violations } = await checkUserCanGrantPermissions(user, requestedPermissions);
  if (!allowed) {
    throw new PermissionCeilingError(formatCeilingMessage(violations), { violations });
  }
};

/**
 * Checks that every permission carried by the given roles is within the
 * caller's ceiling — assigning a role is granting its permissions.
 */
export const checkUserCanAssignRoles = async (
  user: AdminUser | undefined | null,
  roleIds: Data.ID[]
): Promise<RoleCeilingCheckResult> => {
  const ids = uniq(roleIds.map(String));
  if (ids.length === 0) {
    return { allowed: true, roles: [] };
  }
  if (user && hasSuperAdminRole(user)) {
    return { allowed: true, roles: [] };
  }

  const permissionService = getService('permission');
  const rolePermissions: Array<Permission & { role?: { id: Data.ID } | Data.ID | null }> =
    await permissionService.findMany({
      where: { role: { id: { $in: ids } } },
      populate: ['role'],
    });

  const byRole = new Map<string, Permission[]>();
  for (const permission of rolePermissions) {
    const role = permission.role;
    const roleId = role && typeof role === 'object' ? role.id : role;
    if (roleId === null || roleId === undefined) {
      continue;
    }
    byRole.set(String(roleId), [...(byRole.get(String(roleId)) ?? []), permission]);
  }

  const ceiling: Permission[] = user ? await permissionService.findUserPermissions(user) : [];
  const roles: RoleCeilingCheckResult['roles'] = [];

  for (const roleId of ids) {
    const { violations } = checkPermissionsWithinCeiling(ceiling, byRole.get(roleId) ?? []);
    if (violations.length > 0) {
      roles.push({ roleId, violations });
    }
  }

  return { allowed: roles.length === 0, roles };
};

export const assertUserCanAssignRoles = async (
  user: AdminUser | undefined | null,
  roleIds: Data.ID[]
): Promise<void> => {
  const { allowed, roles } = await checkUserCanAssignRoles(user, roleIds);
  if (!allowed) {
    throw new PermissionCeilingError('Cannot assign roles that exceed your own permissions', {
      violations: roles,
    });
  }
};
