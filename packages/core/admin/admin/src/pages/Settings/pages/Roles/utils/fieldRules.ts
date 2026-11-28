import get from 'lodash/get';

import { createArrayOfValues } from './createArrayOfValues';

import type { LeafChecker } from './createPermissionChecker';
import type { PropertyForm } from './forms';
import type { Subject, SubjectProperty } from '../../../../../../../shared/contracts/permissions';

/**
 * What a layout asks of the form beyond the checkboxes of the Roles page, opt-in:
 * `SubjectProperty.disabledActions`: the cell of the action is off and disabled. It has no value
 * in the form (see `createDefaultPropertiesForm`), so counts, bulk ticks and the sent rows leave
 * it out; `createFieldRulesChecker` guards the one bulk path that could add it.
 */

type PropertyRule = Pick<SubjectProperty, 'children' | 'disabledActions'>;

/**
 * Whether the cell of an action on a property is disabled by the layout: the property or one of
 * its ancestors lists the action (`ancestorDisabled`), or it is a group and every cell under it
 * is disabled.
 */
const isCellDisabledByLayout = (
  property: PropertyRule,
  actionId: string,
  ancestorDisabled = false
): boolean => {
  const isDisabled = ancestorDisabled || !!property.disabledActions?.includes(actionId);

  if (isDisabled || !property.children?.length) {
    return isDisabled;
  }

  return property.children.every((child) => isCellDisabledByLayout(child, actionId));
};

const hasDisabledActions = (properties: SubjectProperty[] = []): boolean =>
  properties.some(
    (property) => !!property.disabledActions?.length || hasDisabledActions(property.children)
  );

const subjectsWithRules = new WeakMap<Subject, boolean>();

/**
 * Whether the layout of a content type disables the cell of any action.
 */
const hasFieldRules = (subject: Subject | undefined): subject is Subject => {
  if (subject === undefined) {
    return false;
  }

  let hasRules = subjectsWithRules.get(subject);

  if (hasRules === undefined) {
    hasRules = hasDisabledActions(subject.properties);
    subjectsWithRules.set(subject, hasRules);
  }

  return hasRules;
};

/**
 * Whether the layout disables the cell of an action for a field (`['seo', 'title']` is `title` in
 * the group `seo`): the property, one of the groups or the field lists the action.
 */
const isFieldDisabledByLayout = (
  subject: Subject,
  actionId: string,
  property: string,
  fieldPath: string[]
): boolean => {
  const root = subject.properties.find(({ value }) => value === property);
  let isDisabled = !!root?.disabledActions?.includes(actionId);
  let children = root?.children;

  for (const segment of fieldPath) {
    const node = children?.find(({ value }) => value === segment);

    if (node === undefined) {
      break;
    }

    isDisabled = isDisabled || !!node.disabledActions?.includes(actionId);
    children = node.children;
  }

  return isDisabled;
};

interface FieldRulesCheckerOptions {
  /** The layout of the content type, `undefined` for plugins and settings. */
  subject: Subject | undefined;
  actionId: string;
  /** The part of the action form being updated, as a path within the action form. */
  scopePath: string[];
}

/**
 * Creates the leaf checker `updateValuesWithPermissions` consults, for a bulk update of part of
 * one action (paths are relative to the scope): a value the layout disables is never changed.
 *
 * Returns `undefined` when the layout disables nothing, which leaves the bulk update to the other
 * checkers (the user's ceiling) or makes it a plain one.
 */
const createFieldRulesChecker = ({
  subject,
  actionId,
  scopePath,
}: FieldRulesCheckerOptions): LeafChecker | undefined => {
  if (!hasFieldRules(subject)) {
    return undefined;
  }

  return (path) => {
    const [root, property, ...fieldPath] = [...scopePath, ...path];

    if (root !== 'properties' || property === undefined || fieldPath.length === 0) {
      return true;
    }

    return !isFieldDisabledByLayout(subject, actionId, property, fieldPath);
  };
};

interface SubjectFieldRulesCheckerOptions {
  subject: Subject | undefined;
}

/**
 * Same as {@link createFieldRulesChecker} for a bulk update of a whole content type: the first
 * segment of every path is the action id.
 */
const createSubjectFieldRulesChecker = ({
  subject,
}: SubjectFieldRulesCheckerOptions): LeafChecker | undefined => {
  if (!hasFieldRules(subject)) {
    return undefined;
  }

  const checkers: Record<string, LeafChecker | undefined> = {};

  return ([actionId, ...path]) => {
    if (actionId === undefined) {
      return true;
    }

    if (!(actionId in checkers)) {
      checkers[actionId] = createFieldRulesChecker({ subject, actionId, scopePath: [] });
    }

    return checkers[actionId]?.(path) ?? true;
  };
};

/**
 * Puts leaf checkers together: a leaf is updated when every one of them allows it. They are
 * asked in order and the first to refuse ends it, so put the stateless ones first (a checker of
 * the user's ceiling keeps a running selection of what it allowed).
 */
const composeLeafCheckers = (
  ...checkers: Array<LeafChecker | undefined>
): LeafChecker | undefined => {
  const defined = checkers.filter((checker): checker is LeafChecker => checker !== undefined);

  if (defined.length < 2) {
    return defined[0];
  }

  return (path) => defined.every((checker) => checker(path));
};

interface RequiredField {
  /** The dotted path of the field. */
  path: string;
  /** Whether the layout disables the cell of the action for it. */
  isDisabled: boolean;
}

const listRequiredFields = (
  children: SubjectProperty[] = [],
  actionId: string,
  prefix = '',
  ancestorDisabled = false
): RequiredField[] =>
  children.flatMap((child) => {
    const path = `${prefix}${child.value}`;
    const isDisabled = ancestorDisabled || !!child.disabledActions?.includes(actionId);

    if (child.children) {
      return listRequiredFields(child.children, actionId, `${path}.`, isDisabled);
    }

    return child.required ? [{ path, isDisabled }] : [];
  });

/**
 * The required fields of a property that an action granted on a content type cannot set: the
 * layout disables the cell of the action for them, or they are not ticked. Empty when the action
 * is not granted at all.
 */
const getMissingRequiredFields = (
  children: SubjectProperty[] | undefined,
  propertyName: string,
  actionId: string,
  actionForm: unknown
): string[] => {
  const { properties } = (actionForm ?? {}) as Partial<PropertyForm>;

  if (!createArrayOfValues(properties).some(Boolean)) {
    return [];
  }

  return listRequiredFields(children, actionId)
    .filter(
      ({ path, isDisabled }) =>
        isDisabled || get(properties, [propertyName, ...path.split('.')]) !== true
    )
    .map(({ path }) => path);
};

export {
  composeLeafCheckers,
  createFieldRulesChecker,
  createSubjectFieldRulesChecker,
  getMissingRequiredFields,
  isCellDisabledByLayout,
};
