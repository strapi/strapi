'use strict';

const _ = require('lodash/fp');

const types = require('../../types');
const { createField } = require('../../fields');
const { createJoin } = require('./join');
const { toColumnName } = require('./transform');
const { isKnexQuery } = require('../../utils/knex');

const GROUP_OPERATORS = ['$and', '$or'];
const OPERATORS = [
  '$not',
  '$in',
  '$notIn',
  '$eq',
  '$eqi',
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

const CAST_OPERATORS = [
  '$not',
  '$in',
  '$notIn',
  '$eq',
  '$ne',
  '$gt',
  '$gte',
  '$lt',
  '$lte',
  '$between',
];

const ARRAY_OPERATORS = ['$in', '$notIn', '$between'];

const isOperator = (key) => OPERATORS.includes(key);

const castValue = (value, attribute) => {
  if (!attribute) {
    return value;
  }

  if (types.isScalar(attribute.type)) {
    const field = createField(attribute);

    return value === null ? null : field.toDB(value);
  }

  return value;
};

const processAttributeWhere = (attribute, where, operator = '$eq') => {
  if (_.isArray(where)) {
    return where.map((sub) => processAttributeWhere(attribute, sub, operator));
  }

  if (!_.isPlainObject(where)) {
    if (CAST_OPERATORS.includes(operator)) {
      return castValue(where, attribute);
    }

    return where;
  }

  const filters = {};

  for (const key of Object.keys(where)) {
    const value = where[key];

    if (!isOperator(key)) {
      throw new Error(`Undefined attribute level operator ${key}`);
    }

    filters[key] = processAttributeWhere(attribute, value, key);
  }

  return filters;
};

/**
 * Process where parameter
 * @param {Object} where
 * @param {Object} ctx
 * @param {number} depth
 * @returns {Object}
 */
const processWhere = (where, ctx) => {
  if (!_.isArray(where) && !_.isPlainObject(where)) {
    throw new Error('Where must be an array or an object');
  }

  if (_.isArray(where)) {
    return where.map((sub) => processWhere(sub, ctx));
  }

  const processNested = (where, ctx) => {
    if (!_.isPlainObject(where)) {
      return where;
    }

    return processWhere(where, ctx);
  };

  const { db, uid, qb, alias } = ctx;
  const meta = db.metadata.get(uid);

  const filters = {};

  // for each key in where
  for (const key of Object.keys(where)) {
    const value = where[key];

    // if operator $and $or then loop over them
    if (GROUP_OPERATORS.includes(key)) {
      filters[key] = value.map((sub) => processNested(sub, ctx));
      continue;
    }

    if (key === '$not') {
      filters[key] = processNested(value, ctx);
      continue;
    }

    if (isOperator(key)) {
      throw new Error(
        `Only $and, $or and $not can only be used as root level operators. Found ${key}.`
      );
    }

    const attribute = meta.attributes[key];

    if (!attribute) {
      filters[qb.aliasColumn(key, alias)] = processAttributeWhere(null, value);
      continue;
    }

    if (types.isRelation(attribute.type)) {
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
      const columnName = toColumnName(meta, key);
      const aliasedColumnName = qb.aliasColumn(columnName, alias);

      filters[aliasedColumnName] = processAttributeWhere(attribute, value);

      continue;
    }

    throw new Error(`You cannot filter on ${attribute.type} types`);
  }

  return filters;
};

// TODO: add type casting per operator at some point
const applyOperator = (qb, column, operator, value) => {
  if (Array.isArray(value) && !ARRAY_OPERATORS.includes(operator)) {
    return qb.where((subQB) => {
      value.forEach((subValue) =>
        subQB.orWhere((innerQB) => {
          applyOperator(innerQB, column, operator, subValue);
        })
      );
    });
  }

  switch (operator) {
    case '$not': {
      qb.whereNot((qb) => applyWhereToColumn(qb, column, value));
      break;
    }

    case '$in': {
      qb.whereIn(column, isKnexQuery(value) ? value : _.castArray(value));
      break;
    }

    case '$notIn': {
      qb.whereNotIn(column, isKnexQuery(value) ? value : _.castArray(value));
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

    case '$eqi': {
      if (value === null) {
        qb.whereNull(column);
        break;
      }
      qb.whereRaw(`${fieldLowerFn(qb)} LIKE LOWER(?)`, [column, `${value}`]);
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
      if (value) {
        qb.whereNull(column);
      } else {
        qb.whereNotNull(column);
      }
      break;
    }
    case '$notNull': {
      if (value) {
        qb.whereNotNull(column);
      } else {
        qb.whereNull(column);
      }
      break;
    }
    case '$between': {
      qb.whereBetween(column, value);
      break;
    }
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
      throw new Error(`Undefined attribute level operator ${operator}`);
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

  Object.keys(columnWhere).forEach((operator) => {
    const value = columnWhere[operator];

    applyOperator(qb, column, operator, value);
  });
};

const applyWhere = (qb, where) => {
  if (!_.isArray(where) && !_.isPlainObject(where)) {
    throw new Error('Where must be an array or an object');
  }

  if (_.isArray(where)) {
    return qb.where((subQB) => where.forEach((subWhere) => applyWhere(subQB, subWhere)));
  }

  Object.keys(where).forEach((key) => {
    const value = where[key];

    if (key === '$and') {
      return qb.where((subQB) => {
        value.forEach((v) => applyWhere(subQB, v));
      });
    }

    if (key === '$or') {
      return qb.where((subQB) => {
        value.forEach((v) => subQB.orWhere((inner) => applyWhere(inner, v)));
      });
    }

    if (key === '$not') {
      return qb.whereNot((qb) => applyWhere(qb, value));
    }

    applyWhereToColumn(qb, key, value);
  });
};

const fieldLowerFn = (qb) => {
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
