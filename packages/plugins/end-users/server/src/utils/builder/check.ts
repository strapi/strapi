import { contentTypes, errors } from '@strapi/utils';
import type { Core, UID } from '@strapi/types';

import {
  NEGATING_OPERATORS,
  PATTERN_OPERATORS,
  operatorsFor,
  takesList,
  takesNoValue,
} from '../../../../shared/builder/operators';
import type { FilterableType } from '../../../../shared/builder/operators';
import { BUILDER_LIMITS } from '../../../../shared/builder/types';
import type {
  BuilderConditionV2,
  BuilderInput,
  EntryGroup,
} from '../../../../shared/builder/types';
import { VALUE_KINDS, valueProblem } from '../../../../shared/builder/values';
import { PROFILE_UID, USER_UID } from '../../constants';
import { layoutContentTypeUids } from '../layout-content-types';

export type Plain = Record<string, unknown>;

export type Path = Array<string | number>;

type ValueKind = 'string' | 'number' | 'boolean';

/** What `contentTypes.isPrivateAttribute` reads: a schema, content type or component */
type Model = Parameters<typeof contentTypes.isPrivateAttribute>[0];

export const isPlain = (value: unknown): value is Plain =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const hasOwn = (object: object, key: string) =>
  Object.prototype.hasOwnProperty.call(object, key);

/** The slug is the condition's name without `api::`, and its file's name: nothing a path could use */
const SLUG = /^[a-z][a-z0-9-]{0,62}$/;

/**
 * Slugs that are no condition's: the admin's page for a new condition is `/conditions/new`, a static
 * route that wins over `/conditions/:slug`, so a condition by that slug could never be opened.
 */
const RESERVED_SLUGS = new Set<string>(['new']);

const INPUT_NAME = /^[a-z][a-zA-Z0-9]{0,31}$/;

const TO_MANY_RELATIONS = new Set<string>(['oneToMany', 'manyToMany', 'manyWay']);

const KIND_TEXT: Record<ValueKind, string> = {
  string: 'a text',
  number: 'a number',
  boolean: 'true or false',
};

/**
 * A refusal is a 400 that names the part: `path` is where in the condition the page can show it.
 * Typed in full, so that what follows a call is known to hold.
 */
export const refuse: (path: Path, message: string) => never = (path, message) => {
  throw new errors.ValidationError(message, {
    errors: [{ path, message, name: 'ValidationError' }],
  });
};

/**
 * The attributes of a registered schema. The registries are plain objects, so a key like
 * `constructor` finds an inherited value: only a schema that names itself by the uid counts.
 */
export const schemaOf = (strapi: Core.Strapi, uid: string): Plain | undefined => {
  const schema: unknown = strapi.contentType(uid as UID.ContentType);

  return isPlain(schema) && schema.uid === uid && isPlain(schema.attributes) ? schema : undefined;
};

/** An attribute of the schema itself, never one inherited from `Object.prototype` */
export const attributeOf = (schema: Plain | undefined, name: string): Plain | undefined => {
  const attributes = schema?.attributes;

  if (!isPlain(attributes) || !hasOwn(attributes, name)) {
    return undefined;
  }

  const attribute = attributes[name];

  return isPlain(attribute) ? attribute : undefined;
};

export const isPrivate = (schema: Plain, name: string) =>
  contentTypes.isPrivateAttribute(schema as unknown as Model, name);

/** The type of an attribute a builder condition can filter on, or undefined */
export const filterableType = (attribute: Plain | undefined): FilterableType | undefined =>
  typeof attribute?.type === 'string' && hasOwn(VALUE_KINDS, attribute.type)
    ? (attribute.type as FilterableType)
    : undefined;

/** The type a relation attribute points to, and whether it holds several; undefined for any other attribute */
export const relationOf = (
  attribute: Plain | undefined
): { target: string; toMany: boolean } | undefined =>
  attribute?.type === 'relation' &&
  typeof attribute.target === 'string' &&
  typeof attribute.relation === 'string'
    ? { target: attribute.target, toMany: TO_MANY_RELATIONS.has(attribute.relation) }
    : undefined;

/** The enumeration values of an attribute, when it is one */
export const enumOf = (attribute: Plain | undefined): string[] | undefined =>
  Array.isArray(attribute?.enum) ? (attribute.enum as string[]) : undefined;

