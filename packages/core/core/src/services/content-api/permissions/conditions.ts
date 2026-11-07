/*
 * Content API conditions: what a condition definition may say, and how it is turned into a filter.
 *
 * A condition's `query` becomes a database filter, so everything here fails closed: whenever a
 * condition can't be evaluated safely it is false, never "no restriction".
 *
 * Placeholders
 * - A placeholder is a whole string value: `$user.documentId`, `$user.email`, `$user.<attribute>`,
 *   `$user.roles.documentId`, `$profile.<attribute>`, `$profile.<relation>.documentId`, `$now`,
 *   `$params.<name>`. `$profile.*` reads `ctx.user.profile` under the rules of `$user.*`. Keys and longer strings stay as they are.
 * - A placeholder stands for one non-empty string, a boolean, a finite number or a valid date (as an
 *   ISO string). An empty string counts as missing: `$startsWith`, `$endsWith` and `$contains`
 *   build `LIKE '<value>%'`, and '' matches every row.
 * - Only `$user.roles.documentId` resolves to a list: the role documentIds, never empty and never
 *   with an empty element. Any other placeholder that resolves to an array (a list attribute, a list
 *   param) counts as missing, because a list in place of a scalar changes what an operator means.
 *   There is no list param type, so no `$params` placeholder is a list.
 * - A placeholder without a value (no user, a missing, null or object attribute, `$user.id`, an
 *   unknown param) makes the whole condition false.
 *
 * Writing a condition
 * - A static `query: {}` is refused at registration. A condition that restricts nothing is a
 *   `query` function that returns `true`; a function that returns `{}` is false.
 * - A `query` function must build its filter from placeholders and must not embed raw strings from
 *   the context (`ctx.user.email`, `ctx.params.x`): its output is scanned for placeholders once, so
 *   a raw value is read as a placeholder when it looks like one, and it skips the missing checks
 *   above (an empty string, a list).
 * - `stamp` and `lockedFields` are reached only through `applyCondition`, which evaluates the
 *   condition first, so they never run for a caller the condition denies. A condition with a `stamp`
 *   is false for Public: a stamp writes the caller into the data, and Public has no one to write.
 * - A string or attribute param can't default to '': an empty string is a missing value, so the
 *   registration is refused.
 * - `subjects`, `query`, `stamp` and `lockedFields` must be pure and synchronous: they run when a
 *   caller's ability is built and again when the checker answers. One that throws, or that returns a
 *   promise (an `async` function), counts as false for the row it is on (the row gives no data rule,
 *   the others are not affected) and is logged once per condition name, so a bug in one condition
 *   denies instead of failing every request of whoever holds it.
 * - A registered definition is a frozen copy; changing the object that was registered has no effect.
 */
import { cloneDeep, isPlainObject } from 'lodash';
import type { Modules } from '@strapi/types';

import type { ConditionUser } from './types';

/*
 * The types are declared in `@strapi/types`, so plugins can name them; they are
 * re-exported here for core's own code.
 */
export type ConditionContext = Modules.ContentAPI.ConditionContext;
export type ContentApiConditionDefinition = Modules.ContentAPI.ContentApiConditionDefinition;
export type ContentApiConditionParam = Modules.ContentAPI.ContentApiConditionParam;
export type ConditionRef = Modules.ContentAPI.ConditionRef;
export type BoundCondition = Modules.ContentAPI.BoundCondition;

type Params = Record<string, unknown>;

const PARAM_TYPES = new Set<ContentApiConditionParam['type']>([
  'string',
  'number',
  'boolean',
  'attribute',
]);

const SOURCES: ReadonlyArray<NonNullable<ContentApiConditionDefinition['source']>> = [
  'builtin',
  'plugin',
  'code',
  'builder',
];

const USER = '$user';
const PROFILE = '$profile';
const PARAMS = '$params';
const NOW = '$now';

const ownValue = (object: object, key: string): unknown =>
  Object.prototype.hasOwnProperty.call(object, key)
    ? (object as Record<string, unknown>)[key]
    : undefined;

/** What {@link callConditionFunction} gives when the function threw or answered with a promise */
const THREW = Symbol('threw');

/** The conditions whose failure is already logged, so one that fails on every request logs once */
const reported = new WeakSet<object>();

/**
 * A thrown value as the log prints it. A thrown value is anything: `Object.create(null)` has no
 * `toString`, and an error's `stack` can be a getter, so printing can throw too.
 */
const printable = (error: unknown): string => {
  try {
    // The stack when there is one: it names the line of the condition that threw
    return String(error instanceof Error ? (error.stack ?? error.message) : error);
  } catch {
    return 'unprintable error';
  }
};

