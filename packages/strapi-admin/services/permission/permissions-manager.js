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
