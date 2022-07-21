'use strict';

const sift = require('sift');
const { AbilityBuilder, Ability } = require('@casl/ability');
const { pick, isNil, isObject } = require('lodash/fp');

const allowedOperations = [
  '$or',
  '$and',
  '$eq',
  '$ne',
  '$in',
  '$nin',
  '$lt',
  '$lte',
  '$gt',
  '$gte',
  '$exists',
  '$elemMatch',
];

const operations = pick(allowedOperations, sift);

const conditionsMatcher = conditions => {
  return sift.createQueryTester(conditions, { operations });
};

/**
 * Casl Ability Builder.
 */
const caslAbilityBuilder = () => {
  const { can, build, ...rest } = new AbilityBuilder(Ability);

  return {
    can(permission) {
      const { action, subject, properties = {}, condition } = permission;
      const { fields } = properties;

      return can(
        action,
        isNil(subject) ? 'all' : subject,
        fields,
        isObject(condition) ? condition : undefined
      );
    },

    build() {
      return build({ conditionsMatcher });
    },

    ...rest,
  };
};

module.exports = {
  caslAbilityBuilder,
};
