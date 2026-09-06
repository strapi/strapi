import _ from 'lodash';

export type SortOrder = 'asc' | 'desc';

export interface SortParamsObject {
  [key: string]: SortOrder | SortParamsObject;
}

export type SortParams = string | string[] | SortParamsObject | SortParamsObject[];

const isPlainObject = (value: unknown): value is Record<string, unknown> => _.isPlainObject(value);

/**
 * Splits a REST sort string into trimmed segments with a non-empty field (drops '', ',', trailing commas).
 */
export function getMeaningfulSortSegments(sort: string): string[] {
  return sort
    .split(',')
    .map((segment) => segment.trim())
    .filter((segment) => {
      if (segment.length === 0) {
        return false;
      }

      const [field] = segment.split(':');
      return field.trim().length > 0;
    });
}

/**
 * Whether a nested sort object ({ field: 'asc' } or { relation: { name: 'desc' } }) specifies
 * at least one field to sort on. Empty objects and keys with blank orders are treated as no sort.
 */
function hasMeaningfulSortObject(sort: SortParamsObject): boolean {
  return Object.keys(sort).some((key) => {
    const order = sort[key];

    if (typeof order === 'string') {
      return order.length > 0;
    }

    if (isPlainObject(order)) {
      return hasMeaningfulSortObject(order as SortParamsObject);
    }

    return false;
  });
}

/** Whether a REST-style sort string contains at least one meaningful segment. */
function hasMeaningfulStringSort(sort: string): boolean {
  return getMeaningfulSortSegments(sort).length > 0;
}

/**
 * Whether `sort` carries a real ordering instruction. Empty or absent sort must stay undefined so
 * populated relations keep join-table connect order (GraphQL defaults nested sort to []; REST qs
 * `sort[]` with strictNullHandling parses to `[null]`).
 */
export function hasSort(sort?: unknown): sort is SortParams {
  if (sort === undefined || sort === null) {
    return false;
  }

  if (typeof sort === 'string') {
    return hasMeaningfulStringSort(sort);
  }

  if (Array.isArray(sort)) {
    if (sort.length === 0) {
      return false;
    }

    return sort.some((item) => {
      if (typeof item === 'string') {
        return hasMeaningfulStringSort(item);
      }

      if (isPlainObject(item)) {
        return hasMeaningfulSortObject(item as SortParamsObject);
      }

      return false;
    });
  }

  if (isPlainObject(sort)) {
    return hasMeaningfulSortObject(sort as SortParamsObject);
  }

  return false;
}
