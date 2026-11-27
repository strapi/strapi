import { errors } from '@strapi/utils';

const IS_USED_KEY = 'isUsed';

type Query = Record<string, unknown>;
type Clause = Record<string, unknown>;

const isClause = (value: unknown): value is Clause =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const parseBoolean = (value: unknown): boolean | undefined => {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return undefined;
};

const parseIsUsedCondition = (condition: unknown): boolean => {
  if (isClause(condition)) {
    const entries = Object.entries(condition);

    if (entries.length === 1) {
      const [operator, rawValue] = entries[0];
      const value = parseBoolean(rawValue);

      if (value !== undefined && operator === '$eq') return value;
      if (value !== undefined && operator === '$ne') return !value;
    }
  }

  throw new errors.ValidationError(
    `Invalid ${IS_USED_KEY} filter: expected { $eq: true | false } or { $ne: true | false }`
  );
};

const containsIsUsedKey = (value: unknown): boolean => {
  if (Array.isArray(value)) return value.some(containsIsUsedKey);
  if (!isClause(value)) return false;

  return Object.entries(value).some(
    ([key, nested]) => key === IS_USED_KEY || containsIsUsedKey(nested)
  );
};

/**
 * `isUsed` is not an attribute of the file model. It is only read from the direct children of
 * the top-level `filters.$and`, which is where the Media Library list puts its filters.
 *
 * The admin query validation does not reject unknown keys, it drops them. An `isUsed` found
 * anywhere else would then be ignored and return an unfiltered list that looks filtered, so it
 * throws instead.
 */
const extractIsUsedFilter = (query: Query): { query: Query; isUsed: boolean | undefined } => {
  const { filters } = query;
  let isUsed: boolean | undefined;
  let remainingFilters = filters;

  if (isClause(filters) && Array.isArray(filters.$and)) {
    const remainingClauses: unknown[] = [];

    for (const clause of filters.$and) {
      if (!isClause(clause) || !(IS_USED_KEY in clause)) {
        remainingClauses.push(clause);
        continue;
      }

      if (isUsed !== undefined) {
        throw new errors.ValidationError(`The ${IS_USED_KEY} filter can only be used once`);
      }

      const { [IS_USED_KEY]: condition, ...otherConditions } = clause;
      isUsed = parseIsUsedCondition(condition);

      if (Object.keys(otherConditions).length > 0) {
        remainingClauses.push(otherConditions);
      }
    }

    const { $and, ...otherFilters } = filters;

    // Query validation rejects an empty `$and`, which is left when `isUsed` was the only clause.
    remainingFilters =
      remainingClauses.length > 0 ? { ...filters, $and: remainingClauses } : otherFilters;
  }

  if (containsIsUsedKey(remainingFilters)) {
    throw new errors.ValidationError(
      `The ${IS_USED_KEY} filter is only supported as a direct child of filters.$and`
    );
  }

  if (isUsed === undefined) {
    return { query, isUsed };
  }

  const { filters: _, ...queryWithoutFilters } = query;

  return isClause(remainingFilters) && Object.keys(remainingFilters).length === 0
    ? { query: queryWithoutFilters, isUsed }
    : { query: { ...query, filters: remainingFilters }, isUsed };
};

export { extractIsUsedFilter };
