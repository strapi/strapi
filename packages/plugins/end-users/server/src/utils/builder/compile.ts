import type { Core, Modules } from '@strapi/types';

import { PROFILE_UID, USER_UID } from '../../constants';
import {
  NEGATING_OPERATORS,
  PATTERN_OPERATORS,
  operatorsFor,
} from '../../../../shared/builder/operators';
import type { FilterableType } from '../../../../shared/builder/operators';
import { DATE, DATETIME, TIME, VALUE_KINDS, valueProblem } from '../../../../shared/builder/values';
import {
  attributeOf,
  filterableType,
  hasOwn,
  isPlain,
  isPrivate,
  schemaOf,
  userRelationTypes,
} from './check';
import type { Plain } from './check';
import type {
  AppliesTo,
  BuilderConditionV2,
  BuilderInput,
  BuilderValue,
  EntryGroup,
  FieldAccepts,
  FieldTarget,
  WhoCheck,
} from '../../../../shared/builder/types';

type ContentApiConditionDefinition = Modules.ContentAPI.ContentApiConditionDefinition;
type ConditionContext = Modules.ContentAPI.ConditionContext;
type Filter = Record<string, unknown>;

/** Attributes every entry has, whether or not the schema lists them */
const SYSTEM_FIELDS = ['documentId', 'createdAt', 'updatedAt', 'publishedAt'];

const DATE_TYPES: readonly string[] = ['date', 'datetime', 'time'];

/** What a date input accepts: a date or a date and time, not a time of day (it can't be compared with `now`) */
const DATE_INPUT_TYPES: readonly string[] = ['date', 'datetime'];

const UNIT_MS = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 } as const;

/** What the query throws when a part of the condition can't be built: the condition is then false */
class Unbuildable extends Error {}

const ownValue = (object: unknown, key: string): unknown =>
  isPlain(object) && hasOwn(object, key) ? object[key] : undefined;

const TO_ONE_RELATIONS: readonly string[] = ['oneToOne', 'manyToOne', 'oneWay'];

/** A relation that holds several entries (every kind that isn't to-one, so a new kind fails closed) */
export const isToMany = (attribute: Plain): boolean =>
  attribute.type === 'relation' && !TO_ONE_RELATIONS.includes(String(attribute.relation));

// --- Values ---------------------------------------------------------------------------------

const offsetDate = (now: Date, value: Extract<BuilderValue, { kind: 'now' }>): Date => {
  const base = new Date(now);
  const { offset } = value;

  if (!offset) {
    return base;
  }

  return new Date(base.getTime() + offset.amount * UNIT_MS[offset.unit]);
};

const nowIso = (ctx: ConditionContext, value: Extract<BuilderValue, { kind: 'now' }>): string => {
  const date = offsetDate(ctx.now, value);

  if (Number.isNaN(date.getTime())) {
    throw new Unbuildable('no valid current time');
  }

  return date.toISOString();
};

/** A value as it goes into the filter: fixed values as they are, the rest as placeholders */
const filterValue = (ctx: ConditionContext, value: BuilderValue | undefined): unknown => {
  if (!value) {
    throw new Unbuildable('a check has no value');
  }

  switch (value.kind) {
    case 'fixed':
      return Array.isArray(value.value) ? [...value.value] : value.value;
    case 'input':
      return `$params.${value.name}`;
    case 'user':
      return `$user.${value.attribute}`;
    case 'profile':
      return `$profile.${value.attribute}`;
    case 'now':
      return nowIso(ctx, value);
    default:
      throw new Unbuildable('unknown value');
  }
};

// --- Who checks, evaluated in the function -----------------------------------------------------

const scalar = (value: unknown): unknown => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }

  return typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number'
    ? value
    : undefined;
};

/**
 * What a Who check reads of the user or the profile: `undefined` when there is nothing to read (no
 * profile, an attribute that isn't there), and `null` when the attribute is there and empty. Only
 * the second can be "is empty": a value that is missing makes every Who check false.
 */
const read = (value: unknown): unknown => (value === null ? null : scalar(value));