export const checkSlug = (value: unknown): string => {
  if (typeof value !== 'string' || !SLUG.test(value)) {
    return refuse(
      ['slug'],
      'The slug is lowercase letters, digits and hyphens, starting with a letter, up to 63 characters'
    );
  }

  if (RESERVED_SLUGS.has(value)) {
    return refuse(
      ['slug'],
      `The slug "${value}" is reserved: it is the address of the builder's page for a new condition`
    );
  }

  return value;
};

export const checkDisplayName = (value: unknown): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    return refuse(['displayName'], 'displayName is the condition’s name, as a text');
  }

  return value;
};

/** Refuses a key the part does not have, rather than dropping it */
const exactKeys = (value: Plain, allowed: readonly string[], path: Path): void => {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));

  if (unknown.length > 0) {
    refuse([...path, unknown[0]], `Unknown keys: ${unknown.join(', ')}`);
  }
};

const objectAt = (value: unknown, path: Path, what: string): Plain =>
  isPlain(value) ? value : refuse(path, `${what} is an object`);

const listAt = (value: unknown, path: Path, what: string): unknown[] =>
  Array.isArray(value) ? value : refuse(path, `${what} is a list`);

const oneOf = <T extends string>(
  value: unknown,
  allowed: readonly T[],
  path: Path,
  what: string
): T =>
  typeof value === 'string' && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : refuse(path, `${what} is one of ${allowed.join(', ')}`);

interface Context {
  strapi: Core.Strapi;
  /** The content types the condition applies to */
  types: string[];
  /** The content types a path may go through: the ones a role can be granted on */
  offered: string[];
  inputs: Map<string, BuilderInput>;
  roleNames: readonly string[];
  checks: number;
  /**
   * At start-up, for a condition on `all` types or the types with a user relation: a path, a stamp
   * or a locked field that a type doesn't have is no reason to refuse the file. Which types the
   * condition covers changes with the project, and the compiled condition denies on a type that
   * lacks the field. At least one type must still have it.
   */
  perType: boolean;
}

/** What a value is compared with: the operators it takes, and what a value of it must be */
interface Slot {
  label: string;
  operators: readonly string[];
  kind: ValueKind;
  dateLike: boolean;
  problem: (operator: string, value: unknown) => string | null;
}

const slotOfType = (
  label: string,
  type: FilterableType,
  enums: Array<readonly string[] | undefined> = [undefined]
): Slot => ({
  label,
  operators: operatorsFor(type),
  kind: VALUE_KINDS[type],
  dateLike: type === 'date' || type === 'datetime',
  problem(operator, value) {
    for (const values of enums) {
      const problem = valueProblem(type, operator, value, values);

      if (problem) {
        return problem;
      }
    }

    return null;
  },
});

/** What a `field` input stands for: whatever the role picks, of the kind `accepts` says */
const slotOfInput = (input: BuilderInput): Slot => {
  const label = `the ${input.name} input`;
  const { accepts } = input;

  if (accepts === 'date') {
    const date = slotOfType(label, 'date');
    const dateTime = slotOfType(label, 'datetime');

    return {
      ...date,
      problem: (operator, value) =>
        date.problem(operator, value) === null ? null : dateTime.problem(operator, value),
    };
  }

  if (accepts === 'number') {
    return slotOfType(label, 'float');
  }

  if (accepts === 'boolean') {
    return slotOfType(label, 'boolean');
  }

  // A text, or a relation, which is compared by its documentId
  return slotOfType(label, accepts === 'text' ? 'string' : 'enumeration');
};

const kindOf = (slot: Slot, operator: string): ValueKind =>
  PATTERN_OPERATORS.includes(operator) ? 'string' : slot.kind;

/** The kind of value an attribute of the end user or the profile gives, or why it can't be a value */
const sourceKind = (
  strapi: Core.Strapi,
  uid: string,
  attribute: string,
  what: string,
  path: Path
): ValueKind => {
  const schema = schemaOf(strapi, uid);
  const found = attributeOf(schema, attribute);

  if (!schema || !found) {
    return refuse(path, `${what}: there is no attribute ${attribute}`);
  }

  if (isPrivate(schema, attribute)) {
    return refuse(path, `${what}: ${attribute} is private, so a condition can't read it`);
  }

  const type = filterableType(found);

  if (!type) {
    return refuse(path, `${what}: ${attribute} is a ${String(found.type)}, not a value`);
  }

  return VALUE_KINDS[type];
};

