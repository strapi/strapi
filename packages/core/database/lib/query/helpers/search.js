'use strict';

const _ = require('lodash/fp');

const types = require('../../types');

const applySearch = (qb, query, ctx) => {
  const { alias, uid, db } = ctx;

  const { attributes } = db.metadata.get(uid);

  const searchColumns = ['id'];

  const stringColumns = Object.keys(attributes).filter(attributeName => {
    const attribute = attributes[attributeName];
    return types.isString(attribute.type) && attribute.searchable !== false;
  });

  searchColumns.push(...stringColumns);

  if (!_.isNaN(_.toNumber(query))) {
    const numberColumns = Object.keys(attributes).filter(attributeName => {
      const attribute = attributes[attributeName];
      return types.isNumber(attribute.type) && attribute.searchable !== false;
    });

    searchColumns.push(...numberColumns);
  }

  switch (db.dialect.client) {
    case 'postgres': {
      searchColumns.forEach(attr =>
        qb.orWhereRaw(`"${alias}"."${attr}"::text ILIKE ?`, `%${escapeQuery(query, '*%\\')}%`)
      );

      break;
    }
    case 'sqlite': {
      searchColumns.forEach(attr =>
        qb.orWhereRaw(`"${alias}"."${attr}" LIKE ? ESCAPE '\\'`, `%${escapeQuery(query, '*%\\')}%`)
      );
      break;
    }
    case 'mysql': {
      searchColumns.forEach(attr =>
        qb.orWhereRaw(`\`${alias}\`.\`${attr}\` LIKE ?`, `%${escapeQuery(query, '*%\\')}%`)
      );
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
