/**
 * Rules deciding whether a permission stays within the permissions a user holds (their
 * "ceiling"). Used by role management: a user cannot grant a role more than they hold.
 * Pure: no DB access.
 *
 * Admin tokens enforce a similar ceiling against the token owner in `services/api-token.ts`
 * (`enforceAdminPermissionsCeiling`), with its own rules for now: fields only, and conditions
 * inherited from the owner instead of chosen.
 */
import { uniq } from 'lodash';

export interface CeilingPermission {
  action: string;
  subject?: string | null;
  properties?: Record<string, any> | null;
  conditions?: string[] | null;
}

/**
 * The permission engine drops permissions with an empty `fields` list (access to no field),
 * so such a permission grants nothing.
 */
export const hasNoFields = (permission: CeilingPermission): boolean => {
  const fields = permission.properties?.fields;

  return Array.isArray(fields) && fields.length === 0;
};

/**
 * The held permissions with the same action and subject as `requested`, ignoring the ones that
 * grant nothing (`fields: []`).
 */
export const findMatchingPermissions = <T extends CeilingPermission>(
  requested: CeilingPermission,
  held: T[]
): T[] => {
  const requestedSubject = requested.subject ?? null;

  return held.filter(
    (permission) =>
      permission.action === requested.action &&
      (permission.subject ?? null) === requestedSubject &&
      !hasNoFields(permission)
  );
};

/**
 * The values of `property` covered by the matching permissions: `undefined` when one of them is
 * not restricted on that property (unset or `null`), otherwise the union of their values.
 * An empty array means "no values": i18n enforces `locales: []` as `locale $in []` and only
 * `null` as all locales, so an empty list adds nothing to the union.
 */
export const getEffectivePropertyValues = (
  matching: CeilingPermission[],
  property: string
): string[] | undefined => {
  const values = matching.map((permission) => permission.properties?.[property]);

  if (values.some((value) => value === undefined || value === null)) {
    return undefined;
  }

  return uniq(values.flatMap((value) => (Array.isArray(value) ? value : [])));
};

/**
 * Whether a single property value is covered by the allowed values. A nested field path is
 * covered by its parent (`seo.title` by `seo`), like the permission engine does.
 */
export const isPropertyValueAllowed = (
  property: string,
  value: string,
  allowedValues: string[]
): boolean =>
  allowedValues.some(
    (allowed) => value === allowed || (property === 'fields' && value.startsWith(`${allowed}.`))
  );

/**
 * For every property the matching permissions restrict (e.g. `fields`, `locales`), the
 * requested values must be a subset of the effective values. Omitting a restricted property
 * (or setting it to `null`) would be broader than the ceiling, so it is rejected.
 */
export const isWithinPropertyCeiling = (
  requested: CeilingPermission,
  matching: CeilingPermission[]
): boolean => {
  const restrictedProperties = uniq(
    matching.flatMap((permission) => Object.keys(permission.properties ?? {}))
  );

  return restrictedProperties.every((property) => {
    const effectiveValues = getEffectivePropertyValues(matching, property);

    if (effectiveValues === undefined) {
      return true;
    }

    const requestedValues = requested.properties?.[property];

    if (!Array.isArray(requestedValues)) {
      return false;
    }

    return requestedValues.every((value: string) =>
      isPropertyValueAllowed(property, value, effectiveValues)
    );
  });
};

/**
 * Conditions are OR-ed by the permission engine, so fewer conditions means narrower and none
 * means unrestricted. Returns `[]` when one of the matching permissions is unconditional,
 * otherwise the union of their conditions.
 */
export const getEffectiveConditions = (matching: CeilingPermission[]): string[] => {
  const conditions = matching.map((permission) => permission.conditions ?? []);

  if (conditions.some((list) => list.length === 0)) {
    return [];
  }

  return uniq(conditions.flat());
};

/**
 * Anything goes when the ceiling is unconditional, otherwise the requested conditions must be a
 * non-empty subset of the effective conditions.
 */
export const isWithinConditionCeiling = (
  requested: CeilingPermission,
  matching: CeilingPermission[]
): boolean => {
  const effectiveConditions = getEffectiveConditions(matching);

  if (effectiveConditions.length === 0) {
    return true;
  }

  const requestedConditions = requested.conditions ?? [];

  return (
    requestedConditions.length > 0 &&
    requestedConditions.every((condition) => effectiveConditions.includes(condition))
  );
};

/**
 * Whether `requested` is covered by the `held` permissions: same action and subject, every
 * property restricted to a subset of the held ones, and conditions no broader than the held ones.
 */
export const isPermissionWithinCeiling = (
  requested: CeilingPermission,
  held: CeilingPermission[]
): boolean => {
  // Requesting a permission with no fields grants nothing
  if (hasNoFields(requested)) {
    return true;
  }

  const matching = findMatchingPermissions(requested, held);

  return (
    matching.length > 0 &&
    isWithinPropertyCeiling(requested, matching) &&
    isWithinConditionCeiling(requested, matching)
  );
};

export default {
  hasNoFields,
  findMatchingPermissions,
  getEffectivePropertyValues,
  isPropertyValueAllowed,
  isWithinPropertyCeiling,
  getEffectiveConditions,
  isWithinConditionCeiling,
  isPermissionWithinCeiling,
};
