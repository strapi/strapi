'use strict';

const _ = require('lodash');
const { subject: asSubject } = require('@casl/ability');
const { permittedFieldsOf, rulesToQuery } = require('@casl/ability/extra');
const { VALID_REST_OPERATORS } = require('strapi-utils');

module.exports = (ability, action, model) => ({
  ability,
  action,
  model,

  get query() {
    return buildStrapiQuery(buildCaslQuery(ability, action, model));
  },

  toSubject(target, subjectType = model) {
    return asSubject(subjectType, target);
  },

  sanitize(data, options = {}) {
    const { subject = this.toSubject(data), action: actionOverride = action } = options;

    const permittedFields = permittedFieldsOf(ability, actionOverride, subject);

    const dedicatedRules = ability.rules.filter(
      r => r.action === actionOverride && r.subject === model
    );
    const hasFieldRestrictions = _.some(
      dedicatedRules.map(_.property('fields')),
      _.negate(_.isUndefined)
    );

    // permittedFields can be an empty array for multiple reasons:
    //  1 - No permission for this action/subject
    //  2 - A permission without fields restriction (eg: can(action, subject))
    //  3 - A permission with strict fields restriction (eg: can(action, subject, []))
    // We need to check either we have to filter the properties (1, 3) or not (2)
    if (_.isEmpty(permittedFields) && !_.isEmpty(dedicatedRules) && !hasFieldRestrictions) {
      return data;
    }

    return _.pick(data, permittedFields);
  },
});

const buildCaslQuery = (ability, action, model) => {
  const query = rulesToQuery(ability, action, model, o => o.conditions);
  return query && _.has(query, '$or') ? query.$or : [];
};

const buildStrapiQuery = caslQuery => {
  return mergeProperties(caslQuery.map(flattenDeepProperties).map(transformOperators));
};

const flattenDeepProperties = condition => {
  const shouldIgnore = e => !!VALID_REST_OPERATORS.find(o => e === `$${o}`);
  const result = {};

  _.each(condition, (value, key) => {
    // If the value is a regular object and the key is not an operator
    if (_.isObject(value) && !_.isArray(value) && !shouldIgnore(key)) {
      // Recursively flatten its properties
      _.each(flattenDeepProperties(value), (nestedValue, nestedKey) => {
        // We need to flatten the key/value only if the key is not an operator
        if (shouldIgnore(nestedKey)) {
          result[key] = _.merge(result[key], { [nestedKey]: nestedValue });
        } else {
          result[`${key}.${nestedKey}`] = nestedValue;
        }
      });
    } else {
      result[key] = condition[key];
    }
  });

  return result;
};

const transformOperators = obj =>
  _.reduce(
    obj,
    (acc, elem, key) => ({
      ...acc,
      // If the element is an object, then replace nested operators with root-level properties
      ...(_.isObject(elem) && !_.isArray(elem)
        ? _.reduce(
            elem,
            (localAcc, val, op) => ({
              ...localAcc,
              [`${key}_${op.replace('$', '')}`]: val,
            }),
            {}
          )
        : // Otherwise, transform the expression into an equal check
          { [`${key}_eq`]: elem }),
    }),
    {}
  );

const mergeProperties = conditions => {
  return _.mergeWith(...conditions, (a, b, key) => {
    const op = VALID_REST_OPERATORS.find(o => key.endsWith(`_${o}`));

    if (op !== undefined) {
      if (_.some([a, b], _.isUndefined)) {
        return _.isUndefined(a) ? b : a;
      }

      if (_.isEqual(a, b)) {
        return a;
      }

      return _.concat(a, b);
    }
  });
};
