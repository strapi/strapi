'use strict';

const _ = require('lodash');
const { subject: asSubject } = require('@casl/ability');
const { permittedFieldsOf, rulesToQuery } = require('@casl/ability/extra');
const { VALID_REST_OPERATORS } = require('strapi-utils');

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

  queryFrom(otherQuery = {}) {
    return { ...otherQuery, _where: { ...otherQuery._where, ...this.query } };
  },

  toSubject(target, subjectType = model) {
    return asSubject(subjectType, target);
  },

  pickPermittedFieldsOf(data, options = {}) {
    return this.sanitize(data, { ...options, isInput: true });
  },

  sanitize(data, options = {}) {
    const {
      subject = this.toSubject(data),
      action: actionOverride = action,
      withPrivate = true,
      isInput = false,
    } = options;

    if (_.isArray(data)) {
      return data.map(this.sanitize.bind(this));
    }

    const permittedFields = permittedFieldsOf(ability, actionOverride, subject);

    const sanitizeDeep = (
      data,
      { modelName, modelPlugin, withPrivate, fields, isInput = false }
    ) => {
      if (typeof data !== 'object' || _.isNil(data)) return data;

      const plainData = typeof data.toJSON === 'function' ? data.toJSON() : data;
      if (typeof plainData !== 'object') return plainData;

      const modelDef = strapi.getModel(modelName, modelPlugin);

      if (!modelDef) return null;

      const { attributes, options, primaryKey } = modelDef;

      const timestamps = options.timestamps || [];
      const creatorFields = ['created_by', 'updated_by'];
      const componentFields = ['__component'];

      const inputFields = [primaryKey, componentFields];
      const outputFields = [primaryKey, timestamps, creatorFields, componentFields];

      const allowedFields = _.concat(fields, ...(isInput ? inputFields : outputFields));

      const filterFields = (fields, key) =>
        fields
          .filter(field => field.startsWith(`${key}.`))
          .map(field => field.replace(`${key}.`, ''));

      return _.reduce(
        plainData,
        (acc, value, key) => {
          const attribute = attributes[key];
          const isAllowedField = !fields || allowedFields.includes(key);

          // Always remove password fields from entities in output mode
          if (attribute && attribute.type === 'password' && !isInput) {
            return acc;
          }

          // Removes private fields if needed
          if (attribute && attribute.private === true && !withPrivate && !isInput) {
            return acc;
          }

          const relation =
            attribute && (attribute.model || attribute.collection || attribute.component);
          // Attribute is a relation
          if (relation && value !== null) {
            const filteredFields = filterFields(allowedFields, key);

            const isAllowed = allowedFields.includes(key) || filteredFields.length > 0;
            if (!isAllowed) {
              return acc;
            }

            const nextFields = allowedFields.includes(key) ? null : filteredFields;

            const opts = {
              modelName: relation,
              modelPlugin: attribute.plugin,
              withPrivate,
              fields: nextFields,
              isInput,
            };

            const val = Array.isArray(value)
              ? value.map(entity => sanitizeDeep(entity, opts))
              : sanitizeDeep(value, opts);

            return { ...acc, [key]: val };
          }

          // Attribute is a dynamic zone
          if (attribute && attribute.components && value !== null && allowedFields.includes(key)) {
            return {
              ...acc,
              [key]: value.map(data =>
                sanitizeDeep(data, { modelName: data.__component, withPrivate, isInput })
              ),
            };
          }

          // Add the key & value if we have the permission
          if (isAllowedField) {
            return { ...acc, [key]: value };
          }

          return acc;
        },
        {}
      );
    };

    return sanitizeDeep(data, {
      modelName: model,
      withPrivate,
      fields: _.isEmpty(permittedFields) ? null : permittedFields,
      isInput,
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
