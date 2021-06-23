'use strict';

const _ = require('lodash/fp');

const types = require('../types');

const GROUP_OPERATORS = ['$and', '$or'];
const OPERATORS = [
  '$not',
  '$in',
  '$nin',
  '$eq',
  '$ne',
  '$gt',
  '$gte',
  '$lt',
  '$lte',
  '$null',
  '$between',
  '$like',
  '$regexp',
  '$startsWith',
  '$endsWith',
  '$contains',
];

const createPivotJoin = (qb, joinTable, alias, tragetMeta) => {
  const joinAlias = qb.getAlias();
  qb.join({
    alias: joinAlias,
    referencedTable: joinTable.name,
    referencedColumn: joinTable.joinColumn.name,
    rootColumn: joinTable.joinColumn.referencedColumn,
    rootTable: alias,
    on: joinTable.on,
  });

  const subAlias = qb.getAlias();
  qb.join({
    alias: subAlias,
    referencedTable: tragetMeta.tableName,
    referencedColumn: joinTable.inverseJoinColumn.referencedColumn,
    rootColumn: joinTable.inverseJoinColumn.name,
    rootTable: joinAlias,
  });

  return subAlias;
};

// TODO: cleanup & implement real joins
const createJoin = (ctx, { alias, attributeName, attribute }) => {
  const { db, qb } = ctx;

  if (attribute.type !== 'relation') {
    throw new Error(`Cannot join on non relational field ${attributeName}`);
  }

  const tragetMeta = db.metadata.get(attribute.target);

  // TODO: inmplement joinColumn
  const joinColumn = attribute.joinColumn;
  if (joinColumn) {
    const subAlias = qb.getAlias();
    qb.join({
      alias: subAlias,
      referencedTable: tragetMeta.tableName,
      referencedColumn: joinColumn.referencedColumn,
      rootColumn: joinColumn.name,
      rootTable: alias,
    });
    return subAlias;
  }

  const joinTable = attribute.joinTable;
  if (joinTable) {
    return createPivotJoin(qb, joinTable, alias, tragetMeta);
  }

  // NOTE: using the joinColumn / joinTable syntax we don't really care about the relation type here
  switch (attribute.relation) {
    case 'oneToOne': {
      break;
    }
    case 'oneToMany': {
      break;
    }
    case 'manyToOne': {
      break;
    }
    case 'manyToMany': {
      break;
    }

    // TODO: polymorphic relations
    // TODO: components -> they are converted to relation so not needed either
  }

  return alias;
};

// TODO: convert field names to columns names
const processOrderBy = (orderBy, ctx) => {
  const { db, uid, qb, alias = qb.alias } = ctx;

  if (typeof orderBy === 'string') {
    const attribute = db.metadata.get(uid).attributes[orderBy];

    if (!attribute) {
      throw new Error(`Attribute ${orderBy} not found on model ${uid}`);
    }

    return [{ column: `${alias}.${orderBy}` }];
  }

  if (Array.isArray(orderBy)) {
    return orderBy.flatMap(value => processOrderBy(value, ctx));
  }

  if (_.isPlainObject(orderBy)) {
    return Object.entries(orderBy).flatMap(([key, direction]) => {
      const value = orderBy[key];
      const attribute = db.metadata.get(uid).attributes[key];

      if (!attribute) {
        throw new Error(`Attribute ${key} not found on model ${uid}`);
      }

      if (attribute.type === 'relation') {
        // TODO: pass down some filters (e.g published at)
        const subAlias = createJoin(ctx, { alias, uid, attributeName: key, attribute });

        return processOrderBy(value, {
          db,
          qb,
          alias: subAlias,
          uid: attribute.target,
        });
      }

      if (types.isScalar(attribute.type)) {
        return { column: `${alias}.${key}`, order: direction };
      }

      throw new Error(`You cannot order on ${attribute.type} types`);
    });
  }

  throw new Error('Invalid orderBy syntax');
};

