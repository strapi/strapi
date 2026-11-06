import _ from 'lodash';
import { engine } from '@strapi/permissions';
import type { Schema, UID } from '@strapi/types';
import { DENY_ALL_FILTER, withDeny } from '@strapi/utils';

import { compiledPermissionsOf } from './generate-ability';

export { DENY_ALL_FILTER, withDeny };

/**
 * The clauses of a query: its values, counted down through objects and lists. An empty list is one
 * (`$in: []` is a clause that matches nothing), an empty object none.
 */
const countClauses = (value: unknown): number => {
  if (Array.isArray(value)) {
    return value.length === 0 ? 1 : _.sum(value.map(countClauses));
  }

  if (_.isPlainObject(value)) {
    return _.sum(Object.values(value as object).map(countClauses));
  }

  return 1;
};

/** The group operators: each holds a list of wheres */
const GROUP_KEYS = ['$and', '$or'];

/**
 * Whether a query holds a part that restricts nothing at the query layer, so a condition made of it
 * would match more than it says:
 * - an object with no clause in it, below the root: a value (`{ tags: {} }`, `{ owner: {} }`,
 *   `$elemMatch: {}`) or an item of a group (`$or: [{}]`). The query layer joins a relation it names
 *   with an empty object but adds no predicate; `buildStrapiQuery` unwraps an `$elemMatch` to one;
 *   and an empty object is no clause to count in {@link countClauses}.
 * - an empty `$and` or `$or` list, which opens a group with nothing in it.
 *
 * The root itself may be `{}`: that is a rule without conditions. Looked for on the CASL query, at
 * any depth, so what `buildStrapiQuery` unwraps is found too.
 */
const holdsEmptyPart = (value: unknown, isRoot = true): boolean => {
  if (Array.isArray(value)) {
    return value.some((item) => holdsEmptyPart(item, false));
  }

  if (!_.isPlainObject(value)) {
    return false;
  }

  if (!isRoot && countClauses(value) === 0) {
    return true;
  }

  return Object.entries(value as object).some(
    ([key, child]) =>
      (GROUP_KEYS.includes(key) && Array.isArray(child) && child.length === 0) ||
      holdsEmptyPart(child, false)
  );
};

/** The model of a uid, when there is one to read: not every caller's `strapi` can give it */
const modelOf = (uid: string | undefined): Schema.Schema | undefined =>
  uid !== undefined && typeof strapi !== 'undefined' && typeof strapi.getModel === 'function'
    ? strapi.getModel(uid as UID.Schema)
    : undefined;

/**
 * Whether filters name, at any depth, an attribute of the type they are on that the Document Service
 * can't filter by: a password or dynamic-zone attribute, or a morph relation. Its query params
 * converter (`convertAndSanitizeFilters`) removes a password and a dynamic zone from the whole
 * `where` of a query, the conditions ANDed into it included, and reads a morph relation's filters
 * with no schema (which strips every attribute but `id` and `documentId`), so a condition clause on
 * one would silently disappear and the condition would match more than it says. Walked as that
 * converter walks: through relations, components and media to their target, and through operators
 * and the operator maps of scalar attributes on the same type.
 */
const namesStrippedAttribute = (filters: unknown, model: Schema.Schema | undefined): boolean => {
  if (Array.isArray(filters)) {
    return filters.some((item) => namesStrippedAttribute(item, model));
  }

  if (!_.isPlainObject(filters)) {
    return false;
  }

  return Object.entries(filters as Record<string, unknown>).some(([key, value]) => {
    const attribute = model?.attributes?.[key];

    if (attribute === undefined) {
      return _.isObject(value) && namesStrippedAttribute(value, model);
    }

    switch (attribute.type) {
      case 'password':
      case 'dynamiczone':
        return true;
      case 'relation':
        // A morph relation has no target: the converter reads its filters with no schema, so all
        // but `id`, `documentId` and operators are stripped, and the query layer refuses to filter
        // on it at all. Any mention of one is a condition that can't be written.
        return 'target' in attribute && typeof attribute.target === 'string'
          ? namesStrippedAttribute(value, modelOf(attribute.target))
          : true;
      case 'component':
        return namesStrippedAttribute(value, modelOf(attribute.component));
      case 'media':
        return namesStrippedAttribute(value, modelOf('plugin::upload.file'));
      default:
        return _.isObject(value) && namesStrippedAttribute(value, model);
    }
  });
};

