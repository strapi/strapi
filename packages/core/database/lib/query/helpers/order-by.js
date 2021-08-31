'use strict';

const _ = require('lodash/fp');

const types = require('../../types');
const { createJoin } = require('./join');

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

module.exports = {
  processOrderBy,
};