const checkNow = (slot: Slot, operator: string, value: Plain, path: Path): void => {
  exactKeys(value, ['kind', 'offset'], path);

  if (!slot.dateLike || PATTERN_OPERATORS.includes(operator)) {
    refuse(path, `now is for date fields: ${slot.label} is not one`);
  }

  if (value.offset !== undefined) {
    const offset = objectAt(value.offset, [...path, 'offset'], 'The offset');

    exactKeys(offset, ['amount', 'unit'], [...path, 'offset']);

    if (!Number.isInteger(offset.amount)) {
      refuse([...path, 'offset', 'amount'], 'The offset amount is a whole number');
    }

    oneOf(offset.unit, ['minutes', 'hours', 'days'], [...path, 'offset', 'unit'], 'The unit');
  }
};

/**
 * One value, against what it is compared with. A fixed value is judged by `valueProblem`; any other
 * kind must give a value of the kind the field takes, and only to an operator that takes one value.
 */
const checkValueOf = (
  ctx: Context,
  slot: Slot,
  operator: string,
  value: unknown,
  path: Path
): void => {
  if (value === undefined) {
    return refuse(path, `${operator} needs a value`);
  }

  const tagged = objectAt(value, path, 'A value');
  const kindPath = [...path, 'kind'];
  const kind = oneOf(
    tagged.kind,
    ['fixed', 'input', 'user', 'profile', 'now'] as const,
    kindPath,
    'The kind of a value'
  );

  if (kind === 'fixed') {
    exactKeys(tagged, ['kind', 'value'], path);

    const problem = slot.problem(operator, tagged.value);

    return problem ? refuse([...path, 'value'], `${slot.label}: ${problem}`) : undefined;
  }

  const wanted = kindOf(slot, operator);

  if (takesNoValue(operator)) {
    return refuse(path, `${operator} takes true or false, written out`);
  }

  if (kind === 'now') {
    if (takesList(operator)) {
      return refuse(path, `${operator} takes a list of fixed values`);
    }

    return checkNow(slot, operator, tagged, path);
  }

  let given: ValueKind;
  let several = false;

  if (kind === 'input') {
    exactKeys(tagged, ['kind', 'name'], path);

    const input = typeof tagged.name === 'string' ? ctx.inputs.get(tagged.name) : undefined;

    if (!input) {
      return refuse(path, `${String(tagged.name)} is not an input of this condition`);
    }

    if (input.kind === 'field') {
      return refuse(path, `${input.name} is a field input: it stands for a field, not a value`);
    }

    given = input.kind === 'text' ? 'string' : input.kind;
  } else {
    exactKeys(tagged, ['kind', 'attribute'], path);

    if (typeof tagged.attribute !== 'string' || tagged.attribute === '') {
      return refuse(path, `${kind} needs an attribute`);
    }

    const name = tagged.attribute;

    if (kind === 'user' && (name === 'documentId' || name === 'roles.documentId')) {
      given = 'string';
      several = name === 'roles.documentId';
    } else if (kind === 'user') {
      given = sourceKind(ctx.strapi, USER_UID, name, 'the end user', path);
    } else if (name.endsWith('.documentId')) {
      const relation = name.slice(0, -'.documentId'.length);
      const attribute = attributeOf(schemaOf(ctx.strapi, PROFILE_UID), relation);

      if (!relationOf(attribute) || relationOf(attribute)?.toMany) {
        return refuse(path, `the profile: ${relation} is not a relation to one entry`);
      }

      given = 'string';
    } else {
      given = sourceKind(ctx.strapi, PROFILE_UID, name, 'the profile', path);
    }
  }

  if (several !== takesList(operator)) {
    return refuse(
      path,
      several
        ? 'roles.documentId is a list: it goes with is one of and is none of'
        : `${operator} takes a list of fixed values`
    );
  }

  if (given !== wanted) {
    return refuse(path, `${slot.label} takes ${KIND_TEXT[wanted]}, not ${KIND_TEXT[given]}`);
  }

  return undefined;
};

/** The operator and the value of one check, against what it is compared with */
const checkOperation = (ctx: Context, slot: Slot, check: Plain, path: Path): string => {
  const { operator } = check;

  if (typeof operator !== 'string' || !slot.operators.includes(operator)) {
    return refuse(
      [...path, 'operator'],
      `${String(operator)} is not offered for ${slot.label}: it takes ${slot.operators.join(', ')}`
    );
  }

  checkValueOf(ctx, slot, operator, check.value, [...path, 'value']);

  return operator;
};