const userAttribute = (ctx: ConditionContext, path: string): unknown => {
  const { user } = ctx;

  if (!user) {
    return undefined;
  }

  if (path === 'roles.documentId') {
    return Array.isArray(user.roles)
      ? user.roles
          .map((role) => ownValue(role, 'documentId'))
          .filter((id) => typeof id === 'string')
      : undefined;
  }

  return path.includes('.') ? undefined : read(ownValue(user, path));
};

const profileAttribute = (ctx: ConditionContext, path: string): unknown => {
  const profile = ctx.user?.profile;

  if (!isPlain(profile)) {
    return undefined;
  }

  const [name, rest, ...more] = path.split('.');

  if (more.length > 0 || (rest !== undefined && rest !== 'documentId')) {
    return undefined;
  }

  const value = ownValue(profile, name);

  if (rest === undefined) {
    return read(value);
  }

  // A to-one relation that is empty is empty; one that isn't loaded is missing
  return value === null ? null : read(ownValue(value, 'documentId'));
};

/** The value to compare with, read from the context; undefined when there is none */
const runtimeValue = (ctx: ConditionContext, value: BuilderValue | undefined): unknown => {
  switch (value?.kind) {
    case 'fixed':
      return value.value;
    case 'input':
      return scalar(ownValue(ctx.params, value.name));
    case 'user':
      return userAttribute(ctx, value.attribute);
    case 'profile':
      return profileAttribute(ctx, value.attribute);
    case 'now':
      return nowIso(ctx, value);
    default:
      return undefined;
  }
};

const POSITIVE: Record<string, string> = {
  $ne: '$eq',
  $notIn: '$in',
  $notContains: '$contains',
  $notContainsi: '$containsi',
};

const PATTERNS: readonly string[] = ['$contains', '$containsi', '$startsWith', '$endsWith'];

type Comparable = number | bigint | string | boolean;

const DAY_MS = 86_400_000;

const isoDay = (text: string): number => {
  const [year, month, day] = text.split('-').map(Number);

  return Date.UTC(year, month - 1, day);
};

/**
 * A stored value or a value to compare it with, as the field's own type reads it, so that two
 * values compare by what they mean and never by how they are written: a biginteger as a BigInt (the
 * database gives it as a string), a date and a date and time as an instant, a time as the
 * milliseconds since midnight, a number as a number, a text as a text. `undefined` when it isn't one
 * (a text that isn't a date, a number where a text is read): the check is then false. Never
 * `Date.parse` on a text that isn't written as a date.
 */
const comparable = (type: FilterableType, value: unknown): Comparable | undefined => {
  switch (type) {
    case 'integer':
    case 'float':
    case 'decimal': {
      if (typeof value === 'number') {
        return Number.isFinite(value) ? value : undefined;
      }

      // A decimal is a string on some databases
      return typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value) ? Number(value) : undefined;
    }
    case 'biginteger': {
      if (typeof value === 'string') {
        return /^-?\d+$/.test(value) ? BigInt(value) : undefined;
      }

      return typeof value === 'number' && Number.isSafeInteger(value) ? BigInt(value) : undefined;
    }
    case 'date': {
      if (typeof value !== 'string') {
        return undefined;
      }

      if (DATE.test(value)) {
        return isoDay(value);
      }

      // A date and time (`now`) read as the day it falls on
      return DATETIME.test(value) && !Number.isNaN(Date.parse(value))
        ? Math.floor(Date.parse(value) / DAY_MS) * DAY_MS
        : undefined;
    }
    case 'datetime':
      return typeof value === 'string' && DATETIME.test(value) && !Number.isNaN(Date.parse(value))
        ? Date.parse(value)
        : undefined;
    case 'time': {
      if (typeof value !== 'string' || !TIME.test(value)) {
        return undefined;
      }

      const [clock, fraction = ''] = value.split('.');
      const [hours, minutes, seconds = '0'] = clock.split(':');

      return (
        ((Number(hours) * 60 + Number(minutes)) * 60 + Number(seconds)) * 1000 +
        Number(fraction.padEnd(3, '0'))
      );
    }
    case 'boolean':
      return typeof value === 'boolean' ? value : undefined;
    default:
      return typeof value === 'string' ? value : undefined;
  }
};

