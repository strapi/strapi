import type { Model } from './types';
import { ValidationError } from './errors';
import { hasDraftAndPublish } from './content-types';

export type PublicationFilterMode =
  | 'never-published'
  | 'has-published-version'
  | 'modified'
  | 'unmodified';

const ALLOWED: PublicationFilterMode[] = [
  'never-published',
  'has-published-version',
  'modified',
  'unmodified',
];

export const parsePublicationFilter = (value: unknown): PublicationFilterMode | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string' && (ALLOWED as string[]).includes(value)) {
    return value as PublicationFilterMode;
  }

  throw new ValidationError(
    `Invalid value for 'publicationFilter'. Expected one of: ${ALLOWED.join(', ')}.`
  );
};

const columnName = (meta: any, attr: string): string => {
  const a = meta.attributes[attr];
  if (!a) {
    return attr;
  }
  return ('columnName' in a && a.columnName) || attr;
};

const emptyIdSelection = (knex: any, table: string, idCol: string) =>
  knex(table).select(`${table}.${idCol}`).whereRaw('0 = 1');

/**
 * Extra `id IN (subquery)` filter for publicationFilter, scoped to (documentId, locale) when i18n is enabled.
 * Returns null when the model does not use draft & publish.
 */
export const buildPublicationFilterWhere = (
  knex: any,
  meta: any,
  model: Model | undefined,
  mode: PublicationFilterMode,
  status: 'draft' | 'published'
): Record<string, unknown> | null => {
  if (!model || !hasDraftAndPublish(model)) {
    return null;
  }

  const table = meta.tableName;
  const idCol = columnName(meta, 'id');
  const docCol = columnName(meta, 'documentId');
  const pubCol = columnName(meta, 'publishedAt');
  const updatedCol = columnName(meta, 'updatedAt');
  const hasLocale = Boolean(meta.attributes.locale);
  const localeCol = hasLocale ? columnName(meta, 'locale') : null;

  const pairOn = (aliasA: string, aliasB: string) => {
    const parts = [`${aliasA}.${docCol} = ${aliasB}.${docCol}`];
    if (localeCol) {
      parts.push(`${aliasA}.${localeCol} = ${aliasB}.${localeCol}`);
    }
    return parts.join(' AND ');
  };

  const idIn = (sub: any) => ({ id: { $in: sub } });

  switch (mode) {
    case 'never-published': {
      if (status === 'published') {
        return idIn(emptyIdSelection(knex, table, idCol));
      }

      const sub = knex(`${table} as d`)
        .select(`d.${idCol}`)
        .whereNull(`d.${pubCol}`)
        .whereNotExists(function (this: any) {
          this.select(knex.raw('1'))
            .from(`${table} as p`)
            .whereRaw(pairOn('p', 'd'))
            .whereNotNull(`p.${pubCol}`);
        });

      return idIn(sub);
    }

    case 'has-published-version': {
      if (status === 'draft') {
        const sub = knex(`${table} as d`)
          .select(`d.${idCol}`)
          .whereNull(`d.${pubCol}`)
          .whereExists(function (this: any) {
            this.select(knex.raw('1'))
              .from(`${table} as p`)
              .whereRaw(pairOn('p', 'd'))
              .whereNotNull(`p.${pubCol}`);
          });

        return idIn(sub);
      }

      const sub = knex(`${table} as p`)
        .select(`p.${idCol}`)
        .whereNotNull(`p.${pubCol}`)
        .whereExists(function (this: any) {
          this.select(knex.raw('1'))
            .from(`${table} as d`)
            .whereRaw(pairOn('d', 'p'))
            .whereNull(`d.${pubCol}`);
        });

      return idIn(sub);
    }

    case 'modified': {
      if (status === 'draft') {
        const sub = knex(`${table} as d`)
          .select(`d.${idCol}`)
          .whereNull(`d.${pubCol}`)
          .whereExists(function (this: any) {
            this.select(knex.raw('1'))
              .from(`${table} as p`)
              .whereRaw(pairOn('p', 'd'))
              .whereNotNull(`p.${pubCol}`)
              .whereRaw(`d.${updatedCol} > p.${updatedCol}`);
          });

        return idIn(sub);
      }

      const sub = knex(`${table} as p`)
        .select(`p.${idCol}`)
        .whereNotNull(`p.${pubCol}`)
        .whereExists(function (this: any) {
          this.select(knex.raw('1'))
            .from(`${table} as d`)
            .whereRaw(pairOn('d', 'p'))
            .whereNull(`d.${pubCol}`)
            .whereRaw(`d.${updatedCol} > p.${updatedCol}`);
        });

      return idIn(sub);
    }

    case 'unmodified': {
      if (status === 'draft') {
        const sub = knex(`${table} as d`)
          .select(`d.${idCol}`)
          .whereNull(`d.${pubCol}`)
          .whereExists(function (this: any) {
            this.select(knex.raw('1'))
              .from(`${table} as p`)
              .whereRaw(pairOn('p', 'd'))
              .whereNotNull(`p.${pubCol}`)
              .whereRaw(`d.${updatedCol} <= p.${updatedCol}`);
          });

        return idIn(sub);
      }

      const sub = knex(`${table} as p`)
        .select(`p.${idCol}`)
        .whereNotNull(`p.${pubCol}`)
        .whereExists(function (this: any) {
          this.select(knex.raw('1'))
            .from(`${table} as d`)
            .whereRaw(pairOn('d', 'p'))
            .whereNull(`d.${pubCol}`)
            .whereRaw(`d.${updatedCol} <= p.${updatedCol}`);
        });

      return idIn(sub);
    }

    default: {
      return null;
    }
  }
};
