/**
 * Better Auth `where` clause -> Document Service `filters`.
 *
 * Ported from plugin-better-auth by Boaz Poolman (strapi-community), MIT licensed.
 * https://github.com/strapi-community/plugin-better-auth
 *
 * Differences from the original:
 * - field names are not mapped again. The adapter factory has already turned logical names into
 *   stored names and `id` into `documentId` (`mapKeysTransformInput`) before the adapter sees a
 *   `where`, and asking the schema about `documentId` would throw.
 * - conditions on the same field no longer overwrite each other: `expiresAt > a AND expiresAt < b`
 *   keeps both.
 * - `mode: 'insensitive'` is honored through Strapi's `$eqi`, `$nei`, `$containsi`, ... operators.
 */
import type { CleanedWhere } from 'better-auth/adapters';

export type StrapiFilters = Record<string, unknown>;

type Condition = Record<string, unknown>;

const OPERATORS = {
  eq: '$eq',
  ne: '$ne',
  in: '$in',
  not_in: '$notIn',
  gt: '$gt',
  gte: '$gte',
  lt: '$lt',
  lte: '$lte',
  contains: '$contains',
  starts_with: '$startsWith',
  ends_with: '$endsWith',
} as const;

const INSENSITIVE_OPERATORS = {
  eq: '$eqi',
  ne: '$nei',
  contains: '$containsi',
  starts_with: '$startsWithi',
  ends_with: '$endsWithi',
} as const;

type Operator = keyof typeof OPERATORS;
type InsensitiveOperator = keyof typeof INSENSITIVE_OPERATORS;

const isInsensitiveOperator = (operator: Operator): operator is InsensitiveOperator =>
  operator in INSENSITIVE_OPERATORS;

const isInsensitiveStringMatch = ({ mode, value }: CleanedWhere) =>
  mode === 'insensitive' &&
  (typeof value === 'string' ||
    (Array.isArray(value) && value.every((item) => typeof item === 'string')));

const toCondition = (where: CleanedWhere): Condition => {
  const { field, value } = where;
  const operator: Operator = where.operator && where.operator in OPERATORS ? where.operator : 'eq';
  const insensitive = isInsensitiveStringMatch(where);

  if (insensitive && Array.isArray(value) && value.length > 0) {
    // Strapi has no case-insensitive `$in`, so spell the list out. An empty list falls through to
    // a plain `$in: []`, which matches nothing, where an empty `$or` would match everything.
    if (operator === 'in') {
      return { $or: value.map((item) => ({ [field]: { $eqi: item } })) };
    }

    if (operator === 'not_in') {
      return { $and: value.map((item) => ({ [field]: { $nei: item } })) };
    }
  }

  if (insensitive && isInsensitiveOperator(operator)) {
    return { [field]: { [INSENSITIVE_OPERATORS[operator]]: value } };
  }

  return { [field]: { [OPERATORS[operator]]: value } };
};

/**
 * Better Auth combines a `where` as `(every AND condition) AND (any OR condition)`, which is what
 * the SQL adapters do. A single condition stays flat, `{ field: { $eq: value } }`.
 */
export const transformFilters = (where: readonly CleanedWhere[] | undefined): StrapiFilters => {
  if (!where || where.length === 0) {
    return {};
  }

  const andConditions: Condition[] = [];
  const orConditions: Condition[] = [];

  for (const clause of where) {
    (clause.connector === 'OR' ? orConditions : andConditions).push(toCondition(clause));
  }

  const clauses = [...andConditions];

  if (orConditions.length > 0) {
    clauses.push(orConditions.length === 1 ? orConditions[0] : { $or: orConditions });
  }

  return clauses.length === 1 ? clauses[0] : { $and: clauses };
};
