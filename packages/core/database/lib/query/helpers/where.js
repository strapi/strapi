'use strict';

const _ = require('lodash/fp');

const types = require('../../types');
const { createJoin } = require('./join');

const GROUP_OPERATORS = ['$and', '$or'];
const OPERATORS = [
  '$not',
  '$in',
  '$notIn',
  '$eq',
  '$ne',
  '$gt',
  '$gte',
  '$lt',
  '$lte',
  '$null',
  '$notNull',
  '$between',
  '$startsWith',
  '$endsWith',
  '$contains',
  '$notContains',
  '$containsi',
  '$notContainsi',
];

const ARRAY_OPERATORS = ['$in', '$notIn', '$between'];

const isOperator = key => OPERATORS.includes(key);

/**
 * Process where parameter
 * @param {Object} where
 * @param {Object} ctx
 * @param {number} depth
 * @returns {Object}
 */
const processWhere = (where, ctx, depth = 0) => {
  if (!_.isArray(where) && !_.isPlainObject(where)) {
    throw new Error('Where must be an array or an object');
  }

  if (_.isArray(where)) {
    return where.map(sub => processWhere(sub, ctx));
  }

  const processNested = (where, ctx) => {
    if (!_.isPlainObject(where)) {
      return where;
    }

    return processWhere(where, ctx, depth + 1);
  };

  const { db, uid, qb, alias } = ctx;

  const filters = {};

  // for each key in where
  for (const key in where) {
    const value = where[key];
    const attribute = db.metadata.get(uid).attributes[key];

    // if operator $and $or then loop over them
    if (GROUP_OPERATORS.includes(key)) {
      filters[key] = value.map(sub => processNested(sub, ctx));
      continue;
    }

    if (key === '$not') {
      filters[key] = processNested(value, ctx);
      continue;
    }

    if (isOperator(key)) {
      if (depth == 0) {
        throw new Error(
          `Only $and, $or and $not can by used as root level operators. Found ${key}.`
        );
      }

      filters[key] = processNested(value, ctx);
      continue;
    }

    if (!attribute) {
      // TODO: if targeting a column name instead of an attribute

      // if key as an alias don't add one
      if (key.indexOf('.') >= 0) {
        filters[key] = processNested(value, ctx);
      } else {
        filters[qb.aliasColumn(key, alias)] = processNested(value, ctx);
      }
      continue;

      // throw new Error(`Attribute ${key} not found on model ${uid}`);
    }

    // move to if else to check for scalar / relation / components & throw for other types
    if (attribute.type === 'relation') {
      // TODO: pass down some filters (e.g published at)

      // attribute
      const subAlias = createJoin(ctx, {
        alias: alias || qb.alias,
        uid,
        attributeName: key,
        attribute,
      });

      let nestedWhere = processNested(value, {
        db,
        qb,
        alias: subAlias,
        uid: attribute.target,
      });

      if (!_.isPlainObject(nestedWhere) || isOperator(_.keys(nestedWhere)[0])) {
        nestedWhere = { [qb.aliasColumn('id', subAlias)]: nestedWhere };
      }

      // TODO: use a better merge logic (push to $and when collisions)
      Object.assign(filters, nestedWhere);

      continue;
    }

    if (types.isScalar(attribute.type)) {
      // TODO: convert attribute name to column name
      // TODO: cast to DB type
      filters[qb.aliasColumn(key, alias)] = processNested(value, ctx);
      continue;
    }

    throw new Error(`You cannot filter on ${attribute.type} types`);
  }

  return filters;
};

const applyOperator = (qb, column, operator, value) => {
  if (Array.isArray(value) && !ARRAY_OPERATORS.includes(operator)) {
    return qb.where(subQB => {
      value.forEach(subValue =>
        subQB.orWhere(innerQB => {
          applyOperator(innerQB, column, operator, subValue);
        })
      );
    });
  }

  switch (operator) {
    case '$not': {
      qb.whereNot(qb => applyWhereToColumn(qb, column, value));
      break;
    }

    case '$in': {
      qb.whereIn(column, _.castArray(value));
      break;
    }

    case '$notIn': {
      qb.whereNotIn(column, _.castArray(value));
      break;
    }

    case '$eq': {
      if (value === null) {
        qb.whereNull(column);
        break;
      }

      qb.where(column, value);
      break;
    }
    case '$ne': {
      if (value === null) {
        qb.whereNotNull(column);
        break;
      }

      qb.where(column, '<>', value);
      break;
    }
    case '$gt': {
      qb.where(column, '>', value);
      break;
    }
    case '$gte': {
      qb.where(column, '>=', value);
      break;
    }
    case '$lt': {
      qb.where(column, '<', value);
      break;
    }
    case '$lte': {
      qb.where(column, '<=', value);
      break;
    }
    case '$null': {
      // TODO: make this better
      if (value) {
        qb.whereNull(column);
      }
      break;
    }
    case '$notNull': {
      if (value) {
        qb.whereNotNull(column);
      }

      break;
    }
    case '$between': {
      qb.whereBetween(column, value);
      break;
    }

    // TODO: add casting logic
    case '$startsWith': {
      qb.where(column, 'like', `${value}%`);
      break;
    }
    case '$endsWith': {
      qb.where(column, 'like', `%${value}`);
      break;
    }
    case '$contains': {
      qb.where(column, 'like', `%${value}%`);
      break;
    }

    case '$notContains': {
      qb.whereNot(column, 'like', `%${value}%`);
      break;
    }

    case '$containsi': {
      qb.whereRaw(`${fieldLowerFn(qb)} LIKE LOWER(?)`, [column, `%${value}%`]);
      break;
    }

    case '$notContainsi': {
      qb.whereRaw(`${fieldLowerFn(qb)} NOT LIKE LOWER(?)`, [column, `%${value}%`]);
      break;
    }

    // TODO: json operators

    // TODO: relational operators every/some/exists/size ...

    default: {
      throw new Error(`Undefined operator ${operator}`);
    }
  }
};

const applyWhereToColumn = (qb, column, columnWhere) => {
  if (!_.isPlainObject(columnWhere)) {
    if (Array.isArray(columnWhere)) {
      return qb.whereIn(column, columnWhere);
    }

    return qb.where(column, columnWhere);
  }

  // TODO: handle casing
  Object.keys(columnWhere).forEach(operator => {
    const value = columnWhere[operator];

    applyOperator(qb, column, operator, value);
  });
};

const applyWhere = (qb, where) => {
  if (!_.isArray(where) && !_.isPlainObject(where)) {
    throw new Error('Where must be an array or an object');
  }

  if (_.isArray(where)) {
    return qb.where(subQB => where.forEach(subWhere => applyWhere(subQB, subWhere)));
  }

  Object.keys(where).forEach(key => {
    const value = where[key];

    if (key === '$and') {
      return qb.where(subQB => {
        value.forEach(v => applyWhere(subQB, v));
      });
    }

    if (key === '$or') {
      return qb.where(subQB => {
        value.forEach(v => subQB.orWhere(inner => applyWhere(inner, v)));
      });
    }

    if (key === '$not') {
      return qb.whereNot(qb => applyWhere(qb, value));
    }

    applyWhereToColumn(qb, key, value);
  });
};

const fieldLowerFn = qb => {
  // Postgres requires string to be passed
  if (qb.client.config.client === 'postgres') {
    return 'LOWER(CAST(?? AS VARCHAR))';
  }

  return 'LOWER(??)';
};

module.exports = {
  applyWhere,
  processWhere,
};
