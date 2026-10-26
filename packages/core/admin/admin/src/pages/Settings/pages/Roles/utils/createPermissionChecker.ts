/**
 * Decides which checkboxes and conditions of the permissions form a user may tick, given the
 * permissions they hold themselves (`userPermissions`). Used by the role editor and the admin
 * token form.
 *
 * The rules mirror the server ceiling (`server/src/domain/permission/ceiling.ts`). The
 * permission engine registers every held permission as its own rule, so a combination of a
 * field, a locale and a condition is only grantable when a single held permission covers all
 * of them. Holding `title` on `en` and `body` on `fr` does not allow `title` on `fr`. The form
 * keeps one permission per action and subject, so what the user has already ticked for that
 * action (the "selection") decides which other values can still be added: ticking `title`
 * leaves `fr` disabled in the example above. Unions on one dimension across held permissions
 * (`title` plus `body`, `en` plus `fr`) stay valid, as the engine grants them through two rules.
 */

import { isObject } from '../../../../../utils/objects';

import type * as PermissionContracts from '../../../../../../../shared/contracts/permissions';
import type { Permission as AuthPermission } from '../../../../../features/Auth';

/**
 * What is ticked for one action and subject: the selected values of every property (dotted
 * paths for nested fields, like the API payload) and the selected conditions.
 */
export interface Selection {
  properties: Record<string, string[]>;
  conditions: string[];
}

export const EMPTY_SELECTION: Selection = { properties: {}, conditions: [] };

/**
 * One combination of the selection. Only the dimensions present are checked: a property with
 * nothing ticked yet or an absent `condition` does not constrain the held permission. A `null`
 * value means the permission is unrestricted on that dimension (no `fields`, `locales: null`, no
 * conditions), which only a held permission unrestricted on the same dimension covers.
 */
export interface SelectionAtom {
  properties: Record<string, string | null>;
  condition?: string | null;
}

/**
 * The shape of a permission the ceiling rules read, matching the server's `CeilingPermission`.
 * Both the permissions of a role and the ones the user holds satisfy it.
 */
export interface CeilingPermission {
  action: string;
  subject?: string | null;
  properties?: Record<string, unknown> | null;
  conditions?: string[] | null;
  actionParameters?: object | null;
}

/* -------------------------------------------------------------------------------------------------
 * Rules shared with the server ceiling
 * -----------------------------------------------------------------------------------------------*/

/**
 * The held permissions as the engine enforces them, the same as `toEnforcedPermissions` in
 * `server/src/domain/permission/ceiling.ts`. On a localized subject (one whose layout lists a
 * `locales` property, which the server adds only where i18n enforces it) a missing `locales` key
 * is no locale, the same as `locales: []`; on any other subject `locales` is ignored, so it is
 * removed. Conditions missing from `layout.conditions` (the registered ones) are removed, and a
 * permission whose conditions are all missing from it grants nothing, so it is removed too, as
 * is a permission with action parameters.
 */
export const toEnforcedPermissions = <T extends CeilingPermission>(
  userPermissions: T[],
  layout: PermissionContracts.GetAll.Response['data']
): T[] => {
  const localizedSubjects = new Set(
    [...layout.sections.collectionTypes.subjects, ...layout.sections.singleTypes.subjects]
      .filter((subject) => subject.properties.some((property) => property.value === 'locales'))
      .map((subject) => subject.uid)
  );
  const registeredConditions = new Set(layout.conditions.map((condition) => condition.id));

  const toEnforcedLocales = (permission: T): T => {
    const { locales, ...otherProperties } = permission.properties ?? {};

    if (!permission.subject || !localizedSubjects.has(permission.subject)) {
      return permission.properties && 'locales' in permission.properties
        ? { ...permission, properties: otherProperties }
        : permission;
    }

    if (locales !== undefined) {
      return permission;
    }

    return { ...permission, properties: { ...otherProperties, locales: [] } };
  };

  return userPermissions.flatMap((permission) => {
    if (permission.actionParameters && Object.keys(permission.actionParameters).length > 0) {
      return [];
    }

    const conditions = permission.conditions ?? [];
    const registered = conditions.filter((condition) => registeredConditions.has(condition));

    if (conditions.length > 0 && registered.length === 0) {
      return [];
    }

    const enforced =
      registered.length === conditions.length
        ? permission
        : { ...permission, conditions: registered };

    return [toEnforcedLocales(enforced)];
  });
};