const processWhere = (where, ctx, depth = 0) => {
  if (depth === 0 && !_.isPlainObject(where)) {
    throw new Error('Where must be an object');
  }

  const processNested = (where, ctx) => {
    if (!_.isPlainObject(where)) {
      return where;
    }

    return processWhere(where, ctx, depth + 1);
  };

  const { db, uid, qb, alias = qb.alias } = ctx;

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

    if (OPERATORS.includes(key)) {
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
        filters[`${alias || qb.alias}.${key}`] = processNested(value, ctx);
      }
      continue;

      // throw new Error(`Attribute ${key} not found on model ${uid}`);
    }

    // move to if else to check for scalar / relation / components & throw for other types
    if (attribute.type === 'relation') {
      // TODO: support shortcut like { role: X } => {role: { id: X }}

      // TODO: pass down some filters (e.g published at)

      // attribute

      const subAlias = createJoin(ctx, { alias, uid, attributeName: key, attribute });

      const nestedWhere = processNested(value, {
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
      // TODO: convert attribute name to column name
      filters[`${alias || qb.alias}.${key}`] = processNested(value, ctx);
      continue;
    }

    throw new Error(`You cannot filter on ${attribute.type} types`);
  }

  return filters;
};

const applyWhereToColumn = (qb, column, columnWhere) => {
  if (Array.isArray(columnWhere)) {
    return qb.whereIn(column, columnWhere);
  }

  if (!_.isPlainObject(columnWhere)) {
    return qb.where(column, columnWhere);
  }

  // TODO: Transform into if has($in, value) then to handle cases with two keys doing one thing (like $contains with $case)
  Object.keys(columnWhere).forEach(operator => {
    const value = columnWhere[operator];

    switch (operator) {
      case '$not': {
        return qb.whereNot(qb => applyWhereToColumn(qb, column, value));
      }

      case '$in': {
        return qb.whereIn(column, value);
      }

      case '$nin': {
        return qb.whereNotIn(column, value);
      }

      case '$eq': {
        if (value === null) {
          return qb.whereNull(column);
        }

        return qb.where(column, value);
      }
      case '$ne': {
        if (value === null) {
          return qb.whereNotNull(column);
        }

        return qb.where(column, '<>', value);
      }

      case '$gt': {
        return qb.where(column, '>', value);
      }
      case '$gte': {
        return qb.where(column, '>=', value);
      }
      case '$lt': {
        return qb.where(column, '<', value);
      }
      case '$lte': {
        return qb.where(column, '<=', value);
      }

      case '$null': {
        return value === true ? qb.whereNull() : qb.whereNotNull();
      }

      case '$between': {
        return qb.whereBetween(column, value);
      }

      case '$regexp': {
        // TODO:
        return;
      }

      // string
      // TODO: use $case to make it case insensitive
      case '$like': {
        return qb.where(column, 'like', value);
      }
      case '$startsWith': {
        return qb.where(column, 'like', `${value}%`);
      }
      case '$endsWith': {
        return qb.where(column, 'like', `%${value}`);
      }
      case '$contains': {
        return qb.where(column, 'like', `%${value}%`);
      }

      // TODO: json operators

      // TODO: relational operators every/some/exists/size ...

      default: {
        throw new Error(`Undefined operator ${operator}`);
      }
    }
  });
};

const applyWhere = (qb, where) => {
  if (Array.isArray(where)) {
    return where.forEach(subWhere => applyWhere(qb, subWhere));
  }

  if (!_.isPlainObject(where)) {
    throw new Error('Where must be an object');
  }

  Object.keys(where).forEach(key => {
    const value = where[key];

    if (key === '$and') {
      return qb.where(qb => {
        value.forEach(v => applyWhere(qb, v));
      });
    }

    if (key === '$or') {
      return qb.where(qb => {
        value.forEach(v => qb.orWhere(inner => applyWhere(inner, v)));
      });
    }

    if (key === '$not') {
      return qb.whereNot(qb => applyWhere(qb, value));
    }

    applyWhereToColumn(qb, key, value);
  });
};

