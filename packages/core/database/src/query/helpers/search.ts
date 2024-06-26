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

  switch (db.dialect.client) {
    case 'postgres': {
      searchColumns.forEach((attr) => {
        const columnName = toColumnName(meta, attr);
        return knex.orWhereRaw(`??::text ILIKE ?`, [
          qb.aliasColumn(columnName),
          `%${escapeQuery(query, '*%\\')}%`,
        ]);
      });

      break;
    }
    case 'sqlite': {
      searchColumns.forEach((attr) => {
        const columnName = toColumnName(meta, attr);
        return knex.orWhereRaw(`?? LIKE ? ESCAPE '\\'`, [
          qb.aliasColumn(columnName),
          `%${escapeQuery(query, '*%\\')}%`,
        ]);
      });
      break;
    }
    case 'mysql': {
      searchColumns.forEach((attr) => {
        const columnName = toColumnName(meta, attr);
        return knex.orWhereRaw(`?? LIKE ?`, [
          qb.aliasColumn(columnName),
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
