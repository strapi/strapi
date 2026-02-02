import _ from 'lodash/fp';

import * as types from '../../../utils/types';
import type { Meta } from '../../../metadata';
import type { QueryBuilder } from '../../query-builder';
import type { Database } from '../../..';

const getRootLevelPopulate = (meta: Meta) => {
  const populate: PopulateMap = {};

  for (const attributeName of Object.keys(meta.attributes)) {
    const attribute = meta.attributes[attributeName];
    if (attribute.type === 'relation') {
      populate[attributeName] = true;
    }
  }

  return populate;
};

type Context = {
  qb: QueryBuilder;
  db: Database;
  uid: string;
};

type PopulateMap = {
  [key: string]:
    | true
    | {
        populate?: PopulateMap | true | string[];
      };
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
const processPopulate = (populate: unknown, ctx: Context) => {
  const { qb, db, uid } = ctx;
  const meta = db.metadata.get(uid);

  let populateMap: PopulateMap = {};

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
          const populateValue = populateMap[root];

          if (populateValue === true) {
            populateMap[root] = {
              populate: [subPopulate],
            };
          } else {
            populateValue.populate = [subPopulate].concat(populateValue.populate ?? []);
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
    populateMap = populate as PopulateMap;
  }

  if (!_.isPlainObject(populateMap)) {
    throw new Error('Populate must be an object');
  }

  const finalPopulate: PopulateMap = {};
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
    if ('joinColumn' in attribute && attribute.joinColumn) {
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

export default processPopulate;