// TODO: allow for more conditions
const applyJoin = (qb, join) => {
  const {
    method = 'leftJoin',
    alias,
    referencedTable,
    referencedColumn,
    rootColumn,
    rootTable = this.alias,
    on,
  } = join;

  qb[method]({ [alias]: referencedTable }, inner => {
    inner.on(`${rootTable}.${rootColumn}`, `${alias}.${referencedColumn}`);

    if (on) {
      for (const key in on) {
        inner.onVal(`${alias}.${key}`, on[key]);
      }
    }
  });
};

const applyJoins = (qb, joins) => joins.forEach(join => applyJoin(qb, join));

/*
  Populate
*/

const processPopulate = (populate, ctx) => {
  // TODO: Make sure to add the needed columns in the select statement for use in the next query (join columns)

  const { db, uid } = ctx;
  const meta = db.metadata.get(uid);

  if (populate === true) {
    // TODO: transform to full object populate
  }

  if (Array.isArray(populate)) {
    return populate.reduce((acc, attributeName) => {
      if (typeof attributeName !== 'string') {
        throw new Error(`Expected a string receveid ${typeof attributeName}.`);
      }

      const attribute = meta.attributes[attributeName];

      if (!attribute) {
        throw new Error(`Cannot populate unknown field ${attributeName}`);
      }

      return { ...acc, [attributeName]: true };
    }, {});
  }

  if (!_.isPlainObject(populate)) {
    // TODO: link to the doc
    throw new Error('Populate must be an object');
  }

  const finalPopulate = {};
  for (const key in populate) {
    const attribute = meta.attributes[key];

    if (!attribute) {
      throw new Error(`Cannot populate unknown field ${key}`);
    }

    if (!types.isRelation(attribute.type)) {
      throw new Error(`Invalid populate field. Expected a relation, got ${attribute.type}`);
    }

    const value = populate[key];

    finalPopulate[key] = value;
  }

  return finalPopulate;
};