const countCheck = (ctx: Context, path: Path): void => {
  ctx.checks += 1;

  if (ctx.checks > BUILDER_LIMITS.checks) {
    refuse(path, `A condition can hold at most ${BUILDER_LIMITS.checks} checks`);
  }
};

/** What a path resolves to on every type: one type of field, and the first to-many relation it crosses */
interface Resolved {
  type: FilterableType;
  enums: Array<string[] | undefined>;
  toMany?: string;
}

const resolvePath = (ctx: Context, input: unknown, at: Path): Resolved => {
  const path = listAt(input, at, 'A path');

  if (path.length === 0 || !path.every((part) => typeof part === 'string' && part !== '')) {
    return refuse(at, 'A path is a list of field names, at least one');
  }

  const names = path as string[];
  const dotted = names.join('.');

  if (names.length - 1 > BUILDER_LIMITS.relationHops) {
    return refuse(
      at,
      `${dotted} goes through more than ${BUILDER_LIMITS.relationHops} relations, which is the most a path may`
    );
  }

  const found: Array<{ uid: string; type: FilterableType; enumValues?: string[] }> = [];
  let toMany: string | undefined;

  for (const uid of ctx.types) {
    let schema = schemaOf(ctx.strapi, uid);
    let where = uid;

    for (const [index, name] of names.entries()) {
      const last = index === names.length - 1;
      const attribute = attributeOf(schema, name);

      if (last && name === 'documentId' && !attribute) {
        found.push({ uid, type: 'string' });
        break;
      }

      if (!schema || !attribute) {
        // A type that lacks a hop is left out, where that is no reason to refuse (`perType`)
        if (ctx.perType) {
          break;
        }

        return refuse(at, `${name} is not a field of ${where}`);
      }

      if (isPrivate(schema, name)) {
        return refuse(at, `${name} is a private field of ${where}`);
      }

      const relation = relationOf(attribute);

      if (last) {
        if (relation) {
          return refuse(
            at,
            `${dotted} ends on a relation: use ${dotted}.documentId to compare the entry`
          );
        }

        const type = filterableType(attribute);

        if (!type) {
          return refuse(
            at,
            `${name} is a ${String(attribute.type)} field of ${where}, which a builder condition can't filter on`
          );
        }

        found.push({ uid, type, enumValues: enumOf(attribute) });
      } else {
        if (!relation) {
          return refuse(
            at,
            `${name} is a ${String(attribute.type)} field of ${where}, not a relation: a path goes through relations only`
          );
        }

        if (!ctx.offered.includes(relation.target)) {
          return refuse(at, `${name} points to ${relation.target}, which a path can't go through`);
        }

        if (relation.toMany && toMany === undefined) {
          toMany = names.slice(0, index + 1).join('.');
        }

        schema = schemaOf(ctx.strapi, relation.target);
        where = relation.target;
      }
    }
  }

  if (found.length === 0) {
    return refuse(at, `${dotted} is not a field of any content type the condition applies to`);
  }

  const [first] = found;
  // At load a type whose field has another type is skipped, like one without the field: the compiled query denies per type
  const kept = ctx.perType ? found.filter(({ type }) => type === first.type) : found;
  const other = kept.find(({ type }) => type !== first.type);

  if (other) {
    refuse(
      at,
      `${dotted} is a ${first.type} on ${first.uid} but a ${other.type} on ${other.uid}: a condition can only filter on a field that has the same type on every content type it applies to`
    );
  }

  return { type: first.type, enums: kept.map(({ enumValues }) => enumValues), toMany };
};

const checkEntry = (ctx: Context, value: unknown, path: Path, negated: boolean): void => {
  const check = objectAt(value, path, 'A check');

  exactKeys(check, ['kind', 'target', 'operator', 'value'], path);
  countCheck(ctx, path);

  const target = objectAt(check.target, [...path, 'target'], 'The target');
  const targetPath = [...path, 'target'];
  let slot: Slot;
  let toMany: string | undefined;

  if (hasOwn(target, 'input')) {
    exactKeys(target, ['input'], targetPath);

    const input = typeof target.input === 'string' ? ctx.inputs.get(target.input) : undefined;

    if (!input || input.kind !== 'field') {
      return refuse(
        [...targetPath, 'input'],
        `${String(target.input)} is not a field input of this condition`
      );
    }

    slot = slotOfInput(input);
  } else {
    exactKeys(target, ['path'], targetPath);

    const resolved = resolvePath(ctx, target.path, [...targetPath, 'path']);

    ({ toMany } = resolved);
    slot = slotOfType((target.path as string[]).join('.'), resolved.type, resolved.enums);
  }

  const operator = checkOperation(ctx, slot, check, path);

  if (toMany && (NEGATING_OPERATORS.includes(operator) || negated)) {
    refuse(
      [...path, NEGATING_OPERATORS.includes(operator) ? 'operator' : 'target'],
      `is not, does not include and none of can't cross the to-many relation ${toMany}`
    );
  }

  return undefined;
};