const report = (definition: ContentApiConditionDefinition, role: string, problem: () => string) => {
  if (reported.has(definition)) {
    return;
  }

  reported.add(definition);

  try {
    strapi.log.error(
      `Content API condition "${String(definition.name)}": its ${role} function ${problem()}`
    );
  } catch {
    // No logger to tell, or it failed: the condition is false either way
  }
};

/** A promise, or anything else with a `then` to call: what an `async` function gives */
const isThenable = (value: unknown): value is PromiseLike<unknown> =>
  (typeof value === 'object' || typeof value === 'function') &&
  value !== null &&
  typeof (value as { then?: unknown }).then === 'function';

/**
 * Calls one of a condition's functions (`subjects`, `query`, `stamp`, `lockedFields`). They must be
 * synchronous and must not throw. A function that throws, or that answers with a promise (`async`),
 * is a condition that can't be evaluated, so it is false, never a failure of whatever asked: the
 * ability build, a checker answer or an `assertEntry`. It is logged once per condition.
 */
const callConditionFunction = <T>(
  definition: ContentApiConditionDefinition,
  role: 'subjects' | 'query' | 'stamp' | 'lockedFields',
  run: () => T
): T | typeof THREW => {
  try {
    const result = run();

    if (isThenable(result)) {
      // Nobody will read what it settles to; a rejection with no handler would be an unhandled one
      // A thenable that fails to be adopted rejects the wrapper, and this catch takes that too
      new Promise((resolve) => resolve(result)).catch(() => {});

      report(
        definition,
        role,
        () =>
          'returned a promise, but it must be synchronous, so the condition is false for the rows that use it.'
      );

      return THREW;
    }

    return result;
  } catch (error) {
    report(
      definition,
      role,
      () => `threw, so the condition is false for the rows that use it. ${printable(error)}`
    );

    return THREW;
  }
};

/** An empty string is not a value: see the header */
const isFilterScalar = (value: unknown): value is string | number | boolean =>
  (typeof value === 'string' && value !== '') ||
  typeof value === 'boolean' ||
  (typeof value === 'number' && Number.isFinite(value));

/**
 * What a placeholder may stand for: one scalar, or a date (as an ISO string). Anything else is
 * undefined, so it counts as missing: an array or an object would change what an operator means (an
 * object would even let whoever writes the attribute put operators into the filter,
 * `{ $ne: null }`), null would match every entry whose field is empty, and '' matches every row
 * under the LIKE operators.
 */
const toFilterValue = (value: unknown): unknown => {
  if (isFilterScalar(value)) {
    return value;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }

  return undefined;
};

/** `value` is `root` or a path under it: `$user`, `$user.email` */
const isUnder = (value: string, root: string) => value === root || value.startsWith(`${root}.`);

/**
 * The documentIds of the user's roles: the one placeholder that is a list. Undefined (missing) when
 * there are no roles, or when any role has no documentId that is a non-empty string, so a user can
 * never match through a role that has no id.
 */
const roleDocumentIds = (user: ConditionUser): string[] | undefined => {
  const roles = ownValue(user, 'roles');

  if (!Array.isArray(roles) || roles.length === 0) {
    return undefined;
  }

  const ids = roles.map((role) =>
    typeof role === 'object' && role !== null ? ownValue(role, 'documentId') : undefined
  );

  return ids.every((id): id is string => typeof id === 'string' && id !== '') ? ids : undefined;
};

/**
 * The value of `$user.<path>`. `roles.documentId` is the one nested path. `id` is not a placeholder:
 * conditions match on `documentId`, never on numeric `id`.
 */
const userValue = (user: ConditionUser | null, path: string): unknown => {
  if (user === null) {
    return undefined;
  }

  if (path === 'roles.documentId') {
    return roleDocumentIds(user);
  }

  if (path === '' || path === 'id' || path.includes('.')) {
    return undefined;
  }

  return toFilterValue(ownValue(user, path));
};

/**
 * The value of `$profile.<attribute>` or `$profile.<relation>.documentId`, under the rules of
 * `$user.*`: one scalar or date. No profile (none, or none loaded), a missing, null or object
 * attribute, `id` and any other path are missing.
 */