const hasNoFields = (permission: CeilingPermission): boolean => {
  const fields = permission.properties?.fields;

  return Array.isArray(fields) && fields.length === 0;
};

const isUnconditional = (permission: CeilingPermission): boolean =>
  !permission.conditions || permission.conditions.length === 0;

/**
 * The held permissions with the same action and subject, ignoring the ones that grant nothing
 * (`fields: []`).
 */
export const findMatchingPermissions = (
  userPermissions: AuthPermission[],
  action: string,
  subject: string | null | undefined
): AuthPermission[] =>
  userPermissions.filter(
    (perm) =>
      perm.action === action && (perm.subject ?? null) === (subject ?? null) && !hasNoFields(perm)
  );

/**
 * Whether `held` covers `value` of `property`: a permission not restricted on the property
 * (unset or `null`) covers every value; otherwise the value must be listed. A nested field is
 * covered by its parent (`seo.title` by `seo`), like the permission engine does. A `null` value
 * (unrestricted) is only covered by a held permission that is unrestricted too.
 */
export const coversPropertyValue = (
  held: AuthPermission,
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

  return (heldValues as string[]).some(
    (allowed) => value === allowed || (property === 'fields' && value.startsWith(`${allowed}.`))
  );
};

/**
 * Conditions are OR-ed by the permission engine, so an unconditional held permission covers any
 * condition; otherwise the condition must be listed. No condition (`null`) needs an
 * unconditional holder.
 */
export const coversCondition = (held: AuthPermission, condition: string | null): boolean =>
  isUnconditional(held) || (condition !== null && (held.conditions ?? []).includes(condition));

/**
 * Whether a single held permission covers every dimension of `atom`.
 */
export const coversAtom = (held: AuthPermission, atom: SelectionAtom): boolean =>
  Object.entries(atom.properties).every(([property, value]) =>
    coversPropertyValue(held, property, value)
  ) &&
  (atom.condition === undefined || coversCondition(held, atom.condition));

/**
 * Whether the user holds `action` on `subject` and, when given, the `value` of `property`
 * (e.g. the `title` field or the `fr` locale) on any of their matching permissions. This is the
 * check for a value on its own; see {@link canTick} for a value added to a selection.
 */
export const isPermissionHeld = (
  userPermissions: AuthPermission[],
  action: string,
  subject: string | null | undefined,
  property?: string,
  value?: string
): boolean => {
  const matching = findMatchingPermissions(userPermissions, action, subject);

  if (matching.length === 0) {
    return false;
  }

  if (property === undefined || value === undefined || value === '') {
    return true;
  }

  return matching.some((perm) => coversPropertyValue(perm, property, value));
};

const combineValues = <T extends string | null>(
  dimensions: [property: string, values: T[]][]
): Record<string, T>[] =>
  dimensions.reduce<Record<string, T>[]>(
    (combinations, [property, values]) =>
      combinations.flatMap((combination) =>
        values.map((value) => ({ ...combination, [property]: value }))
      ),
    [{}]
  );

/**
 * The values of `property` on `permission` as a dimension of its atoms: `[null]` when it is not
 * restricted on the property, the listed values otherwise. An empty list (`locales: []`) grants
 * no value of the property, so it gives no dimension; the other properties and the conditions
 * are still checked.
 */
const getPropertyValues = (permission: CeilingPermission, property: string): (string | null)[] => {
  const values = permission.properties?.[property];

  if (!Array.isArray(values)) {
    return [null];
  }

  return [...new Set(values as string[])];
};