const checkGroup = (
  ctx: Context,
  value: unknown,
  path: Path,
  depth: number,
  negated: boolean
): EntryGroup => {
  const group = objectAt(value, path, 'A group');

  exactKeys(group, ['kind', 'match', 'items'], path);

  if (group.kind !== 'group') {
    refuse([...path, 'kind'], 'A group has the kind "group"');
  }

  const match = oneOf(group.match, ['all', 'any', 'none'] as const, [...path, 'match'], 'match');
  const items = listAt(group.items, [...path, 'items'], 'items');
  const inside = negated || match === 'none';

  // The top-level group may be empty ("Restricts nothing"); a nested one restricts nothing at all
  if (depth > 0 && items.length === 0) {
    refuse(path, 'A group needs at least one check');
  }

  items.forEach((item, index) => {
    const at = [...path, 'items', index];
    const kind = isPlain(item) ? item.kind : undefined;

    if (kind === 'group') {
      if (depth >= BUILDER_LIMITS.nestedGroups) {
        refuse(at, `Groups nest ${BUILDER_LIMITS.nestedGroups} level deep at most`);
      }

      checkGroup(ctx, item, at, depth + 1, inside);
    } else if (kind === 'check') {
      checkEntry(ctx, item, at, inside);
    } else {
      refuse([...at, 'kind'], 'An item is a "check" or a "group"');
    }
  });

  return group as unknown as EntryGroup;
};

/** The content types, of these, that have a public relation to the end user */
export const userRelationTypes = (strapi: Core.Strapi, offered: readonly string[]): string[] =>
  offered.filter((uid) => {
    const schema = schemaOf(strapi, uid);

    return Object.entries(isPlain(schema?.attributes) ? schema.attributes : {}).some(
      ([name, attribute]) =>
        isPlain(attribute) &&
        relationOf(attribute)?.target === USER_UID &&
        schema !== undefined &&
        !isPrivate(schema, name)
    );
  });

const checkAppliesTo = (
  strapi: Core.Strapi,
  value: unknown,
  offeredTypes: readonly string[] | undefined
): { types: string[]; offered: string[] } => {
  const at = ['appliesTo'];
  const appliesTo = objectAt(value, at, 'appliesTo');
  const offered = offeredTypes ? [...offeredTypes] : layoutContentTypeUids(strapi);
  const kind = oneOf(
    appliesTo.kind,
    ['all', 'user-relation', 'types'] as const,
    [...at, 'kind'],
    'kind'
  );

  if (kind === 'all') {
    exactKeys(appliesTo, ['kind'], at);

    return { types: offered, offered };
  }

  if (kind === 'user-relation') {
    exactKeys(appliesTo, ['kind'], at);

    const types = userRelationTypes(strapi, offered);

    if (types.length === 0) {
      refuse(at, 'No content type has a relation to the end user');
    }

    return { types, offered };
  }

  exactKeys(appliesTo, ['kind', 'types'], at);

  const types = appliesTo.types;

  if (
    !Array.isArray(types) ||
    types.length === 0 ||
    !types.every((uid) => typeof uid === 'string')
  ) {
    return refuse([...at, 'types'], 'types is a list of content types, at least one');
  }

  for (const uid of types as string[]) {
    if (!offered.includes(uid)) {
      refuse([...at, 'types'], `${uid} is not a content type a role can be granted on`);
    }
  }

  return { types: [...new Set(types as string[])], offered };
};

