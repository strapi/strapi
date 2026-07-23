import _ from 'lodash/fp';
import type { Knex } from 'knex';

import * as types from '../../utils/types';
import { toColumnName } from './transform';
import type { Ctx } from '../types';

export const applySearch = (knex: Knex.QueryBuilder, query: string, ctx: Ctx) => {
  const { qb, uid, db } = ctx;
  const meta = db.metadata.get(uid);

  const { attributes } = meta;

  const searchColumns = ['id'];

  const stringColumns = Object.keys(attributes).filter((attributeName) => {
    const attribute = attributes[attributeName];
    return (
      types.isScalarAttribute(attribute) &&
      types.isString(attribute.type) &&
      attribute.searchable !== false
    );
  });

  searchColumns.push(...stringColumns);

  if (!_.isNaN(_.toNumber(query))) {
    const numberColumns = Object.keys(attributes).filter((attributeName) => {
      const attribute = attributes[attributeName];
      return (
        types.isScalarAttribute(attribute) &&
        types.isNumber(attribute.type) &&
        attribute.searchable !== false
      );
    });

    searchColumns.push(...numberColumns);
  }

  const aliasSearchColumn = (columnName: string) => {
    // Qualify columns when the query uses joins (e.g. deleteMany/updateMany subqueries).
    return qb.aliasColumn(columnName, qb.hasJoins() ? qb.alias : undefined);
  };

  switch (db.dialect.client) {
    case 'postgres': {
      searchColumns.forEach((attr) => {
        const columnName = toColumnName(meta, attr);
        return knex.orWhereRaw(`??::text ILIKE ?`, [
          aliasSearchColumn(columnName),
          `%${escapeQuery(query, '*%\\')}%`,
        ]);
      });

      break;
    }
    case 'sqlite': {
      searchColumns.forEach((attr) => {
        const columnName = toColumnName(meta, attr);
        return knex.orWhereRaw(`?? LIKE ? ESCAPE '\\'`, [
          aliasSearchColumn(columnName),
          `%${escapeQuery(query, '*%\\')}%`,
        ]);
      });
      break;
    }
    case 'mysql': {
      searchColumns.forEach((attr) => {
        const columnName = toColumnName(meta, attr);
        return knex.orWhereRaw(`?? LIKE ?`, [
          aliasSearchColumn(columnName),
          `%${escapeQuery(query, '*%\\')}%`,
        ]);
      });
      break;
    }
    default: {
      // do nothing
    }
  }
};

const escapeQuery = (query: string, charsToEscape: string, escapeChar = '\\') => {
  return query
    .split('')
    .reduce(
      (escapedQuery, char) =>
        charsToEscape.includes(char)
          ? `${escapedQuery}${escapeChar}${char}`
          : `${escapedQuery}${char}`,
      ''
    );
};