/**
 * Whether the user may grant `permission` as a whole: every combination of its property values
 * and conditions must be covered by one held permission. Same rule as `isPermissionWithinCeiling`
 * in `server/src/domain/permission/ceiling.ts`, on the same primitives as {@link canTick}, so the
 * disabled states of the form and this check cannot disagree. Used where a stored permission is
 * copied into a form that has no existing-permission exemption (duplicating a role), so that the
 * server does not reject the whole update.
 */
export const isPermissionWithinCeiling = (
  userPermissions: AuthPermission[],
  permission: CeilingPermission
): boolean => {
  // A permission with no fields grants nothing
  if (hasNoFields(permission)) {
    return true;
  }

  const matching = findMatchingPermissions(userPermissions, permission.action, permission.subject);

  if (matching.length === 0) {
    return false;
  }

  const restrictedProperties = [
    ...new Set([
      ...Object.keys(permission.properties ?? {}),
      ...matching.flatMap((perm) => Object.keys(perm.properties ?? {})),
    ]),
  ];

  const propertyCombinations = combineValues(
    restrictedProperties
      .map((property): [string, (string | null)[]] => [
        property,
        getPropertyValues(permission, property),
      ])
      .filter(([, values]) => values.length > 0)
  );

  const requestedConditions = permission.conditions ?? [];
  const conditions: (string | null)[] =
    requestedConditions.length === 0 ? [null] : [...new Set(requestedConditions)];

  return conditions.every((condition) =>
    propertyCombinations.every((properties) =>
      matching.some((perm) => coversAtom(perm, { properties, condition }))
    )
  );
};

/* -------------------------------------------------------------------------------------------------
 * Selection
 * -----------------------------------------------------------------------------------------------*/

/**
 * The dotted paths of the `true` leaves of a property form (`{ seo: { title: true } }` gives
 * `seo.title`), like `formatPermissionsForAPI` does.
 */
const collectSelectedPaths = (value: unknown, prefix = ''): string[] => {
  if (!isObject(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, child]) => {
    if (isObject(child)) {
      return collectSelectedPaths(child, `${prefix}${key}.`);
    }

    return child === true ? [`${prefix}${key}`] : [];
  });
};

/**
 * Reads the selection out of the form of one action and subject
 * (`modifiedData.collectionTypes[subject][action]`).
 */
export const getActionSelection = (actionForm: unknown): Selection => {
  if (!isObject(actionForm)) {
    return EMPTY_SELECTION;
  }

  const form = actionForm as { properties?: unknown; conditions?: unknown };
  const properties: Record<string, string[]> = {};

  if (isObject(form.properties)) {
    Object.entries(form.properties).forEach(([property, propertyForm]) => {
      if (property === 'enabled') {
        return;
      }

      const selected = collectSelectedPaths(propertyForm);

      if (selected.length > 0) {
        properties[property] = selected;
      }
    });
  }

  const conditions = isObject(form.conditions)
    ? Object.entries(form.conditions)
        .filter(([, selected]) => selected === true)
        .map(([condition]) => condition)
    : [];

  return { properties, conditions };
};

/**
 * The form of `action` on `subject`, whichever kind of content type it is.
 */
export const findActionForm = (
  modifiedData: unknown,
  subject: string | null | undefined,
  action: string
): unknown => {
  if (!isObject(modifiedData) || !subject) {
    return undefined;
  }

  const data = modifiedData as Record<string, Record<string, Record<string, unknown>> | undefined>;

  return data.collectionTypes?.[subject]?.[action] ?? data.singleTypes?.[subject]?.[action];
};

/**
 * Whether `value` (or one of its nested fields) is already ticked for `property`.
 */
export const isValueSelected = (selection: Selection, property: string, value: string): boolean =>
  (selection.properties[property] ?? []).some(
    (selected) => selected === value || selected.startsWith(`${value}.`)
  );

const withValue = (selection: Selection, property: string, value: string): Selection => ({
  ...selection,
  properties: { ...selection.properties, [property]: [value] },
});

/**
 * The atoms of a selection: the cartesian product of the ticked values of every property with
 * at least one, times the ticked conditions (none gives atoms without a condition).
 */