const checkInputs = (ctx: Context, value: unknown): void => {
  const at = ['inputs'];
  const list = listAt(value, at, 'inputs');

  if (list.length > BUILDER_LIMITS.inputs) {
    refuse(at, `A condition can hold at most ${BUILDER_LIMITS.inputs} inputs`);
  }

  list.forEach((item, index) => {
    const path = [...at, index];
    const input = objectAt(item, path, 'An input');

    exactKeys(input, ['name', 'kind', 'accepts', 'required', 'default'], path);

    if (typeof input.name !== 'string' || !INPUT_NAME.test(input.name)) {
      refuse(
        [...path, 'name'],
        'An input name is letters and digits, starting with a lowercase letter, up to 32 characters'
      );
    }

    if (ctx.inputs.has(input.name)) {
      refuse([...path, 'name'], `There are two inputs named ${input.name}`);
    }

    const kind = oneOf(
      input.kind,
      ['text', 'number', 'boolean', 'field'] as const,
      [...path, 'kind'],
      'kind'
    );

    if (typeof input.required !== 'boolean') {
      refuse([...path, 'required'], 'required is true or false');
    }

    if (kind === 'field') {
      const { accepts } = input;
      const relation = isPlain(accepts) ? accepts.relation : undefined;

      if (accepts === undefined) {
        refuse([...path, 'accepts'], `${input.name} is a field input: it needs accepts`);
      }

      if (isPlain(accepts)) {
        exactKeys(accepts, ['relation'], [...path, 'accepts']);

        if (typeof relation !== 'string' || !ctx.offered.includes(relation)) {
          refuse(
            [...path, 'accepts'],
            `${String(relation)} is not a content type a role can be granted on`
          );
        }
      } else {
        oneOf(
          accepts,
          ['text', 'number', 'date', 'boolean'] as const,
          [...path, 'accepts'],
          'accepts'
        );
      }

      if (input.default !== undefined) {
        refuse([...path, 'default'], 'A field input has no default');
      }

      // With no default, a field input that no role binds leaves the condition false for everyone
      if (input.required !== true) {
        refuse([...path, 'required'], `${input.name} is a field input: it is always required`);
      }
    } else {
      if (input.accepts !== undefined) {
        refuse([...path, 'accepts'], 'Only a field input has accepts');
      }

      const wanted = kind === 'text' ? 'string' : kind;

      if (input.default !== undefined) {
        const fits =
          wanted === 'number'
            ? typeof input.default === 'number' && Number.isFinite(input.default)
            : typeof input.default === wanted;

        if (!fits) {
          refuse([...path, 'default'], `The default of ${input.name} is ${KIND_TEXT[wanted]}`);
        }

        // A text default is held to the rules of a fixed text
        const problem =
          typeof input.default === 'string' ? valueProblem('string', '$eq', input.default) : null;

        if (problem) {
          refuse([...path, 'default'], `The default of ${input.name}: ${problem}`);
        }
      }
    }

    ctx.inputs.set(input.name, input as unknown as BuilderInput);
  });
};

const checkWho = (ctx: Context, value: unknown): void => {
  const at = ['who'];
  const who = objectAt(value, at, 'who');

  exactKeys(who, ['match', 'checks'], at);
  oneOf(who.match, ['all', 'any'] as const, [...at, 'match'], 'match');

  listAt(who.checks, [...at, 'checks'], 'checks').forEach((item, index) => {
    const path = [...at, 'checks', index];
    const check = objectAt(item, path, 'A check');
    const kind = oneOf(
      check.kind,
      ['attribute', 'roles', 'email-verified'] as const,
      [...path, 'kind'],
      'The kind of a who check'
    );

    countCheck(ctx, path);

    if (kind === 'email-verified') {
      exactKeys(check, ['kind', 'value'], path);

      if (typeof check.value !== 'boolean') {
        refuse([...path, 'value'], 'value is true or false');
      }

      return;
    }

    if (kind === 'roles') {
      exactKeys(check, ['kind', 'match', 'roles'], path);
      oneOf(check.match, ['any', 'none'] as const, [...path, 'match'], 'match');

      const roles = listAt(check.roles, [...path, 'roles'], 'roles');

      if (roles.length === 0 || roles.length > BUILDER_LIMITS.listValues) {
        refuse(
          [...path, 'roles'],
          `roles is a list of 1 to ${BUILDER_LIMITS.listValues} role names`
        );
      }

      for (const role of roles) {
        if (typeof role !== 'string' || !ctx.roleNames.includes(role)) {
          refuse([...path, 'roles'], `${String(role)} is not a role`);
        }
      }

      return;
    }

    exactKeys(check, ['kind', 'source', 'attribute', 'operator', 'value'], path);

    const source = oneOf(check.source, ['user', 'profile'] as const, [...path, 'source'], 'source');
    const uid = source === 'user' ? USER_UID : PROFILE_UID;
    const name = check.attribute;
    const schema = schemaOf(ctx.strapi, uid);
    const attribute = typeof name === 'string' ? attributeOf(schema, name) : undefined;
    const where = source === 'user' ? 'the end user' : 'the profile';

    if (!schema || typeof name !== 'string' || !attribute) {
      return refuse([...path, 'attribute'], `${String(name)} is not an attribute of ${where}`);
    }

    if (isPrivate(schema, name)) {
      return refuse([...path, 'attribute'], `${name} is a private attribute of ${where}`);
    }

    const type = filterableType(attribute);

    if (!type) {
      return refuse(
        [...path, 'attribute'],
        `${name} is a ${String(attribute.type)} attribute of ${where}, which a builder condition can't check`
      );
    }

    checkOperation(ctx, slotOfType(`${where}'s ${name}`, type, [enumOf(attribute)]), check, path);

    return undefined;
  });
};