const applyPopulate = async (results, populate, ctx) => {
  // TODO: cleanup code
  // TODO: ⚠️ on join tables we might want to make one query to find all the xxx_id then one query instead of a join to avoid returning multiple times the same object

  const { db, uid, qb } = ctx;
  const meta = db.metadata.get(uid);

  // TODO: support deep populates
  for (const key in populate) {
    const populateValue = populate[key];
    const attribute = meta.attributes[key];

    const targetMeta = db.metadata.get(attribute.target);

    // TODO: use query builder directly ?

    // will need some specific code per relation

    if (attribute.relation === 'oneToOne' || attribute.relation === 'manyToOne') {
      if (attribute.joinColumn) {
        const {
          name: joinColumnName,
          referencedColumn: referencedColumnName,
        } = attribute.joinColumn;

        const rr = await db.entityManager
          .createQueryBuilder(targetMeta.uid)
          .init(populateValue)
          .addSelect(`${qb.alias}.${referencedColumnName}`)
          .where({ [referencedColumnName]: results.map(r => r[joinColumnName]) })
          .execute();

        const rrMap = _.groupBy(referencedColumnName, rr);

        results.forEach(r => {
          Object.assign(r, { [key]: _.first(rrMap[r[joinColumnName]]) || null });
        });

        continue;
      }

      if (attribute.joinTable) {
        const { joinTable } = attribute;
        // query the target through the join table

        const qb = db.entityManager.createQueryBuilder(targetMeta.uid);

        // TODO: create aliases for the columns

        const alias = qb.getAlias();
        const rr = await qb
          .init(populateValue)
          .select('*')
          .join({
            alias: alias,
            referencedTable: joinTable.name,
            referencedColumn: joinTable.inverseJoinColumn.name,
            rootColumn: joinTable.inverseJoinColumn.referencedColumn,
            rootTable: qb.alias,
            on: joinTable.on,
          })
          .addSelect(`${alias}.${joinTable.joinColumn.name}`)
          .where({
            [`${alias}.${joinTable.joinColumn.name}`]: results.map(
              r => r[joinTable.joinColumn.referencedColumn]
            ),
          })
          .execute();

        const rrMap = _.groupBy(joinTable.joinColumn.name, rr);

        results.forEach(r => {
          Object.assign(r, {
            [key]: _.first(rrMap[r[joinTable.joinColumn.referencedColumn]]) || null,
          });
        });
        continue;
      }

      continue;
    } else if (attribute.relation === 'oneToMany') {
      if (attribute.joinColumn) {
        const {
          name: joinColumnName,
          referencedColumn: referencedColumnName,
        } = attribute.joinColumn;

        const rr = await db.entityManager
          .createQueryBuilder(targetMeta.uid)
          .init(populateValue)
          .addSelect(`${qb.alias}.${referencedColumnName}`)
          .where({ [referencedColumnName]: results.map(r => r[joinColumnName]) })
          .execute();

        const rrMap = _.groupBy(referencedColumnName, rr);

        results.forEach(r => {
          Object.assign(r, { [key]: rrMap[r[joinColumnName]] }) || [];
        });

        continue;
      }

      if (attribute.joinTable) {
        const { joinTable } = attribute;
        // query the target through the join table

        const qb = db.entityManager.createQueryBuilder(targetMeta.uid);

        // TODO: create aliases for the columns

        const alias = qb.getAlias();
        const rr = await qb
          .init(populateValue)
          .select('*')
          .join({
            alias: alias,
            referencedTable: joinTable.name,
            referencedColumn: joinTable.inverseJoinColumn.name,
            rootColumn: joinTable.inverseJoinColumn.referencedColumn,
            rootTable: qb.alias,
            on: joinTable.on,
          })
          //TODO: select join column
          .addSelect(`${alias}.${joinTable.joinColumn.name}`)
          .where({
            [`${alias}.${joinTable.joinColumn.name}`]: results.map(
              r => r[joinTable.joinColumn.referencedColumn]
            ),
          })
          .execute();

        const rrMap = _.groupBy(joinTable.joinColumn.name, rr);

        results.forEach(r => {
          Object.assign(r, {
            [key]: rrMap[r[joinTable.joinColumn.referencedColumn]] || [],
          });
        });
        continue;
      }

      continue;
    } else if (attribute.relation === 'manyToMany') {
      const { joinTable } = attribute;
      // query the target through the join table

      const qb = db.entityManager.createQueryBuilder(targetMeta.uid);

      // TODO: create aliases for the columns

      const alias = qb.getAlias();
      const rr = await qb
        .init(populateValue)
        .select('*')
        .join({
          alias: alias,
          referencedTable: joinTable.name,
          referencedColumn: joinTable.inverseJoinColumn.name,
          rootColumn: joinTable.inverseJoinColumn.referencedColumn,
          rootTable: qb.alias,
          on: joinTable.on,
        })
        .addSelect(`${alias}.${joinTable.joinColumn.name}`)
        .where({
          [`${alias}.${joinTable.joinColumn.name}`]: results.map(
            r => r[joinTable.joinColumn.referencedColumn]
          ),
        })
        .execute();

      const rrMap = _.groupBy(joinTable.joinColumn.name, rr);

      // TODO: remove joinColumn
      results.forEach(r => {
        Object.assign(r, {
          [key]: rrMap[r[joinTable.joinColumn.referencedColumn]] || [],
        });
      });
    }
  }
};

module.exports = {
  applyWhere,
  processWhere,
  applyJoins,
  applyJoin,
  processOrderBy,
  processPopulate,
  applyPopulate,
};
