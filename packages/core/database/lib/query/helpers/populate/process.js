'use strict';

const _ = require('lodash/fp');

const types = require('../../../types');

const getRootLevelPopulate = (meta) => {
  const populate = {};

  for (const attributeName of Object.keys(meta.attributes)) {
    const attribute = meta.attributes[attributeName];
    if (attribute.type === 'relation') {
      populate[attributeName] = true;
    }
  }

  return populate;
};

/**
 * Converts and prepares the query for populate
 *
 * @param {boolean|string[]|object} populate populate param
 * @param {object} ctx query context
 * @param {object} ctx.db database instance
 * @param {object} ctx.qb query builder instance
 * @param {string} ctx.uid model uid
 */
const processPopulate = (populate, ctx) => {
  const { qb, db, uid } = ctx;
  const meta = db.metadata.get(uid);

  let populateMap = {};

  if (populate === false || _.isNil(populate)) {
    return null;
  }

  if (populate === true) {
    populateMap = getRootLevelPopulate(meta);
  } else if (Array.isArray(populate)) {
    for (const key of populate) {
      const [root, ...rest] = key.split('.');

      if (rest.length > 0) {
        const subPopulate = rest.join('.');

        if (populateMap[root]) {
          if (populateMap[root] === true) {
            populateMap[root] = {
              populate: [subPopulate],
            };
          } else {
            populateMap[root].populate = [subPopulate].concat(populateMap[root].populate || []);
          }
        } else {
          populateMap[root] = {
            populate: [subPopulate],
          };
        }
      } else {
        populateMap[root] = populateMap[root] ? populateMap[root] : true;
      }
    }
  } else {
    populateMap = populate;
  }

  if (!_.isPlainObject(populateMap)) {
    throw new Error('Populate must be an object');
  }

  const finalPopulate = {};
  for (const key of Object.keys(populateMap)) {
    const attribute = meta.attributes[key];

    if (!attribute) {
      continue;
    }

    if (!types.isRelation(attribute.type)) {
      continue;
    }

    // Make sure to query the join column value if needed,
    // so that we can apply the populate later on
    if (attribute.joinColumn) {
      qb.addSelect(attribute.joinColumn.name);
    }

    // Make sure id is present for future populate queries
    if (_.has('id', meta.attributes)) {
      qb.addSelect('id');
    }

    finalPopulate[key] = populateMap[key];
  }

  return finalPopulate;
};

module.exports = processPopulate;