const order = (left: Comparable, right: Comparable): number | undefined => {
  if (typeof left === 'string' && typeof right === 'string') {
    return left.localeCompare(right);
  }

  if (
    (typeof left === 'number' && typeof right === 'number') ||
    (typeof left === 'bigint' && typeof right === 'bigint')
  ) {
    if (left === right) {
      return 0;
    }

    return left < right ? -1 : 1;
  }

  return undefined;
};

/** undefined when the operands can't be compared with the operator: the check is then false */
const holdsPositive = (
  type: FilterableType,
  left: unknown,
  operator: string,
  right: unknown
): boolean | undefined => {
  if (PATTERNS.includes(operator)) {
    if (typeof left !== 'string' || typeof right !== 'string' || right === '') {
      return undefined;
    }

    const a = operator === '$containsi' ? left.toLowerCase() : left;
    const b = operator === '$containsi' ? right.toLowerCase() : right;

    if (operator === '$startsWith') {
      return a.startsWith(b);
    }

    return operator === '$endsWith' ? a.endsWith(b) : a.includes(b);
  }

  const l = comparable(type, left);

  if (l === undefined) {
    return undefined;
  }

  if (operator === '$in') {
    if (!Array.isArray(right)) {
      return undefined;
    }

    const items = right.map((item) => comparable(type, item));

    return items.includes(undefined) ? undefined : items.some((item) => item === l);
  }

  const r = comparable(type, right);

  if (r === undefined) {
    return undefined;
  }

  if (operator === '$eq') {
    return l === r;
  }

  const sign = order(l, r);

  if (sign === undefined) {
    return undefined;
  }

  switch (operator) {
    case '$lt':
      return sign < 0;
    case '$lte':
      return sign <= 0;
    case '$gt':
      return sign > 0;
    case '$gte':
      return sign >= 0;
    default:
      return undefined;
  }
};

/**
 * One Who check of an attribute of `type`. A value that is missing (`undefined`: no profile, an
 * attribute that isn't there) is false for every operator, "is empty" included; one that is `null`
 * is empty, which only the null operators and nothing else can hold.
 */
const holds = (type: FilterableType, left: unknown, operator: string, right: unknown): boolean => {
  if (left === undefined) {
    return false;
  }

  const empty = left === null;

  if (operator === '$null' || operator === '$notNull') {
    if (typeof right !== 'boolean') {
      return false;
    }

    return operator === '$null' ? empty === right : empty !== right;
  }

  if (empty) {
    return false;
  }

  const negating = NEGATING_OPERATORS.includes(operator);
  const positive = negating ? POSITIVE[operator] : operator;
  // A list (the role ids) is held when any element is, or, for a negating operator, when none is
  const result = Array.isArray(left)
    ? left.some((item) => holdsPositive(type, item, positive, right))
    : holdsPositive(type, left, positive, right);

  if (result === undefined) {
    return false;
  }

  if (!negating) {
    return result;
  }

  if (Array.isArray(left)) {
    return !left.some((item) => holdsPositive(type, item, positive, right));
  }

  return !result;
};

/** The type a Who check's attribute has, which the check compares by; undefined when the project no longer has it */
const whoAttributeType = (
  strapi: Core.Strapi,
  source: 'user' | 'profile',
  attribute: string
): FilterableType | undefined => {
  const [head, rest, ...more] = attribute.split('.');

  if (more.length > 0) {
    return undefined;
  }

  if (source === 'user') {
    if (head === 'documentId' || (head === 'roles' && rest === 'documentId')) {
      return 'string';
    }

    return rest === undefined
      ? filterableType(attributeOf(schemaOf(strapi, USER_UID), head))
      : undefined;
  }

  if (rest !== undefined) {
    const relation = attributeOf(schemaOf(strapi, PROFILE_UID), head)?.type === 'relation';

    return relation && rest === 'documentId' ? 'string' : undefined;
  }

  return filterableType(attributeOf(schemaOf(strapi, PROFILE_UID), head));
};