const profileValue = (user: ConditionUser | null, path: string): unknown => {
  const profile = user === null ? undefined : ownValue(user, 'profile');

  if (typeof profile !== 'object' || profile === null) {
    return undefined;
  }

  const [name, rest, ...more] = path.split('.');

  if (
    name === '' ||
    name === 'id' ||
    more.length > 0 ||
    (rest !== undefined && rest !== 'documentId')
  ) {
    return undefined;
  }

  const value = ownValue(profile, name);

  if (rest === undefined) {
    return toFilterValue(value);
  }

  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? toFilterValue(ownValue(value, 'documentId'))
    : undefined;
};

/** Whether a static query holds a `$profile.` placeholder: such a condition reads the profile */
const queryReadsProfile = (query: unknown): boolean => {
  if (typeof query === 'string') {
    return isUnder(query, PROFILE);
  }

  if (Array.isArray(query)) {
    return query.some(queryReadsProfile);
  }

  return isPlainObject(query) && Object.values(query as object).some(queryReadsProfile);
};

/** What `missing` lists for an `undefined` value inside a query: it has no placeholder to name */
const UNDEFINED_VALUE = '<undefined>';

/**
 * Replaces the placeholders of a condition's query: `$user.documentId`, `$user.email`,
 * `$user.roles.documentId`, `$user.<attribute>`, `$profile.<attribute>`,
 * `$profile.<relation>.documentId`, `$now`, `$params.<name>`.
 *
 * Only a whole string value is a placeholder: keys and longer strings stay as they are. A
 * placeholder with no value (no user, a missing, null, empty or list attribute, `$user.id`, an
 * unknown param) is listed in `missing`, and so is any `undefined` inside the query (listed as
 * `<undefined>`). `value` is undefined whenever anything is missing, so a
 * caller can't use a query with holes in it.
 */
export const resolvePlaceholders = (
  query: unknown,
  ctx: ConditionContext
): { value: unknown; missing: string[] } => {
  const missing: string[] = [];

  const resolveString = (value: string): unknown => {
    let resolved: unknown;

    if (value === NOW) {
      resolved = toFilterValue(ctx.now);
    } else if (isUnder(value, USER)) {
      resolved = userValue(ctx.user, value.slice(USER.length + 1));
    } else if (isUnder(value, PROFILE)) {
      resolved = profileValue(ctx.user, value.slice(PROFILE.length + 1));
    } else if (isUnder(value, PARAMS)) {
      const name = value.slice(PARAMS.length + 1);

      resolved = name === '' ? undefined : toFilterValue(ownValue(ctx.params, name));
    } else {
      return value;
    }

    if (resolved === undefined && !missing.includes(value)) {
      missing.push(value);
    }

    return resolved;
  };

  const walk = (node: unknown): unknown => {
    // A raw `undefined` a query function returned (`{ title: { $eq: undefined } }`) is a hole, as a
    // placeholder with no value is: it would otherwise reach the query as no filter at all. `null`
    // stays: it is a value (IS NULL)
    if (node === undefined) {
      if (!missing.includes(UNDEFINED_VALUE)) {
        missing.push(UNDEFINED_VALUE);
      }

      return undefined;
    }

    if (typeof node === 'string') {
      return resolveString(node);
    }

    if (Array.isArray(node)) {
      return node.map(walk);
    }

    if (isPlainObject(node)) {
      // `fromEntries` defines each key, so a `__proto__` key parsed from JSON stays a plain key
      return Object.fromEntries(
        Object.entries(node as object).map(([key, child]) => [key, walk(child)])
      );
    }

    return node;
  };

  const value = walk(query);

  return { value: missing.length === 0 ? value : undefined, missing };
};

// The end-users plugin's `checkRows` (`services/permission.ts`) refuses at import what these would
// deny at request time. It calls `appliesTo` below through `strapi.contentAPI.permissions.conditions`,
// but mirrors `hasType` as its own `hasParamType`: change one and change the other.
const hasType = (value: unknown, type: ContentApiConditionParam['type']): boolean => {
  switch (type) {
    case 'string':
    case 'attribute':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number' && Number.isFinite(value);
    case 'boolean':
      return typeof value === 'boolean';
    default:
      return false;
  }
};

/**
 * The row's params with the declared defaults filled in, or null when a required param is missing
 * (undefined or null) or a declared param has the wrong type. Params the definition doesn't declare
 * are passed through as given.
 */
const resolveParams = (
  definition: ContentApiConditionDefinition,
  params: Params | undefined
): Params | null => {
  const resolved: Params = isPlainObject(params) ? cloneDeep(params as Params) : {};

  for (const [name, declaration] of Object.entries(definition.params ?? {})) {
    const value = ownValue(resolved, name) ?? declaration.default;

    if (value === undefined || value === null) {
      if (declaration.required) {
        return null;
      }

      continue;
    }

    if (!hasType(value, declaration.type)) {
      return null;
    }

    resolved[name] = value;
  }

  return resolved;
};

