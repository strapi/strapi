import { getTranslation } from '../../../utils/getTranslation';

import type { Filters } from '@strapi/admin/strapi-admin';

/**
 * Nothing here may import React or the admin at run time: the vitest runs these in Node, and
 * `Filters` is only a type. What needs a translation is passed in.
 */

type Translate = (
  message: { id: string; defaultMessage: string },
  values?: Record<string, string>
) => string;

type FilterEntry = NonNullable<NonNullable<Filters.Query['filters']>['$and']>[number];

/** What the chips of a condition's query are drawn from: the rows, and what names each row's field */
interface ReadOnlyQuery {
  filters: { $and: FilterEntry[] };
  options: Filters.Filter[];
}

interface Row {
  /** The dotted path of the field: `owner.documentId` */
  path: string;
  operator: string;
  /** What the chip shows, as the picker holds a value: always a string */
  value: string;
}

const NULL_OPERATORS = new Set<string>(['$null', '$notNull']);

const isPlain = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isScalar = (value: unknown): value is string | number | boolean =>
  typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';

/**
 * The rows of one operator and its value, or `undefined` for what a chip can't say. A list reads as
 * its items, comma separated; `$null` and `$notNull` take a flag, and "is not null: false" is "is
 * null".
 */
const toRow = (path: string, operator: string, value: unknown): Row | undefined => {
  if (NULL_OPERATORS.has(operator)) {
    if (typeof value !== 'boolean') {
      return undefined;
    }

    return {
      path,
      operator: value ? operator : operator === '$null' ? '$notNull' : '$null',
      value: 'true',
    };
  }

  if (Array.isArray(value)) {
    return value.length > 0 && value.every(isScalar)
      ? { path, operator, value: value.join(', ') }
      : undefined;
  }

  return isScalar(value) ? { path, operator, value: String(value) } : undefined;
};

/**
 * Walks a static query into rows, all of them true at once. A field with a value, or with
 * operators, is a row for each; a field holding other fields is a relation, whose own fields are
 * rows under its path (`owner.documentId`); `$and` is the same as the fields beside it. `false`
 * for anything else (`$or`, `$not`, an operator on a nested object): that is not a list of rows.
 */
const collect = (query: Record<string, unknown>, prefix: string, rows: Row[]): boolean => {
  for (const [key, value] of Object.entries(query)) {
    if (key === '$and') {
      if (!Array.isArray(value) || !value.every(isPlain)) {
        return false;
      }

      if (!value.every((clause) => collect(clause, prefix, rows))) {
        return false;
      }
    } else if (key.startsWith('$')) {
      return false;
    } else if (!isPlain(value)) {
      const row = toRow(`${prefix}${key}`, '$eq', value);

      if (!row) {
        return false;
      }

      rows.push(row);
    } else {
      const keys = Object.keys(value);

      if (keys.length === 0) {
        return false;
      }

      if (keys.every((each) => each.startsWith('$'))) {
        for (const [operator, operand] of Object.entries(value)) {
          const row = toRow(`${prefix}${key}`, operator, operand);

          if (!row) {
            return false;
          }

          rows.push(row);
        }
      } else if (keys.some((each) => each.startsWith('$'))) {
        return false;
      } else if (!collect(value, `${prefix}${key}.`, rows)) {
        return false;
      }
    }
  }

  return true;
};

/** The field is the signed-in user's relation: `owner.documentId is $user.documentId` */
const SIGNED_IN_USER = '$user.documentId';

const isSignedInUser = (row: Row) =>
  row.operator === '$eq' && row.value === SIGNED_IN_USER && row.path.endsWith('.documentId');

/** What names the field of a row: "owner" for `owner.documentId` when it is the signed-in user */
const nameOf = (row: Row) =>
  isSignedInUser(row) ? row.path.slice(0, -'.documentId'.length) : row.path;

/** What a value that says who or when at the time of a request is called, or `undefined` for a plain value */
const labelOfValue = (row: Row, translate: Translate): string | undefined => {
  if (isSignedInUser(row)) {
    return translate({
      id: getTranslation('conditions.builder.signed-in-user'),
      defaultMessage: 'the signed-in user',
    });
  }

  if (row.value === SIGNED_IN_USER) {
    return translate({
      id: getTranslation('conditions.builder.user-id'),
      defaultMessage: "the signed-in user's ID",
    });
  }

  if (row.value.startsWith('$user.')) {
    return translate(
      {
        id: getTranslation('conditions.builder.user-attribute'),
        defaultMessage: "the signed-in user's {attribute}",
      },
      { attribute: row.value.slice('$user.'.length) }
    );
  }

  if (row.value === '$now') {
    return translate({ id: getTranslation('conditions.builder.now'), defaultMessage: 'now' });
  }

  if (row.value.startsWith('$params.')) {
    return translate(
      {
        id: getTranslation('conditions.view.param-value'),
        defaultMessage: 'the {name} param',
      },
      { name: row.value.slice('$params.'.length) }
    );
  }

  return undefined;
};

/** Never drawn: a chip that can't be changed is never edited, but the picker's chips need an input to read labels from */
const NoInput = () => null;

/**
 * The chips of a condition's static query, as the builder's own read-only chips draw them (the
 * admin's `Filters` list): one per row, `field operator value`. A relation to the signed-in user
 * reads "owner is the signed-in user", and a value that is only known when the query runs reads
 * as what it will be (the signed-in user's email, now, a param). `undefined` when the query is
 * more than a list of rows that are true together (a hand-written `$or`, say): the page then
 * shows it as it is.
 */
const toReadOnlyQuery = (
  query: Record<string, unknown>,
  translate: Translate
): ReadOnlyQuery | undefined => {
  const rows: Row[] = [];

  if (!collect(query, '', rows) || rows.length === 0) {
    return undefined;
  }

  const options = new Map<string, Filters.Filter>();

  for (const row of rows) {
    const name = nameOf(row);
    const known = options.get(name) ?? {
      name,
      label: name,
      type: 'custom' as const,
      input: NoInput,
      options: [],
    };
    const label = labelOfValue(row, translate);
    const list = known.options as Array<{ value: string; label?: string }>;

    if (label !== undefined && !list.some(({ value }) => value === row.value)) {
      list.push({ value: row.value, label });
    }

    options.set(name, known);
  }

  return {
    filters: {
      $and: rows.map((row) => ({ [nameOf(row)]: { [row.operator]: row.value } })),
    },
    options: [...options.values()],
  };
};

export { toReadOnlyQuery };
export type { ReadOnlyQuery, Translate };
