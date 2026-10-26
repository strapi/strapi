/**
 * Rules deciding whether a permission stays within the permissions a user holds (their
 * "ceiling"). Used by role management: a user cannot grant a role more than they hold.
 * Pure: no DB access.
 *
 * The permission engine registers every stored permission as its own rule: a permission's
 * fields, locales and conditions only apply together, never mixed with another permission's.
 * Holding `title` on `en` and `body` on `fr` does not give `title` on `fr`. The ceiling follows
 * the same rule: a requested permission is split into atoms, one per combination of a field, a
 * value of every other restricted property, and a condition, and every atom must be covered by
 * a single held permission. Different atoms may be covered by different held permissions, so
 * same-dimension unions (`title` plus `body`, `en` plus `fr`) stay valid.
 *
 * An empty list on a property other than `fields` (`locales: []`) grants no value of that
 * property, so it is not a dimension: it needs nothing to cover it, but the other properties and
 * the conditions are still checked. An empty `fields` list grants nothing at all.
 *
 * Admin tokens follow the same rule against the token owner, but their conditions are inherited
 * instead of chosen: `getInheritedConditions` computes them, and a token permission it returns
 * `null` for is rejected (`enforceAdminPermissionsCeiling` in `services/api-token.ts`) or
 * removed (`reconcileTokenPermissionsToUserCeiling`).
 *
 * Held and requested permissions are read the way the engine enforces them
 * (`toEnforcedPermissions`): on a localized subject, a missing `locales` key is no locale, the
 * same as `locales: []`, because i18n's engine hook enforces it as `locale $in []`.
 */
import { uniq } from 'lodash';

export interface CeilingPermission {
  action: string;
  subject?: string | null;
  properties?: Record<string, any> | null;
  conditions?: string[] | null;
}

/**
 * One combination of a requested permission. A `null` value means the request is not
 * restricted on that property (no `fields`, `locales: null`, ...) or carries no condition, which
 * only a held permission unrestricted on the same dimension can cover.
 */
export interface PermissionAtom {
  properties: Record<string, string | null>;
  condition: string | null;
}

/**
 * What the permission engine enforces, for `toEnforcedPermissions`.
 */
export interface EnforcementContext {
  /** Whether the engine enforces `locales` here (localized subject, holder not a super admin) */
  isLocalesEnforced: (permission: CeilingPermission) => boolean;
  /** Whether the condition provider knows this condition id */
  isConditionRegistered: (condition: string) => boolean;
}

/**
 * The permissions as the engine enforces them. Where `locales` is enforced, a missing key (or
 * missing `properties`) becomes `locales: []`: i18n's engine hook restricts such a permission
 * to `locale $in []`, so it grants no locale. `locales: null` (every locale) and lists are kept.
 * The input is not mutated.
 */
export const toEnforcedPermissions = <T extends CeilingPermission>(
  permissions: T[],
  context: EnforcementContext
): T[] =>
  permissions.map((permission) => {
    if (!context.isLocalesEnforced(permission) || permission.properties?.locales !== undefined) {
      return permission;
    }

    return { ...permission, properties: { ...(permission.properties ?? {}), locales: [] } };
  });

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
 * The properties the request or any matching held permission restricts (`fields`, `locales`,
 * ...). Each one is a dimension of the atoms.
 */
export const getRestrictedProperties = (
  requested: CeilingPermission,
  matching: CeilingPermission[]
): string[] =>
  uniq([
    ...Object.keys(requested.properties ?? {}),
    ...matching.flatMap((permission) => Object.keys(permission.properties ?? {})),
  ]);

/**
 * Whether `held` covers `value` of `property`: a permission not restricted on the property
 * (unset or `null`) covers every value; otherwise the value must be listed. An empty list
 * covers nothing: i18n enforces `locales: []` as `locale $in []`. A `null` value (the request
 * is unrestricted) is only covered by a held permission that is unrestricted too.
 */
export const coversPropertyValue = (
  held: CeilingPermission,
  property: string,
  value: string | null
): boolean => {
  const heldValues = held.properties?.[property];

  if (heldValues === undefined || heldValues === null) {
    return true;
  }

  if (value === null || !Array.isArray(heldValues)) {
    return false;
  }

  return isPropertyValueAllowed(property, value, heldValues);
};

/**
 * Conditions are OR-ed by the permission engine, so fewer conditions means narrower and none
 * means unrestricted. An unconditional held permission covers any condition, otherwise the
 * condition must be listed; no condition (`null`) needs an unconditional holder.
 */
export const coversCondition = (held: CeilingPermission, condition: string | null): boolean => {
  const heldConditions = held.conditions ?? [];

  if (heldConditions.length === 0) {
    return true;
  }

  return condition !== null && heldConditions.includes(condition);
};