const whoCheckHolds = (strapi: Core.Strapi, ctx: ConditionContext, check: WhoCheck): boolean => {
  switch (check.kind) {
    case 'attribute': {
      const left =
        check.source === 'user'
          ? userAttribute(ctx, check.attribute)
          : profileAttribute(ctx, check.attribute);

      const type = whoAttributeType(strapi, check.source, check.attribute);

      // An attribute the project no longer has can't be compared: false
      return type === undefined
        ? false
        : holds(type, left, check.operator, runtimeValue(ctx, check.value));
    }
    case 'roles': {
      const roles: unknown = ctx.user?.roles;

      if (!Array.isArray(roles)) {
        return false;
      }

      const names = roles
        .map((role) => ownValue(role, 'name'))
        .filter((n) => typeof n === 'string');
      const hit = names.some((name) => check.roles.includes(name as string));

      return check.match === 'any' ? hit : !hit;
    }
    case 'email-verified': {
      const verified = ownValue(ctx.user, 'emailVerified');

      return typeof verified === 'boolean' && verified === check.value;
    }
    default:
      return false;
  }
};

// --- Entry checks, built into the filter -------------------------------------------------------

export const matchesAccepts = (
  attribute: Record<string, unknown>,
  accepts: FieldAccepts | undefined
): boolean => {
  const { type } = attribute;

  if (typeof accepts === 'object' && accepts !== null) {
    return type === 'relation' && attribute.target === accepts.relation;
  }

  if (typeof type !== 'string' || !(type in VALUE_KINDS)) {
    return false;
  }

  const kind = VALUE_KINDS[type as FilterableType];

  switch (accepts) {
    case 'text':
      return kind === 'string' && !DATE_TYPES.includes(type);
    case 'date':
      return DATE_INPUT_TYPES.includes(type);
    case 'number':
      return kind === 'number';
    case 'boolean':
      return kind === 'boolean';
    default:
      return false;
  }
};

const nest = (keys: string[], leaf: unknown): unknown =>
  keys.reduceRight<unknown>((inner, key) => ({ [key]: inner }), leaf);

