/* eslint-disable @typescript-eslint/ban-ts-comment */
import { isArray, castArray, isPlainObject } from 'lodash/fp';
import type { Knex } from 'knex';

import { isOperator, isOperatorOfType } from '@strapi/utils';
import * as types from '../../utils/types';
import { createField } from '../../fields';
import { createJoin } from './join';
import { toColumnName } from './transform';
import { isKnexQuery } from '../../utils/knex';

import type { Ctx } from '../types';
import type { Attribute } from '../../types';

type WhereCtx = Ctx & { alias?: string; isGroupRoot?: boolean };

const isRecord = (value: unknown): value is Record<string, unknown> => isPlainObject(value);

const castValue = (value: unknown, attribute: Attribute | null) => {
  if (!attribute) {
    return value;
  }

  if (types.isScalar(attribute.type) && !isKnexQuery(value)) {
    const field = createField(attribute);

    return value === null ? null : field.toDB(value);
  }

  return value;
};

const processSingleAttributeWhere = (
  attribute: Attribute | null,
  where: unknown,
  operator = '$eq'
) => {
  if (!isRecord(where)) {
    if (isOperatorOfType('cast', operator)) {
      return castValue(where, attribute);
    }

    return where;
  }

  const filters: Record<string, unknown> = {};

  for (const key of Object.keys(where)) {
    const value = where[key];

    if (!isOperatorOfType('where', key)) {
      throw new Error(`Undefined attribute level operator ${key}`);
    }

    filters[key] = processAttributeWhere(attribute, value, key);
  }

  return filters;
};

const processAttributeWhere = (attribute: Attribute | null, where: unknown, operator = '$eq') => {
  if (isArray(where)) {
    return where.map((sub) => processSingleAttributeWhere(attribute, sub, operator));
  }

  return processSingleAttributeWhere(attribute, where, operator);
};

const processNested = (where: unknown, ctx: WhereCtx) => {
  if (!isRecord(where)) {
    return where;
  }

  return processWhere(where, ctx);
};

const processRelationWhere = (where: unknown, ctx: WhereCtx) => {
  const { qb, alias } = ctx;

  const idAlias = qb.aliasColumn('id', alias);
  if (!isRecord(where)) {
    return { [idAlias]: where };
  }

  const keys = Object.keys(where);
  const operatorKeys = keys.filter((key) => isOperator(key));

  if (operatorKeys.length > 0 && operatorKeys.length !== keys.length) {
    throw new Error(`Operator and non-operator keys cannot be mixed in a relation where clause`);
  }

  if (operatorKeys.length > 1) {
    throw new Error(
      `Only one operator key is allowed in a relation where clause, but found: ${operatorKeys}`
    );
  }

  if (operatorKeys.length === 1) {
    const operator = operatorKeys[0];

    if (isOperatorOfType('group', operator)) {
      return processWhere(where, ctx);
    }

    return { [idAlias]: { [operator]: processNested(where[operator], ctx) } };
  }

  return processWhere(where, ctx);
};

/**
 * Process where parameter
 */