/**
 * Whether the condition applies to the content type: `subjects` names it, is a function that says
 * so (one that throws counts as no, logged once per condition), or is absent. Plugins call it
 * through `strapi.contentAPI.permissions.conditions.appliesTo`.
 */
export const appliesTo = (definition: ContentApiConditionDefinition, uid: string): boolean => {
  const { subjects } = definition;

  if (subjects === undefined) {
    return true;
  }

  if (typeof subjects === 'function') {
    const applies = callConditionFunction(definition, 'subjects', () => subjects(uid));

    return applies !== THREW && Boolean(applies);
  }

  return Array.isArray(subjects) && subjects.includes(uid);
};

/**
 * The context a condition is evaluated in for a row's params, or null when the condition does not
 * apply: the uid is outside its subjects, a required param is missing or a param has the wrong
 * type. `query`, `stamp` and `lockedFields` each get a context of their own, with copies of the user,
 * the params and the date, so a function that changes its context changes nothing for the next one,
 * for another condition or for the caller.
 */
const conditionContext = (
  definition: ContentApiConditionDefinition,
  params: Params | undefined,
  ctx: Omit<ConditionContext, 'params'>
): ConditionContext | null => {
  if (!appliesTo(definition, ctx.uid)) {
    return null;
  }

  const resolved = resolveParams(definition, params);

  if (resolved === null) {
    return null;
  }

  return {
    ...ctx,
    user: ctx.user === null ? null : cloneDeep(ctx.user),
    now: new Date(ctx.now),
    params: resolved,
  };
};

/**
 * The filter a condition gives for a row's params and a caller, `{}` when it holds without one, or
 * `false` when it denies. It fails closed: a uid outside its subjects, a missing required param, a
 * query that is neither a filter nor `true`, an empty filter from a query function (only `true`
 * means no restriction) and any placeholder without a value (`$user` for Public, a missing
 * attribute, `$user.id`) all give `false`.
 *
 * It gives the filter only. To read `stamp` or `lockedFields` use `applyCondition`.
 */
export const evaluateCondition = (
  definition: ContentApiConditionDefinition,
  params: Params | undefined,
  ctx: Omit<ConditionContext, 'params'>
): Record<string, unknown> | false => {
  const context = conditionContext(definition, params, ctx);

  if (context === null) {
    return false;
  }

  const { query: definedQuery } = definition;
  const query =
    typeof definedQuery === 'function'
      ? callConditionFunction(definition, 'query', () => definedQuery(context))
      : definedQuery;

  if (query === THREW) {
    return false;
  }

  if (query === true) {
    return {};
  }

  if (!isPlainObject(query) || Object.keys(query as object).length === 0) {
    return false;
  }

  const { value, missing } = resolvePlaceholders(query, context);

  return missing.length === 0 ? (value as Record<string, unknown>) : false;
};

/** What a condition gives for a caller: the filter, and the data it stamps and locks if it has any */
export interface AppliedCondition {
  /** `{}` when the condition holds without a filter */
  filter: Record<string, unknown>;
  /** The data forced on create. Absent when the condition has no `stamp`, or it gave none */
  stamp?: Record<string, unknown>;
  /** The fields not writable on update. Absent when the condition has no `lockedFields` */
  lockedFields?: string[];
}

/**
 * The one way to use a condition for a caller: the filter, then `stamp` and `lockedFields`. The
 * condition is evaluated first and `stamp` and `lockedFields` run only when it holds, so a caller the
 * condition denies never reaches them. `false` for a caller it denies, for Public when the
 * definition has a `stamp` (a stamp writes the caller into the data), for a name nobody registered
 * (`bound` undefined, what `providers.condition.get(ref)` gives) and for a `stamp` or `lockedFields`
 * that gives something else than an object or a list of field names.
 */