/** The types that have the field: all of them, but where a type may lack it (`perType`), those that have it */
const typesWith = (ctx: Context, field: string, path: Path): string[] => {
  if (!ctx.perType) {
    return ctx.types;
  }

  const have = ctx.types.filter((uid) => attributeOf(schemaOf(ctx.strapi, uid), field));

  return have.length > 0
    ? have
    : refuse(path, `${field} is not a field of any content type the condition applies to`);
};

/** What a field is on every chosen type, for a stamp: a filterable type, or a relation to the end user */
const stampKind = (
  ctx: Context,
  field: string,
  path: Path
): FilterableType | 'user' | 'relation' => {
  const kinds = typesWith(ctx, field, path).map((uid) => {
    const attribute = attributeOf(schemaOf(ctx.strapi, uid), field);

    if (!attribute) {
      return refuse(path, `${field} is not a field of ${uid}`);
    }

    if (relationOf(attribute)?.target === USER_UID) {
      return { uid, kind: 'user' as const, enumValues: undefined };
    }

    if (relationOf(attribute)) {
      return { uid, kind: 'relation' as const, enumValues: undefined };
    }

    const type = filterableType(attribute);

    return type
      ? { uid, kind: type, enumValues: enumOf(attribute) }
      : refuse(
          path,
          `${field} is a ${String(attribute.type)} field of ${uid}, which a stamp can't set`
        );
  });
  const [first] = kinds;
  // At load a type whose field has another type is skipped, like one without the field
  const other = ctx.perType ? undefined : kinds.find(({ kind }) => kind !== first.kind);

  if (other) {
    refuse(
      path,
      `${field} is a ${first.kind} on ${first.uid} but a ${other.kind} on ${other.uid}: a stamp needs the same type on every content type`
    );
  }

  return first.kind;
};

