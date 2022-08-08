'use strict';

const _ = require('lodash/fp');

const types = require('../../types');
const { toColumnName } = require('./transform');

const applySearch = (knex, query, ctx) => {
  const { qb, uid, db } = ctx;
  const meta = db.metadata.get(uid);

  const { attributes } = meta;

  const searchColumns = ['id'];

  const stringColumns = Object.keys(attributes).filter((attributeName) => {
    const attribute = attributes[attributeName];
    return types.isString(attribute.type) && attribute.searchable !== false;
  });

  searchColumns.push(...stringColumns);

  if (!_.isNaN(_.toNumber(query))) {
    const numberColumns = Object.keys(attributes).filter((attributeName) => {
      const attribute = attributes[attributeName];
      return types.isNumber(attribute.type) && attribute.searchable !== false;
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

const escapeQuery = (query, charsToEscape, escapeChar = '\\') => {
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

module.exports = {
  applySearch,
};