const getAtoms = (selection: Selection): SelectionAtom[] => {
  const propertyCombinations = combineValues(
    Object.entries(selection.properties).filter(([, values]) => values.length > 0)
  );

  if (selection.conditions.length === 0) {
    return propertyCombinations.map((properties) => ({ properties }));
  }

  return propertyCombinations.flatMap((properties) =>
    selection.conditions.map((condition) => ({ properties, condition }))
  );
};

const isCoveredBy = (matching: AuthPermission[], atom: SelectionAtom): boolean =>
  matching.some((perm) => coversAtom(perm, atom));

/**
 * Whether `value` of `property` can be added to `selection`: every combination of the value
 * with the other ticked properties and conditions must be covered by one held permission.
 */
export const canTick = (
  userPermissions: AuthPermission[],
  action: string,
  subject: string | null | undefined,
  selection: Selection,
  property: string,
  value: string
): boolean => {
  const matching = findMatchingPermissions(userPermissions, action, subject);

  if (!matching.some((perm) => coversPropertyValue(perm, property, value))) {
    return false;
  }

  return getAtoms(withValue(selection, property, value)).every((atom) =>
    isCoveredBy(matching, atom)
  );
};

/**
 * The conditions the user may set on `action` / `subject` given what is ticked. Returns
 * `undefined` when the user is not restricted (super admin, or an unconditional held permission
 * covers the whole selection), otherwise the conditions under which every combination of the
 * selection is covered by a held permission. The server accepts any non-empty subset of them.
 */
export const getAllowedConditions = (
  userPermissions: AuthPermission[] | undefined,
  action: string,
  subject: string | null | undefined,
  selection: Selection = EMPTY_SELECTION
): string[] | undefined => {
  if (userPermissions === undefined) {
    return undefined;
  }

  const matching = findMatchingPermissions(userPermissions, action, subject);
  const atoms = getAtoms({ ...selection, conditions: [] });

  const unconditional = matching.filter(isUnconditional);

  if (atoms.every((atom) => isCoveredBy(unconditional, atom))) {
    return undefined;
  }

  const candidates = [...new Set(matching.flatMap((perm) => perm.conditions ?? []))];

  return candidates.filter((condition) =>
    atoms.every((atom) => isCoveredBy(matching, { ...atom, condition }))
  );
};

/* -------------------------------------------------------------------------------------------------
 * Bulk updates
 * -----------------------------------------------------------------------------------------------*/

export type LeafChecker = (path: string[]) => boolean;

interface Leaf {
  property: string;
  value: string;
}

/**
 * Turns a path within an action form (`['properties', 'fields', 'seo', 'title']`) into a
 * property leaf, `'enabled'` for the on/off switch of an action without properties, or
 * `undefined` for anything else.
 */
const isLeaf = (leaf: Leaf | 'enabled' | undefined): leaf is Leaf => typeof leaf === 'object';

const toLeaf = (path: string[]): Leaf | 'enabled' | undefined => {
  if (path[0] !== 'properties' || path.length < 3) {
    return path[1] === 'enabled' ? 'enabled' : undefined;
  }

  return { property: path[1], value: path.slice(2).join('.') };
};

const collectLeafPaths = (value: unknown, prefix: string[] = []): string[][] => {
  if (!isObject(value)) {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, child]) =>
    prefix.length === 0 && key === 'conditions' ? [] : collectLeafPaths(child, [...prefix, key])
  );
};

const coversSelection = (held: AuthPermission, selection: Selection): boolean =>
  Object.entries(selection.properties).every(([property, values]) =>
    values.every((value) => coversPropertyValue(held, property, value))
  ) && selection.conditions.every((condition) => coversCondition(held, condition));

interface BulkPermissionCheckerOptions {
  userPermissions: AuthPermission[] | undefined;
  action: string;
  subject: string | null | undefined;
  /** The form of the action before the update, to read the current selection from. */
  actionForm: unknown;
  /** The part of the action form being updated, and its path within the action form. */
  scope: unknown;
  scopePath: string[];
  value: boolean;
}

