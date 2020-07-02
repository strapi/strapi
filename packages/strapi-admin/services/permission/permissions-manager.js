'use strict';

const _ = require('lodash');
const { subject: asSubject } = require('@casl/ability');
const { permittedFieldsOf, rulesToQuery } = require('@casl/ability/extra');
const { VALID_REST_OPERATORS, sanitizeEntity } = require('strapi-utils');

const ops = {
  common: VALID_REST_OPERATORS,
  boolean: ['$or'],
  cleanable: ['$elemMatch'],
};

module.exports = (ability, action, model) => ({
  ability,
  action,
  model,

  get query() {
    return buildStrapiQuery(buildCaslQuery(ability, action, model));
  },

  get isAllowed() {
    return this.ability.can(action, model);
  },

  toSubject(target, subjectType = model) {
    return asSubject(subjectType, target);
  },

  pickPermittedFieldsOf(data, options = {}) {
    return this.sanitize(data, { ...options, isOutput: false });
  },

  queryFrom(query) {
    return {
      ...query,
      _where: _.concat(this.query, query._where || {}),
    };
  },

  sanitize(data, options = {}) {
    const {
      subject = this.toSubject(data),
      action: actionOverride = action,
      withPrivate = true,
      isOutput = true,
    } = options;

    if (_.isArray(data)) {
      return data.map(this.sanitize.bind(this));
    }

    const permittedFields = permittedFieldsOf(ability, actionOverride, subject);

    return sanitizeEntity(data, {
      model: strapi.getModel(model),
      includeFields: _.isEmpty(permittedFields) ? null : permittedFields,
      withPrivate,
      isOutput,
    });
  },
});

const buildCaslQuery = (ability, action, model) => {
  const query = rulesToQuery(ability, action, model, o => o.conditions);
  return query && _.has(query, '$or') ? _.pick(query, '$or') : {};
};

const buildStrapiQuery = caslQuery => {
  const transform = _.flow([flattenDeep, cleanupUnwantedProperties]);
  return transform(caslQuery);
};

const flattenDeep = condition => {
  if (_.isArray(condition)) {
    return _.map(condition, flattenDeep);
  }

  const shouldIgnore = e => !!ops.common.includes(e);
  const shouldPerformTransformation = (v, k) => _.isObject(v) && !_.isArray(v) && !shouldIgnore(k);

  const result = {};
  const set = (key, value) => (result[key] = value);

  const getTransformParams = (prevKey, v, k) =>
    shouldIgnore(k) ? [`${prevKey}_${k.replace('$', '')}`, v] : [`${prevKey}.${k}`, v];

  _.each(condition, (value, key) => {
    if (ops.boolean.includes(key)) {
      set(key.replace('$', '_'), _.map(value, flattenDeep));
    } else if (shouldPerformTransformation(value, key)) {
      _.each(flattenDeep(value), (v, k) => {
        set(...getTransformParams(key, v, k));
      });
    } else {
      set(key, value);
    }
  });

  return result;
};

const cleanupUnwantedProperties = condition => {
  const shouldClean = e => ops.cleanable.find(o => e.includes(`.${o}`));

  return _.reduce(
    condition,
    (acc, value, key) => ({
      ...acc,
      [shouldClean(key) ? key.split(`.${shouldClean(key)}`).join('') : key]: value,
    }),
    {}
  );
};