/**
 * The group keys (`$and`, `$or`) that a key of a where object leaves in the object the query layer
 * builds from it (`processWhere`): a group key is its own; a key holding a where, a relation or
 * component filter, leaves what that where leaves. Other operators (`$not`, `$eq`, ...) leave none:
 * `$not` stays under its own key, and an object of operators is the filter of one attribute.
 */
const groupsOf = (key: string, value: unknown): string[] => {
  if (GROUP_KEYS.includes(key)) {
    return [key];
  }

  if (key.startsWith('$') || !_.isPlainObject(value)) {
    return [];
  }

  return Object.entries(value as object).flatMap(([child, grandchild]) =>
    groupsOf(child, grandchild)
  );
};

/**
 * Splits the where objects of a filter whose keys would give the same group key. The
 * query layer merges what each key of a where object gives into one object with `Object.assign`, so
 * of two keys that each leave an `$or` (`{ owner: { $or: [...] }, team: { $or: [...] } }`) the later
 * one replaces the other, and its clauses are silently lost: the filter would match more than the
 * condition says. The keys of a where object are an implicit AND, so such an object becomes
 * `{ $and: [{ k1: v1 }, { k2: v2 }] }`, which the query layer reads as separate wheres. Bottom up, so
 * a where that is split gives the `$and` its parent then sees. Objects with no such keys are returned
 * as they are (a copy), and a filter that is already split is not split again.
 */
const splitGroupSiblings = (where: unknown): unknown => {
  if (Array.isArray(where)) {
    return where.map(splitGroupSiblings);
  }

  if (!_.isPlainObject(where)) {
    return where;
  }

  const entries = Object.entries(where as object).map(
    ([key, value]) => [key, splitGroupSiblings(value)] as const
  );
  const groups = entries.flatMap(([key, value]) => groupsOf(key, value));

  if (new Set(groups).size === groups.length) {
    return Object.fromEntries(entries);
  }

  return { $and: entries.map(([key, value]) => ({ [key]: value })) };
};

/**
 * Whether the condition of one rule would be written to the query as it says: it holds no part that
 * restricts nothing (an empty object, an empty group), `buildStrapiQuery` loses none of its clauses,
 * and (given the uid the filters are for) it names no password, dynamic-zone or morph relation
 * attribute (see {@link toFilters}). One that wouldn't is dropped, as if it failed.
 */
const isWritableCondition = (condition: unknown, uid?: string): boolean => {
  if (holdsEmptyPart(condition, false)) {
    return false;
  }

  const query = engine.buildStrapiQuery(condition);

  if (countClauses(query) !== countClauses(condition)) {
    return false;
  }

  return !namesStrippedAttribute(query, modelOf(uid));
};

/** A CASL query of conditioned rules: `{ $or: [conditions of each rule] }`, and nothing else */
const isRulesQuery = (caslQuery: unknown): caslQuery is { $or: unknown[] } =>
  _.isPlainObject(caslQuery) &&
  Object.keys(caslQuery as object).length === 1 &&
  Array.isArray((caslQuery as { $or?: unknown }).$or) &&
  (caslQuery as { $or: unknown[] }).$or.length > 0;

/**
 * The Strapi filters of a CASL query (`{ $or: [conditions, …] }`, or null for no rule). A rule whose
 * condition would not be written as it says (see {@link isWritableCondition}) is dropped as if its
 * condition failed: the other rules still give what they give, and only when no rule
 * remains is it a fresh deny filter. Any other query is judged whole, and denied when it fails. The
 * filters it gives are normalised: where objects whose keys would collide at the query layer are
 * split into an explicit `$and`.
 */