const checkOnSave = (ctx: Context, value: unknown): void => {
  const at = ['onSave'];
  const onSave = objectAt(value, at, 'onSave');

  exactKeys(onSave, ['stamp', 'locked'], at);

  const seen = new Set<string>();

  listAt(onSave.stamp, [...at, 'stamp'], 'stamp').forEach((item, index) => {
    const path = [...at, 'stamp', index];
    const rule = objectAt(item, path, 'A stamp');

    exactKeys(rule, ['field', 'value'], path);

    if (typeof rule.field !== 'string' || rule.field === '') {
      refuse([...path, 'field'], 'field is the name of a field');
    }

    if (seen.has(rule.field)) {
      refuse([...path, 'field'], `${rule.field} is stamped twice`);
    }

    seen.add(rule.field);

    const kind = stampKind(ctx, rule.field, [...path, 'field']);
    const stamped = objectAt(rule.value, [...path, 'value'], 'A stamp value');
    const stampKindName = oneOf(
      stamped.kind,
      ['user', 'input', 'fixed'] as const,
      [...path, 'value', 'kind'],
      'The kind of a stamp value'
    );

    if (stampKindName === 'user') {
      exactKeys(stamped, ['kind'], [...path, 'value']);

      if (kind !== 'user') {
        refuse(
          [...path, 'value'],
          `${rule.field} is not a relation to ${USER_UID}, so it can't be stamped with the user`
        );
      }

      return;
    }

    if (kind === 'user' || kind === 'relation') {
      refuse(
        [...path, 'value'],
        `${rule.field} is a relation: only the user can be stamped on a relation to the end user`
      );
    }

    const type = kind as FilterableType;

    if (stampKindName === 'input') {
      exactKeys(stamped, ['kind', 'name'], [...path, 'value']);

      const input = typeof stamped.name === 'string' ? ctx.inputs.get(stamped.name) : undefined;

      if (!input || input.kind === 'field') {
        refuse(
          [...path, 'value'],
          `${String(stamped.name)} is not a text, number or boolean input of this condition`
        );
      }

      const given = input.kind === 'text' ? 'string' : input.kind;

      if (given !== VALUE_KINDS[type]) {
        refuse(
          [...path, 'value'],
          `${rule.field} takes ${KIND_TEXT[VALUE_KINDS[type]]}, not ${KIND_TEXT[given]}`
        );
      }

      return;
    }

    exactKeys(stamped, ['kind', 'value'], [...path, 'value']);

    const enums = typesWith(ctx, rule.field, [...path, 'field']).map((uid) =>
      enumOf(attributeOf(schemaOf(ctx.strapi, uid), rule.field as string))
    );
    const problem = slotOfType(rule.field, type, enums).problem('$eq', stamped.value);

    if (problem) {
      refuse([...path, 'value', 'value'], `${rule.field}: ${problem}`);
    }
  });

  listAt(onSave.locked, [...at, 'locked'], 'locked').forEach((field, index) => {
    const path = [...at, 'locked', index];

    if (typeof field !== 'string') {
      refuse(path, 'A locked field is the name of a field');
    }

    if (ctx.perType) {
      typesWith(ctx, field, path);

      return;
    }

    for (const uid of ctx.types) {
      if (!attributeOf(schemaOf(ctx.strapi, uid), field)) {
        refuse(path, `${field} is not a field of ${uid}`);
      }
    }
  });
};

const CONDITION_KEYS = [
  'version',
  'slug',
  'displayName',
  'appliesTo',
  'inputs',
  'who',
  'which',
  'onSave',
];

/**
 * What a version 2 builder condition must be before anything is written or counted, so that it can
 * neither match more than it says nor stop the next start. Checks the whole file in the order of the
 * page and refuses (400, `ValidationError` naming `path`) at the first problem: no key that is not
 * the file's; the slug; the content types it applies to; the inputs; the Who checks (an attribute of
 * the end user or the profile that is public, roles that exist); the Which groups (paths that exist
 * on every type, through at most 2 relations; operators of the field's type; values of its kind;
 * no negation across a to-many relation); and the fields a save stamps or locks.
 *
 * `context.roleNames` are the roles that exist, which a Who check may name. `context.offered` is the
 * content types a condition may name and a path may go through; left out, it is the ones a role can
 * be granted on (`layoutContentTypeUids`), which is what a save and the preview use. The start-up
 * load passes its own, wider set, because the action registries are empty until bootstrap. `atLoad`
 * is the start-up load: for a condition on all types, or on the types with a user relation, a type
 * that lacks a path, a stamped field or a locked field is not a refusal (the compiled condition
 * denies on it). Gives back the condition, which holds nothing but its own parts.
 */
export const checkBuilderConditionV2 = (
  strapi: Core.Strapi,
  input: unknown,
  context: { roleNames: readonly string[]; offered?: readonly string[]; atLoad?: boolean }
): BuilderConditionV2 => {
  if (!isPlain(input)) {
    return refuse([], 'A condition is an object');
  }

  if (Buffer.byteLength(JSON.stringify(input), 'utf8') > BUILDER_LIMITS.fileBytes) {
    refuse([], `A condition can be at most ${BUILDER_LIMITS.fileBytes} bytes`);
  }

  exactKeys(input, CONDITION_KEYS, []);

  if (input.version !== 2) {
    refuse(['version'], 'version is 2');
  }

  checkSlug(input.slug);
  checkDisplayName(input.displayName);

  const { types, offered } = checkAppliesTo(strapi, input.appliesTo, context.offered);
  const perType =
    context.atLoad === true && isPlain(input.appliesTo) && input.appliesTo.kind !== 'types';
  const ctx: Context = {
    strapi,
    types,
    offered,
    inputs: new Map(),
    roleNames: context.roleNames,
    checks: 0,
    perType,
  };

  checkInputs(ctx, input.inputs);
  checkWho(ctx, input.who);
  checkGroup(ctx, input.which, ['which'], 0, false);
  checkOnSave(ctx, input.onSave);

  return input as unknown as BuilderConditionV2;
};