function processWhere(where: Record<string, unknown>, ctx: WhereCtx): Record<string, unknown>;
function processWhere(where: Record<string, unknown>[], ctx: WhereCtx): Record<string, unknown>[];
function processWhere(
  where: Record<string, unknown> | Record<string, unknown>[],
  ctx: WhereCtx
): Record<string, unknown> | Record<string, unknown>[] {
  if (!isArray(where) && !isRecord(where)) {
    throw new Error('Where must be an array or an object');
  }

  if (isArray(where)) {
    return where.map((sub) => processWhere(sub, ctx));
  }

  const { db, uid, qb, alias } = ctx;
  const meta = db.metadata.get(uid);

  const filters: Record<string, unknown> = {};

  // for each key in where
  for (const key of Object.keys(where)) {
    const value = where[key];

    // if operator $and $or -> process recursively
    if (isOperatorOfType('group', key)) {
      if (!Array.isArray(value)) {
        throw new Error(`Operator ${key} must be an array`);
      }

      filters[key] = value.map((sub) => processNested(sub, ctx));
      continue;
    }

    if (key === '$not') {
      filters[key] = processNested(value, ctx);
      continue;
    }

    if (isOperatorOfType('where', key)) {
      throw new Error(
        `Only $and, $or and $not can only be used as root level operators. Found ${key}.`
      );
    }

    const attribute = meta.attributes[key];

    if (!attribute) {
      filters[qb.aliasColumn(key, alias)] = processAttributeWhere(null, value);
      continue;
    }

    if (types.isRelation(attribute.type) && 'target' in attribute) {
      // attribute
      const subAlias = createJoin(ctx, {
        alias: alias || qb.alias,
        attributeName: key,
        attribute,
      });

      const nestedWhere = processRelationWhere(value, {
        db,
        qb,
        alias: subAlias,
        uid: attribute.target,
      });

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
}

type Operator =
  | '$eq'
  | '$ne'
  | '$nei'
  | '$in'
  | '$notIn'
  | '$lt'
  | '$lte'
  | '$gt'
  | '$gte'
  | '$between'
  | '$contains'
  | '$notContains'
  | '$containsi'
  | '$notContainsi'
  | '$startsWith'
  | '$endsWith'
  | '$null'
  | '$notNull'
  | '$not'
  | '$eqi'
  | '$startsWithi'
  | '$endsWithi'
  | '$jsonSupersetOf';

// TODO: add type casting per operator at some point
const applyOperator = (qb: Knex.QueryBuilder, column: any, operator: Operator, value: any) => {
  if (Array.isArray(value) && !isOperatorOfType('array', operator)) {
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
      // @ts-ignore
      // TODO: fix in v5
      qb.whereIn(column, isKnexQuery(value) ? value : castArray(value));
      break;
    }

    case '$notIn': {
      // @ts-ignore
      // TODO: fix in v5
      qb.whereNotIn(column, isKnexQuery(value) ? value : castArray(value));
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
    case '$nei': {
      if (value === null) {
        qb.whereNotNull(column);
        break;
      }
      qb.whereRaw(`${fieldLowerFn(qb)} NOT LIKE LOWER(?)`, [column, `${value}`]);
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
    case '$startsWithi': {
      qb.whereRaw(`${fieldLowerFn(qb)} LIKE LOWER(?)`, [column, `${value}%`]);
      break;
    }
    case '$endsWith': {
      qb.where(column, 'like', `%${value}`);
      break;
    }
    case '$endsWithi': {
      qb.whereRaw(`${fieldLowerFn(qb)} LIKE LOWER(?)`, [column, `%${value}`]);
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

    // Experimental, only for internal use
    // Only on MySQL, PostgreSQL and CockroachDB.
    // https://knexjs.org/guide/query-builder.html#wherejsonsupersetof
    case '$jsonSupersetOf': {
      qb.whereJsonSupersetOf(column, value);
      break;
    }

    // TODO: Add more JSON operators: whereJsonObject, whereJsonPath, whereJsonSubsetOf

    // TODO: relational operators every/some/exists/size ...

    default: {
      throw new Error(`Undefined attribute level operator ${operator}`);
    }
  }
};

const applyWhereToColumn = (
  qb: Knex.QueryBuilder,
  column: string,
  columnWhere: Record<Operator, unknown> | Array<Record<Operator, unknown>>
) => {
  if (!isRecord(columnWhere)) {
    if (Array.isArray(columnWhere)) {
      return qb.whereIn(column, columnWhere);
    }

    return qb.where(column, columnWhere);
  }

  const keys = Object.keys(columnWhere) as Operator[];

  keys.forEach((operator) => {
    const value = columnWhere[operator];

    applyOperator(qb, column, operator, value);
  });
};

type Where =
  | {
      $and?: Where[];
      $or?: Where[];
      $not?: Where;
      [key: string]: any;
    }
  | Array<Where>;

const applyWhere = (qb: Knex.QueryBuilder, where: Where) => {
  if (!isArray(where) && !isRecord(where)) {
    throw new Error('Where must be an array or an object');
  }

  if (isArray(where)) {
    return qb.where((subQB: Knex.QueryBuilder) =>
      where.forEach((subWhere) => applyWhere(subQB, subWhere))
    );
  }

  Object.keys(where).forEach((key) => {
    if (key === '$and') {
      const value = where[key] ?? [];

      return qb.where((subQB: Knex.QueryBuilder) => {
        value.forEach((v) => applyWhere(subQB, v));
      });
    }

    if (key === '$or') {
      const value = where[key] ?? [];

      return qb.where((subQB: Knex.QueryBuilder) => {
        value.forEach((v) => subQB.orWhere((inner) => applyWhere(inner, v)));
      });
    }

    if (key === '$not') {
      const value = where[key] ?? {};

      return qb.whereNot((qb) => applyWhere(qb, value));
    }

    applyWhereToColumn(qb, key, where[key]);
  });
};

const fieldLowerFn = (qb: Knex.QueryBuilder) => {
  // Postgres requires string to be passed
  if (qb.client.config.client === 'postgres') {
    return 'LOWER(CAST(?? AS VARCHAR))';
  }

  return 'LOWER(??)';
};

export { applyWhere, processWhere };
