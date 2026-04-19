import type { Model } from './types';
import { ValidationError } from './errors';
import { hasDraftAndPublish } from './content-types';

export type PublicationFilterMode =
  | 'never-published'
  | 'has-published-version'
  | 'modified'
  | 'unmodified'
  | 'never-published-document'
  | 'has-published-version-document'
  | 'published-without-draft'
  | 'published-with-draft';

const ALLOWED: PublicationFilterMode[] = [
  'never-published',
  'has-published-version',
  'modified',
  'unmodified',
  'never-published-document',
  'has-published-version-document',
  'published-without-draft',
  'published-with-draft',
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

type QueryParamDetails = { source?: string; param?: string; [key: string]: unknown };

/**
 * Validates a `publicationFilter` query value for Content API `validate.query` / `sanitize.query`.
 * Attaches `details.source` and `details.param` so HTTP layer maps to 400 with correct field context.
 */
export const validatePublicationFilterQueryParam = (value: unknown): void => {
  if (value === undefined || value === null) {
    return;
  }

  try {
    parsePublicationFilter(value);
  } catch (e) {
    if (e instanceof ValidationError) {
      const prev = e.details as QueryParamDetails | undefined;
      e.details = {
        ...(prev && typeof prev === 'object' ? prev : {}),
        source: 'query',
        param: 'publicationFilter',
      };
    }
    throw e;
  }
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
 * Document-scoped modes use `documentId` only. Returns null when the model does not use draft & publish.
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
      parts.push(
        `(${aliasA}.${localeCol} = ${aliasB}.${localeCol} OR (${aliasA}.${localeCol} IS NULL AND ${aliasB}.${localeCol} IS NULL))`
      );
    }
    return parts.join(' AND ');
  };

  const documentOn = (aliasA: string, aliasB: string) =>
    `${aliasA}.${docCol} = ${aliasB}.${docCol}`;

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

    case 'never-published-document': {
      if (status === 'published') {
        return idIn(emptyIdSelection(knex, table, idCol));
      }

      const sub = knex(`${table} as d`)
        .select(`d.${idCol}`)
        .whereNull(`d.${pubCol}`)
        .whereNotExists(function (this: any) {
          this.select(knex.raw('1'))
            .from(`${table} as p`)
            .whereRaw(documentOn('p', 'd'))
            .whereNotNull(`p.${pubCol}`);
        });

      return idIn(sub);
    }

    case 'has-published-version-document': {
      if (status === 'draft') {
        const sub = knex(`${table} as d`)
          .select(`d.${idCol}`)
          .whereNull(`d.${pubCol}`)
          .whereExists(function (this: any) {
            this.select(knex.raw('1'))
              .from(`${table} as p`)
              .whereRaw(documentOn('p', 'd'))
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
            .whereRaw(documentOn('d', 'p'))
            .whereNull(`d.${pubCol}`);
        });

      return idIn(sub);
    }

    case 'published-without-draft': {
      if (status === 'draft') {
        return idIn(emptyIdSelection(knex, table, idCol));
      }

      const sub = knex(`${table} as p`)
        .select(`p.${idCol}`)
        .whereNotNull(`p.${pubCol}`)
        .whereNotExists(function (this: any) {
          this.select(knex.raw('1'))
            .from(`${table} as d`)
            .whereRaw(pairOn('d', 'p'))
            .whereNull(`d.${pubCol}`);
        });

      return idIn(sub);
    }

    case 'published-with-draft': {
      if (status === 'draft') {
        return idIn(emptyIdSelection(knex, table, idCol));
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

    default: {
      return null;
    }
  }
};