export const fromCaslQuery = (caslQuery: unknown, uid?: string): Record<string, unknown> | null => {
  let judged = caslQuery;

  if (isRulesQuery(caslQuery)) {
    const kept = caslQuery.$or.filter((condition) => isWritableCondition(condition, uid));

    if (kept.length === 0) {
      return withDeny(null);
    }

    judged = { $or: kept };
  } else if (holdsEmptyPart(caslQuery)) {
    return withDeny(null);
  }

  const query = engine.buildStrapiQuery(judged);

  if (countClauses(query) !== countClauses(judged)) {
    return withDeny(null);
  }

  if (namesStrippedAttribute(query, modelOf(uid))) {
    return withDeny(null);
  }

  return splitGroupSiblings(query) as Record<string, unknown> | null;
};

/**
 * The query filters the caller's data rules give for a data action (`find`, `update`,
 * `read-drafts`, …) on a content type: admin RBAC's `rulesToQuery` + `buildStrapiQuery`, run on the
 * data ability.
 *
 * - `{}`: a rule without conditions applies, so nothing is filtered. Also what an ability that is
 *   not subject-aware gives (API tokens, Users & Permissions): it has no data rules.
 * - `null`: no data rule applies. What that means is the checker's call: route-level only when the
 *   caller holds no row for (action, uid), deny when it holds one whose conditions all failed.
 * - otherwise `{ $or: [conditions of each rule] }`.
 *
 * Reads the data ability only. An inverted rule (`cannot`) gives the deny filter for the whole
 * action: `generateAbility` builds none, but CASL would turn it into a query for exactly the rows it
 * forbids. A conditioned rule is dropped, as if its condition failed, in three cases (the second and
 * third each cover more than one kind of condition); the other rules of the action still apply, and
 * the action gives the deny filter, never `null` or a wider filter, only when no rule remains
 *:
 *
 * - `buildStrapiQuery` would lose a clause of a condition, so its filter would match more than the
 *   condition says. It writes each key with lodash `set`, which skips `constructor`, `prototype` and
 *   `__proto__`, lets a nested object overwrite the dotted key (`'owner.documentId'`, then `owner`)
 *   written before it, keeps only the `$elemMatch` of an object that has other keys too, and writes
 *   `$nin` and `$notIn` (or `$exists` and `$notNull`) to the same key. Rather than know each one, the
 *   clauses of the condition and of the filter are counted: any that differ lost one.
 * - A condition holds a part that restricts nothing: an object with no clause in it below the root
 *   (`{ tags: {} }`, `{ owner: {} }`, `$elemMatch: {}`, `$or: [{}]`; `buildStrapiQuery` turns an
 *   `$elemMatch` into one, and an empty object is no clause to count), or an empty `$and` / `$or`.
 *   The query layer applies each as no restriction.
 * - A condition names a password, dynamic-zone or morph relation attribute of the type, or of a type
 *   it reaches through a relation, component or media. The Document Service's query
 *   params converter removes a password and a dynamic zone from a query's filters after
 *   `sanitize.query` has ANDed the condition in, and strips what is under a morph relation, which
 *   the query layer then refuses; either way the condition would match more than it says. REST,
 *   GraphQL and `assertEntry` all read their filters from here.
 *
 * The filters it gives are normalised for the query layer: a where object whose keys would collide
 * (two relation filters that each hold an `$or`) is split into an explicit `$and`.
 */
export const toFilters = (
  auth: unknown,
  action: string,
  uid: string
): Record<string, unknown> | null => {
  const compiled = compiledPermissionsOf(auth);

  if (compiled === null) {
    return {};
  }

  if (compiled.ability.rulesFor(action, uid).some((rule) => rule.inverted)) {
    return withDeny(null);
  }

  return fromCaslQuery(engine.buildCaslQuery(compiled.ability, action, uid), uid);
};