export const compileBuilderCondition = (
  strapi: Core.Strapi,
  condition: BuilderConditionV2
): ContentApiConditionDefinition => {
  const inputs = new Map<string, BuilderInput>(
    condition.inputs.map((input) => [input.name, input])
  );

  const whoValues = condition.who.checks.flatMap((check) =>
    check.kind === 'attribute' ? [check.value] : []
  );
  const entryValues: Array<BuilderValue | undefined> = [];

  const collect = (group: EntryGroup) => {
    for (const item of group.items) {
      if (item.kind === 'group') {
        collect(item);
      } else {
        entryValues.push(item.value);
      }
    }
  };

  collect(condition.which);

  const values = [...whoValues, ...entryValues];
  const usesProfile =
    condition.who.checks.some(
      (check) => check.kind === 'attribute' && check.source === 'profile'
    ) || values.some((value) => value?.kind === 'profile');
  const readsUser =
    condition.who.checks.length > 0 ||
    condition.onSave.stamp.length > 0 ||
    usesProfile ||
    values.some((value) => value?.kind === 'user');

  /**
   * The keys of the target on the type being asked, checked here because the file was checked when
   * it was saved, not against the types the project has now. `negated` is a negating operator or a
   * `none` group: it can't cross a to-many relation (it would mean "some entry is not", not "none is").
   */
  /**
   * Whether a check made for the saved types still fits this field, whatever the value's source: the
   * operator is one the field's type offers, and the value is of the field's kind (a fixed value
   * through the shared value rules, enumeration values included; an input by its declared kind; a
   * user or profile value by that attribute's type; now only for a date). A mismatch denies: under a
   * negating operator it would otherwise match every entry of the type.
   */
  const valueFits = (
    type: FilterableType,
    attribute: Plain,
    check: { operator: string; value?: BuilderValue }
  ): boolean => {
    if (!operatorsFor(type).includes(check.operator)) {
      return false;
    }

    const { value } = check;
    const enumValues = Array.isArray(attribute.enum)
      ? attribute.enum.filter((item): item is string => typeof item === 'string')
      : undefined;

    if (!value || value.kind === 'fixed') {
      return valueProblem(type, check.operator, value?.value, enumValues) === null;
    }

    // A pattern is a text, whatever the field
    const wanted = PATTERN_OPERATORS.includes(check.operator) ? 'string' : VALUE_KINDS[type];

    switch (value.kind) {
      case 'input': {
        const kind = inputs.get(value.name)?.kind;

        if (kind === 'text') {
          return wanted === 'string';
        }

        return (kind === 'number' || kind === 'boolean') && kind === wanted;
      }
      case 'user':
      case 'profile': {
        const source = whoAttributeType(strapi, value.kind, value.attribute);

        return source !== undefined && VALUE_KINDS[source] === wanted;
      }
      case 'now':
        return type === 'date' || type === 'datetime';
      default:
        return false;
    }
  };

  const targetKeys = (
    ctx: ConditionContext,
    target: FieldTarget,
    negated: boolean,
    check: { operator: string; value?: BuilderValue }
  ): string[] => {
    if ('path' in target) {
      let schema = schemaOf(strapi, ctx.uid);

      for (const [index, hop] of target.path.entries()) {
        const attribute = attributeOf(schema, hop);
        const last = index === target.path.length - 1;

        if (!schema || (!attribute && !(last && SYSTEM_FIELDS.includes(hop)))) {
          throw new Unbuildable('no such field');
        }

        if (attribute) {
          if (isPrivate(schema, hop)) {
            throw new Unbuildable('private field');
          }

          if (negated && isToMany(attribute)) {
            throw new Unbuildable('negation across a to-many relation');
          }

          // A type added later may hold the same name with another type: the check was
          // made for the saved types, so here it denies rather than send the database a filter the
          // field can't take
          const type = last ? filterableType(attribute) : undefined;

          if (type && !valueFits(type, attribute, check)) {
            throw new Unbuildable('a field of another type');
          }

          schema =
            typeof attribute.target === 'string' ? schemaOf(strapi, attribute.target) : undefined;
        }
      }

      return target.path;
    }

    const input = inputs.get(target.input);
    const name: unknown = ownValue(ctx.params, target.input);

    // The name is the caller's: only an attribute the type has, of the kind the input accepts
    if (!input || typeof name !== 'string' || name === '') {
      throw new Unbuildable('no field named');
    }

    const schema = schemaOf(strapi, ctx.uid);
    const attribute = attributeOf(schema, name);

    if (
      !schema ||
      !attribute ||
      isPrivate(schema, name) ||
      !matchesAccepts(attribute, input.accepts)
    ) {
      throw new Unbuildable('field not accepted');
    }

    if (negated && isToMany(attribute)) {
      throw new Unbuildable('negation across a to-many relation');
    }

    return attribute.type === 'relation' ? [name, 'documentId'] : [name];
  };

  const buildGroup = (
    ctx: ConditionContext,
    group: EntryGroup,
    inNone: boolean,
    root: boolean
  ): Filter | null => {
    // An empty "any of" inside another group matches nothing: dropping it would widen access
    if (group.items.length === 0 && group.match === 'any' && !root) {
      throw new Unbuildable('an empty any group');
    }

    const none = inNone || group.match === 'none';
    const parts = group.items
      .map((item) => {
        if (item.kind === 'group') {
          return buildGroup(ctx, item, none, false);
        }

        const keys = targetKeys(
          ctx,
          item.target,
          none || NEGATING_OPERATORS.includes(item.operator),
          item
        );

        return nest(keys, { [item.operator]: filterValue(ctx, item.value) }) as Filter;
      })
      .filter((part): part is Filter => part !== null);

    // A group with nothing in it asks nothing
    if (parts.length === 0) {
      return null;
    }

    switch (group.match) {
      case 'all':
        return { $and: parts };
      case 'any':
        return { $or: parts };
      default:
        return { $not: { $or: parts } };
    }
  };

  const whoHolds = (ctx: ConditionContext): boolean => {
    const { checks, match } = condition.who;

    if (checks.length === 0) {
      return true;
    }

    return match === 'all'
      ? checks.every((check) => whoCheckHolds(strapi, ctx, check))
      : checks.some((check) => whoCheckHolds(strapi, ctx, check));
  };

  const params: NonNullable<ContentApiConditionDefinition['params']> = {};

  for (const input of condition.inputs) {
    const declared: Modules.ContentAPI.ContentApiConditionParam = {
      type: { text: 'string', number: 'number', boolean: 'boolean', field: 'attribute' }[
        input.kind
      ] as 'string',
    };

    if (input.kind === 'field' && typeof input.accepts === 'object') {
      declared.relationTarget = input.accepts.relation;
    }

    if (input.required) {
      declared.required = true;
    }

    if (input.default !== undefined) {
      declared.default = input.default;
    }

    params[input.name] = declared;
  }

  const subjectsFor = (appliesTo: AppliesTo): ContentApiConditionDefinition['subjects'] => {
    switch (appliesTo.kind) {
      case 'types':
        return [...appliesTo.types];
      case 'user-relation':
        return (uid: string) => {
          const schema = schemaOf(strapi, uid);

          return Object.entries(schema?.attributes ?? {}).some(
            ([name, attribute]) =>
              schema !== undefined &&
              isPlain(attribute) &&
              attribute.type === 'relation' &&
              attribute.target === USER_UID &&
              !isPrivate(schema, name)
          );
        };
      default:
        return undefined;
    }
  };

  const definition: ContentApiConditionDefinition = {
    name: `api::${condition.slug}`,
    displayName: condition.displayName,
    params,
    usesProfile,
    query(ctx) {
      if (readsUser && !ctx.user) {
        return false;
      }

      try {
        if (!whoHolds(ctx)) {
          return false;
        }

        return buildGroup(ctx, condition.which, false, true) ?? true;
      } catch (error) {
        if (error instanceof Unbuildable) {
          return false;
        }

        throw error;
      }
    },
    lockedFields: () => [...condition.onSave.locked],
    source: 'builder',
  };

  const subjects = subjectsFor(condition.appliesTo);

  if (subjects) {
    definition.subjects = subjects;
  }

  if (condition.onSave.stamp.length > 0) {
    definition.stamp = (ctx) => {
      const documentId = ctx.user?.documentId;

      if (!ctx.user) {
        return null;
      }

      const stamped: Filter = {};

      for (const rule of condition.onSave.stamp) {
        // The file was checked against the types the project had; a type without the field is denied
        if (!attributeOf(schemaOf(strapi, ctx.uid), rule.field)) {
          throw new Error(`${ctx.uid} has no field ${rule.field} to stamp`);
        }

        if (rule.value.kind === 'user') {
          if (typeof documentId !== 'string' || documentId === '') {
            return null;
          }

          stamped[rule.field] = { set: [{ documentId }] };
        } else if (rule.value.kind === 'input') {
          const value = ownValue(ctx.params, rule.value.name);

          // A stamp with no value to stamp would leave the client's own in place: it can't be
          // evaluated, so core denies the write (a throw is a condition that is false)
          if (value === undefined || value === null) {
            throw new Error(`the input ${rule.value.name} has no value to stamp`);
          }

          stamped[rule.field] = value;
        } else {
          stamped[rule.field] = rule.value.value;
        }
      }

      return stamped;
    };
  }

  return definition;
};

