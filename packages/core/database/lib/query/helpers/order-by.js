'use strict';

const _ = require('lodash/fp');

const types = require('../../types');
const { createJoin } = require('./join');

const processOrderBy = (orderBy, ctx) => {
  const { db, uid, qb, alias } = ctx;
  const { attributes } = db.metadata.get(uid);

  if (typeof orderBy === 'string') {
    const attribute = attributes[orderBy];

    if (!attribute) {
      throw new Error(`Attribute ${orderBy} not found on model ${uid}`);
    }

    return [{ column: qb.aliasColumn(orderBy, alias) }];
  }

  if (Array.isArray(orderBy)) {
    return orderBy.flatMap(value => processOrderBy(value, ctx));
  }

  if (_.isPlainObject(orderBy)) {
    return Object.entries(orderBy).flatMap(([key, direction]) => {
      const value = orderBy[key];
      const attribute = attributes[key];

      if (!attribute) {
        throw new Error(`Attribute ${key} not found on model ${uid}`);
      }

      if (types.isScalar(attribute.type)) {
        return { column: qb.aliasColumn(key, alias), order: direction };
      }

      if (attribute.type === 'relation') {
        const subAlias = createJoin(ctx, {
          alias: alias || qb.alias,
          uid,
          attributeName: key,
          attribute,
        });

        return processOrderBy(value, {
          db,
          qb,
          alias: subAlias,
          uid: attribute.target,
        });
      }

      throw new Error(`You cannot order on ${attribute.type} types`);
    });
  }

  throw new Error('Invalid orderBy syntax');
};

module.exports = {
  processOrderBy,
};
