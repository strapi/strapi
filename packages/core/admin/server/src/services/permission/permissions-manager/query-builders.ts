// TODO: migration
// [lodash: reduce — skipped, _.reduce iterates over plain object keys; not a drop-in for Array.prototype.reduce]
import _ from 'lodash';
import { rulesToQuery } from '@casl/ability/extra';

const operatorsMap = {
  $in: '$in',
  $nin: '$notIn',
  $exists: '$notNull',
  $gte: '$gte',
  $gt: '$gt',
  $lte: '$lte',
  $lt: '$lt',
  $eq: '$eq',
  $ne: '$ne',
  $and: '$and',
  $or: '$or',
  $not: '$not',
} as const;

const mapKey = (key: keyof typeof operatorsMap) => {
  if (typeof key === 'string' && key.startsWith('$') && key in operatorsMap) {
    return operatorsMap[key];
  }
  return key;
};

const buildCaslQuery = (ability: unknown, action: unknown, model: unknown) => {
  // @ts-expect-error casl types
  return rulesToQuery(ability, action, model, (o) => o.conditions);
};

const buildStrapiQuery = (caslQuery: unknown) => {
  return unwrapDeep(caslQuery);
};

const unwrapDeep = (obj: any): unknown => {
  if (!_.isPlainObject(obj) && !Array.isArray(obj)) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map((v: unknown) => unwrapDeep(v));
  }

  // eslint-disable-next-line you-dont-need-lodash-underscore/reduce
  return _.reduce(
    obj,
    (acc, v, k: any) => {
      const key = mapKey(k);

      if (_.isPlainObject(v)) {
        if ('$elemMatch' in v) {
          _.setWith(acc, key, unwrapDeep(v.$elemMatch));
        } else {
          _.setWith(acc, key, unwrapDeep(v));
        }
      } else if (Array.isArray(v)) {
        // prettier-ignore
        _.setWith(acc, key, v.map(v => unwrapDeep(v)));
      } else {
        _.setWith(acc, key, v);
      }

      return acc;
    },
    {}
  );
};

export { buildCaslQuery, buildStrapiQuery };