// --- Stale references --------------------------------------------------------------------------

/**
 * The content types and fields the condition names that the project no longer has, readable.
 * `offered` is the content types the condition may cover, which a condition on all types, or on the
 * types with a user relation, is read against: it is stale when no type has a path, a stamped field
 * or a locked field (a type that lacks one is denied when it runs, not a reason to stop).
 */
export const staleReferences = (
  strapi: Core.Strapi,
  condition: BuilderConditionV2,
  offered: readonly string[] = []
): string[] => {
  const stale = new Set<string>();

  const missingType = (uid: string) => stale.add(`content type ${uid}`);

  const hasField = (uid: string, name: string) =>
    SYSTEM_FIELDS.includes(name) || attributeOf(schemaOf(strapi, uid), name) !== undefined;

  /** Follows `path` from `uid`; returns the first part that is gone, if any */
  const checkPath = (uid: string, path: string[]) => {
    let current = uid;

    for (const [index, hop] of path.entries()) {
      if (!hasField(current, hop)) {
        stale.add(`field "${path.slice(0, index + 1).join('.')}" of ${uid}`);

        return;
      }

      const attribute = attributeOf(schemaOf(strapi, current), hop);

      if (index < path.length - 1 && attribute?.type === 'relation') {
        const target = attribute.target;

        if (typeof target !== 'string' || !schemaOf(strapi, target)) {
          missingType(String(target));

          return;
        }

        current = target;
      }
    }
  };

  const entryPaths: string[][] = [];

  const collect = (group: EntryGroup) => {
    for (const item of group.items) {
      if (item.kind === 'group') {
        collect(item);
      } else if ('path' in item.target) {
        entryPaths.push(item.target.path);
      }
    }
  };

  collect(condition.which);

  if (condition.appliesTo.kind === 'types') {
    for (const uid of condition.appliesTo.types) {
      if (!schemaOf(strapi, uid)) {
        missingType(uid);
        continue;
      }

      entryPaths.forEach((path) => checkPath(uid, path));
      condition.onSave.stamp.forEach((rule) => checkPath(uid, [rule.field]));
      condition.onSave.locked.forEach((field) => checkPath(uid, [field]));
    }
  }

  const covered =
    condition.appliesTo.kind === 'all' ? [...offered] : userRelationTypes(strapi, offered);

  if (condition.appliesTo.kind !== 'types') {
    const hasPath = (uid: string, path: string[]) => {
      let current: string | undefined = uid;

      return path.every((hop, index) => {
        if (current === undefined || !hasField(current, hop)) {
          return false;
        }

        const attribute = attributeOf(schemaOf(strapi, current), hop);

        current = typeof attribute?.target === 'string' ? attribute.target : undefined;

        return index === path.length - 1 || attribute?.type === 'relation';
      });
    };
    const lacking = (path: string[]) => covered.every((uid) => !hasPath(uid, path));

    entryPaths
      .filter(lacking)
      .forEach((path) => stale.add(`field "${path.join('.')}" on any content type`));
    condition.onSave.stamp
      .filter((rule) => lacking([rule.field]))
      .forEach((rule) => stale.add(`field "${rule.field}" on any content type`));
    condition.onSave.locked
      .filter((field) => lacking([field]))
      .forEach((field) => stale.add(`field "${field}" on any content type`));
  }

  // The content type a field input takes a relation to
  for (const input of condition.inputs) {
    if (
      input.kind === 'field' &&
      isPlain(input.accepts) &&
      !schemaOf(strapi, input.accepts.relation)
    ) {
      missingType(input.accepts.relation);
    }
  }

  // The attributes of the user and the profile that a Who check or a value reads
  const reads: Array<{ uid: string; attribute: string }> = [];

  const note = (value: BuilderValue | undefined) => {
    if (value?.kind === 'user') {
      reads.push({ uid: USER_UID, attribute: value.attribute });
    } else if (value?.kind === 'profile') {
      reads.push({ uid: PROFILE_UID, attribute: value.attribute });
    }
  };

  for (const check of condition.who.checks) {
    if (check.kind === 'attribute') {
      reads.push({
        uid: check.source === 'user' ? USER_UID : PROFILE_UID,
        attribute: check.attribute,
      });
      note(check.value);
    }
  }

  const noteEntry = (group: EntryGroup) => {
    for (const item of group.items) {
      if (item.kind === 'group') {
        noteEntry(item);
      } else {
        note(item.value);
      }
    }
  };

  noteEntry(condition.which);

  for (const { uid, attribute } of reads) {
    const head = attribute.split('.')[0];

    if (uid === USER_UID && head === 'roles') {
      continue;
    }

    if (!hasField(uid, head)) {
      stale.add(`field "${attribute}" of ${uid}`);
    }
  }

  return [...stale];
};