/**
 * Creates the leaf checker `updateValuesWithPermissions` consults, for a bulk tick of part of
 * one action (paths are relative to `scope`). Returns `undefined` when the user is not
 * restricted (super admin), which turns the bulk update into a plain one.
 *
 * Unticking only ever narrows, so it is allowed for every value the user holds. Ticking keeps a
 * running selection so that every tick stays grantable with the ones before it, in two passes:
 * 1. Anchor: the held permission covering the current selection and the most leaves of the
 *    scope is picked first, and every leaf it covers is ticked. Without it, ticking leaf by
 *    leaf could pick `title` from one permission and `body` from another and then no locale.
 * 2. Extend: the remaining leaves are ticked when they can be added to the selection so far.
 */
export const createBulkPermissionChecker = ({
  userPermissions,
  action,
  subject,
  actionForm,
  scope,
  scopePath,
  value,
}: BulkPermissionCheckerOptions): LeafChecker | undefined => {
  if (userPermissions === undefined) {
    return undefined;
  }

  const leafOf = (path: string[]) => toLeaf([...scopePath, ...path]);

  if (value === false) {
    return (path) => {
      const leaf = leafOf(path);

      return isLeaf(leaf)
        ? isPermissionHeld(userPermissions, action, subject, leaf.property, leaf.value)
        : isPermissionHeld(userPermissions, action, subject);
    };
  }

  const matching = findMatchingPermissions(userPermissions, action, subject);
  let selection = getActionSelection(actionForm);

  const leaves = collectLeafPaths(scope)
    .map((path) => leafOf(path))
    .filter(isLeaf);

  const anchor = matching
    .filter((perm) => coversSelection(perm, selection))
    .map((perm) => leaves.filter((leaf) => coversPropertyValue(perm, leaf.property, leaf.value)))
    .reduce<Leaf[]>((best, covered) => (covered.length > best.length ? covered : best), []);

  const select = (leaf: Leaf) => {
    const values = selection.properties[leaf.property] ?? [];

    selection = {
      ...selection,
      properties: { ...selection.properties, [leaf.property]: [...values, leaf.value] },
    };
  };

  // The anchored leaves count as selected from the start, so the leaves walked before them
  // are checked against them too
  anchor.forEach(select);

  return (path) => {
    const leaf = leafOf(path);

    if (!isLeaf(leaf)) {
      return isPermissionHeld(userPermissions, action, subject);
    }

    if (isValueSelected(selection, leaf.property, leaf.value)) {
      return true;
    }

    if (canTick(userPermissions, action, subject, selection, leaf.property, leaf.value)) {
      select(leaf);

      return true;
    }

    return false;
  };
};

interface SubjectBulkPermissionCheckerOptions {
  userPermissions: AuthPermission[] | undefined;
  subject: string | null | undefined;
  /** The forms of every action of the subject, keyed by action id. */
  subjectForm: unknown;
  value: boolean;
}

/**
 * Same as {@link createBulkPermissionChecker} for a bulk tick spanning several actions (a
 * whole content type, or a plugin / settings section whose `subject` is `null`). The first
 * segment of every path is the action id.
 */
export const createSubjectBulkPermissionChecker = ({
  userPermissions,
  subject,
  subjectForm,
  value,
}: SubjectBulkPermissionCheckerOptions): LeafChecker | undefined => {
  if (userPermissions === undefined) {
    return undefined;
  }

  const checkers: Record<string, LeafChecker> = {};
  const forms = isObject(subjectForm) ? (subjectForm as Record<string, unknown>) : {};

  return ([action, ...path]) => {
    if (action === undefined) {
      return false;
    }

    if (!checkers[action]) {
      checkers[action] = createBulkPermissionChecker({
        userPermissions,
        action,
        subject,
        actionForm: forms[action],
        scope: forms[action],
        scopePath: [],
        value,
      })!;
    }

    return checkers[action](path);
  };
};