/**
 * Whether a single held permission covers every dimension of `atom`.
 */
export const coversAtom = (held: CeilingPermission, atom: PermissionAtom): boolean =>
  Object.entries(atom.properties).every(([property, value]) =>
    coversPropertyValue(held, property, value)
  ) && coversCondition(held, atom.condition);

interface PropertyDimension {
  property: string;
  values: (string | null)[];
}

/**
 * The requested values of a property as a dimension: `[null]` when the request is not
 * restricted on it, the listed values otherwise. An empty list grants no value of the property
 * (i18n enforces `locales: []` as `locale $in []`, and ignores it on non-localized subjects), so
 * it is not a dimension (`null`). The other properties and the conditions are still checked.
 */
const getPropertyDimension = (
  requested: CeilingPermission,
  property: string
): PropertyDimension | null => {
  const requestedValues = requested.properties?.[property];

  if (!Array.isArray(requestedValues)) {
    return { property, values: [null] };
  }

  if (requestedValues.length === 0) {
    return null;
  }

  return { property, values: uniq(requestedValues as string[]) };
};

/**
 * Walks the cartesian product of the dimensions without materialising it and checks that every
 * combination satisfies `isCovered`.
 */
const everyCombination = (
  dimensions: PropertyDimension[],
  isCovered: (properties: Record<string, string | null>) => boolean,
  properties: Record<string, string | null> = {}
): boolean => {
  if (dimensions.length === 0) {
    return isCovered(properties);
  }

  const [{ property, values }, ...rest] = dimensions;

  return values.every((value) =>
    everyCombination(rest, isCovered, { ...properties, [property]: value })
  );
};

/**
 * Every combination of the dimensions, for when the same combinations are checked more than
 * once.
 */
const collectCombinations = (
  dimensions: PropertyDimension[],
  properties: Record<string, string | null> = {}
): Record<string, string | null>[] => {
  if (dimensions.length === 0) {
    return [properties];
  }

  const [{ property, values }, ...rest] = dimensions;

  return values.flatMap((value) => collectCombinations(rest, { ...properties, [property]: value }));
};

/**
 * The property dimensions of `requested` against the matching held permissions.
 */
const getDimensions = (
  requested: CeilingPermission,
  matching: CeilingPermission[]
): PropertyDimension[] =>
  getRestrictedProperties(requested, matching)
    .map((property) => getPropertyDimension(requested, property))
    .filter((dimension): dimension is PropertyDimension => dimension !== null);

/**
 * Whether `requested` is covered by the `held` permissions: same action and subject, and every
 * combination of a requested property value and condition covered by one held permission.
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

  if (matching.length === 0) {
    return false;
  }

  const dimensions = getDimensions(requested, matching);

  const requestedConditions = requested.conditions ?? [];
  const conditions: (string | null)[] =
    requestedConditions.length === 0 ? [null] : uniq(requestedConditions);

  return conditions.every((condition) =>
    everyCombination(dimensions, (properties) =>
      matching.some((permission) => coversAtom(permission, { properties, condition }))
    )
  );
};

/**
 * The conditions a permission inherits when it is written on behalf of a holder (admin tokens):
 * `[]` when every atom of `requested` is covered by an unconditional held permission, otherwise
 * every held condition under which every atom is covered. `null` when the request is not
 * coverable: no matching permission, an atom no held permission covers, a property the request
 * leaves open while a matching permission restricts it, or no condition shared by all atoms.
 * `requested.conditions` is ignored.
 */
export const getInheritedConditions = (
  requested: CeilingPermission,
  held: CeilingPermission[]
): string[] | null => {
  // A permission with no fields grants nothing, so it needs no condition
  if (hasNoFields(requested)) {
    return [];
  }

  const matching = findMatchingPermissions(requested, held);

  if (matching.length === 0) {
    return null;
  }

  const atoms = collectCombinations(getDimensions(requested, matching));

  const isCoveredUnder = (condition: string | null) =>
    atoms.every((properties) =>
      matching.some((permission) => coversAtom(permission, { properties, condition }))
    );

  if (isCoveredUnder(null)) {
    return [];
  }

  const allowed = uniq(matching.flatMap((permission) => permission.conditions ?? [])).filter(
    (condition) => isCoveredUnder(condition)
  );

  return allowed.length === 0 ? null : allowed;
};

export default {
  toEnforcedPermissions,
  hasNoFields,
  findMatchingPermissions,
  isPropertyValueAllowed,
  getRestrictedProperties,
  coversPropertyValue,
  coversCondition,
  coversAtom,
  isPermissionWithinCeiling,
  getInheritedConditions,
};
