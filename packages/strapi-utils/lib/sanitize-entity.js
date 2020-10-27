'use strict';

const _ = require('lodash');
const { constants, isPrivateAttribute } = require('./content-types');

const {
  ID_ATTRIBUTE,
  PUBLISHED_AT_ATTRIBUTE,
  CREATED_BY_ATTRIBUTE,
  UPDATED_BY_ATTRIBUTE,
} = constants;

const sanitizeEntity = (dataSource, options) => {
  const { model, withPrivate = false, isOutput = true, includeFields = null } = options;

  if (typeof dataSource !== 'object' || _.isNil(dataSource)) {
    return dataSource;
  }

  const data = parseOriginalData(dataSource);

  if (typeof data !== 'object' || _.isNil(data)) {
    return data;
  }

  if (_.isArray(data)) {
    return data.map(entity => sanitizeEntity(entity, options));
  }

  if (_.isNil(model)) {
    return null;
  }

  const { attributes } = model;
  const allowedFields = getAllowedFields({ includeFields, model, isOutput });

  const reducerFn = (acc, value, key) => {
    const attribute = attributes[key];
    const allowedFieldsHasKey = allowedFields.includes(key);

    if (shouldRemoveAttribute(model, key, attribute, { withPrivate, isOutput })) {
      return acc;
    }

    // Relations
    const relation = attribute && (attribute.model || attribute.collection || attribute.component);
    if (relation) {
      if (_.isNil(value)) {
        return { ...acc, [key]: value };
      }

      const [nextFields, isAllowed] = includeFields
        ? getNextFields(allowedFields, key, { allowedFieldsHasKey })
        : [null, true];

      if (!isAllowed) {
        return acc;
      }

      const nextOptions = {
        model: strapi.getModel(relation, attribute.plugin),
        withPrivate,
        isOutput,
        includeFields: nextFields,
      };

      const nextVal = Array.isArray(value)
        ? value.map(elem => sanitizeEntity(elem, nextOptions))
        : sanitizeEntity(value, nextOptions);

      return { ...acc, [key]: nextVal };
    }

    const isAllowedField = !includeFields || allowedFieldsHasKey;

    // Dynamic zones
    if (attribute && attribute.type === 'dynamiczone' && value !== null && isAllowedField) {
      const nextVal = value.map(elem =>
        sanitizeEntity(elem, {
          model: strapi.getModel(elem.__component),
          withPrivate,
          isOutput,
        })
      );
      return { ...acc, [key]: nextVal };
    }

    // Other fields
    if (isAllowedField) {
      return { ...acc, [key]: value };
    }

    return acc;
  };

  return _.reduce(data, reducerFn, {});
};

const parseOriginalData = data => (_.isFunction(data.toJSON) ? data.toJSON() : data);

const COMPONENT_FIELDS = ['__component'];
const STATIC_FIELDS = [ID_ATTRIBUTE, '__v'];

const getAllowedFields = ({ includeFields, model, isOutput }) => {
  const { options, primaryKey } = model;

  const timestamps = options.timestamps || [];

  return _.concat(
    includeFields || [],
    ...(isOutput
      ? [
          primaryKey,
          timestamps,
          STATIC_FIELDS,
          COMPONENT_FIELDS,
          CREATED_BY_ATTRIBUTE,
          UPDATED_BY_ATTRIBUTE,
          PUBLISHED_AT_ATTRIBUTE,
        ]
      : [primaryKey, STATIC_FIELDS, COMPONENT_FIELDS])
  );
};

const getNextFields = (fields, key, { allowedFieldsHasKey }) => {
  const searchStr = `${key}.`;

  const transformedFields = (fields || [])
    .filter(field => field.startsWith(searchStr))
    .map(field => field.replace(searchStr, ''));

  const isAllowed = allowedFieldsHasKey || transformedFields.length > 0;
  const nextFields = allowedFieldsHasKey ? null : transformedFields;

  return [nextFields, isAllowed];
};

const shouldRemoveAttribute = (model, key, attribute = {}, { withPrivate, isOutput }) => {
  const isPassword = attribute.type === 'password';
  const isPrivate = isPrivateAttribute(model, key);

  const shouldRemovePassword = isOutput;
  const shouldRemovePrivate = !withPrivate && isOutput;

  return !!((isPassword && shouldRemovePassword) || (isPrivate && shouldRemovePrivate));
};

module.exports = sanitizeEntity;