export const applyCondition = (
  bound: Pick<BoundCondition, 'definition' | 'params'> | undefined,
  ctx: Omit<ConditionContext, 'params'>
): AppliedCondition | false => {
  if (bound === undefined) {
    return false;
  }

  const { definition, params } = bound;

  // A stamp writes the caller into the data (set owner), and Public has no one to write: a condition
  // with a stamp is false for Public, and its stamp is never called
  if (definition.stamp !== undefined && (ctx.user === null || ctx.user === undefined)) {
    return false;
  }

  const filter = evaluateCondition(definition, params, ctx);

  if (filter === false) {
    return false;
  }

  const applied: AppliedCondition = { filter };

  if (definition.stamp !== undefined) {
    const context = conditionContext(definition, params, ctx);

    if (context === null) {
      return false;
    }

    const { stamp: defineStamp } = definition;
    const stamp = callConditionFunction(definition, 'stamp', () => defineStamp(context));

    if (stamp === THREW) {
      return false;
    }

    if (stamp !== null && stamp !== undefined) {
      if (!isPlainObject(stamp)) {
        return false;
      }

      applied.stamp = { ...stamp };
    }
  }

  if (definition.lockedFields !== undefined) {
    const context = conditionContext(definition, params, ctx);

    if (context === null) {
      return false;
    }

    const { lockedFields: defineLocks } = definition;
    const fields = callConditionFunction(definition, 'lockedFields', () => defineLocks(context));

    if (fields === THREW) {
      return false;
    }

    // `Array.from` turns a hole into undefined, which `every` would skip
    if (!Array.isArray(fields) || !Array.from(fields).every((field) => typeof field === 'string')) {
      return false;
    }

    applied.lockedFields = [...fields];
  }

  return applied;
};

/**
 * Throws when `definition` is not a condition definition. Run on registration, so a malformed
 * project or builder condition fails at boot instead of denying at request time.
 */
export function assertConditionDefinition(
  definition: unknown
): asserts definition is ContentApiConditionDefinition {
  const { name } = (isPlainObject(definition) ? definition : {}) as { name?: unknown };

  if (typeof name !== 'string' || name === '') {
    throw new Error('A Content API condition needs a name');
  }

  const fail = (reason: string): never => {
    throw new Error(`Condition "${name}": ${reason}`);
  };

  const { displayName, subjects, params, query, stamp, lockedFields, source } =
    definition as Record<string, unknown>;

  if (typeof displayName !== 'string' || displayName === '') {
    fail('displayName must be a non-empty string');
  }

  if (typeof query !== 'function' && !isPlainObject(query)) {
    fail('query must be a filter object or a function');
  }

  if (isPlainObject(query) && Object.keys(query as object).length === 0) {
    fail(
      'query is an empty filter; a condition with no restriction is a query function returning true'
    );
  }

  const isUidList = Array.isArray(subjects) && subjects.every((uid) => typeof uid === 'string');

  if (subjects !== undefined && typeof subjects !== 'function' && !isUidList) {
    fail('subjects must be a list of uids or a function');
  }

  if (params !== undefined) {
    if (!isPlainObject(params)) {
      fail('params must be an object');
    }

    for (const [param, declaration] of Object.entries(params as object)) {
      const { type, default: fallback } = (isPlainObject(declaration) ? declaration : {}) as {
        type?: unknown;
        default?: unknown;
      };

      if (!PARAM_TYPES.has(type as ContentApiConditionParam['type'])) {
        fail(`param "${param}" has an unknown type`);
      }

      // Checked here so a wrong default fails at boot, not as a condition that is false on every request
      if (
        fallback !== undefined &&
        fallback !== null &&
        !hasType(fallback, type as ContentApiConditionParam['type'])
      ) {
        fail(`the default of param "${param}" is not of its type (${String(type)})`);
      }

      // '' is a missing value for a placeholder (see the header), so a default of '' would make the
      // condition false on every request that doesn't set the param
      if (fallback === '') {
        fail(`the default of param "${param}" is an empty string`);
      }
    }
  }

  for (const [key, value] of Object.entries({ stamp, lockedFields })) {
    if (value !== undefined && typeof value !== 'function') {
      fail(`${key} must be a function`);
    }
  }

  if (source !== undefined && !SOURCES.includes(source as (typeof SOURCES)[number])) {
    fail(`source must be one of ${SOURCES.join(', ')}`);
  }
}

const deepFreeze = <T>(value: T): T => {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    // Frozen first, so a cycle ends at the object already being frozen
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }

  return value;
};

/**
 * What the registry stores for a definition: a validated, deeply frozen copy. Nothing that holds the
 * definition (the provider's `get` and `values`, a plugin that kept the object it registered) can
 * change a registered condition afterwards. The functions in it stay as they are.
 */
export const freezeConditionDefinition = (definition: unknown): ContentApiConditionDefinition => {
  const copy = cloneDeep(definition);

  assertConditionDefinition(copy);

  // A static query that holds a `$profile.` placeholder reads the profile, whatever the definition says
  if (queryReadsProfile(copy.query)) {
    copy.usesProfile = true;
  }

  return deepFreeze(copy);
};
