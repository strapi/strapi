'use strict';

//TODO: move to dbal

const _ = require('lodash');
const parseType = require('./parse-type');

const isAttribute = (model, field) =>
  _.has(model.allAttributes, field) || model.primaryKey === field || field === 'id';

/**
 * Returns the model, attribute name and association from a path of relation
 * @param {Object} options - Options
 * @param {string} options.model - Strapi model
 * @param {string} options.field - path of relation / attribute
 */
const getAssociationFromFieldKey = ({ model, field }) => {
  const fieldParts = field.split('.');

  let tmpModel = model;
  let association;
  let attribute;

  for (let i = 0; i < fieldParts.length; i++) {
    const part = fieldParts[i];
    attribute = part;

    const assoc = tmpModel.associations.find(ast => ast.alias === part);

    if (assoc) {
      association = assoc;
      tmpModel = strapi.db.getModelByAssoc(assoc);
      continue;
    }

    if (!assoc && (!isAttribute(tmpModel, part) || i !== fieldParts.length - 1)) {
      const err = new Error(
        `Your filters contain a field '${field}' that doesn't appear on your model definition nor it's relations`
      );

      err.status = 400;
      throw err;
    }
  }

  return {
    association,
    model: tmpModel,
    attribute,
  };
};

/**
 * Cast an input value
 * @param {Object} options - Options
 * @param {string} options.type - type of the atribute
 * @param {*} options.value - value tu cast
 * @param {string} options.operator - name of operator
 */
const castInput = ({ type, value, operator }) => {
  return Array.isArray(value)
    ? value.map(val => castValue({ type, operator, value: val }))
    : castValue({ type, operator, value: value });
};

/**
 * Cast basic values based on attribute type
 * @param {Object} options - Options
 * @param {string} options.type - type of the atribute
 * @param {*} options.value - value tu cast
 * @param {string} options.operator - name of operator
 */
const castValue = ({ type, value, operator }) => {
  if (operator === 'null') return parseType({ type: 'boolean', value });
  return parseType({ type, value });
};

/**
 *
 * @param {Object} options - Options
 * @param {string} options.model - The model
 * @param {string} options.field - path of relation / attribute
 */
const normalizeFieldName = ({ model, field }) => {
  const fieldPath = field.split('.');
  return _.last(fieldPath) === 'id'
    ? _.initial(fieldPath)
        .concat(model.primaryKey)
        .join('.')
    : fieldPath.join('.');
};

const BOOLEAN_OPERATORS = ['or'];

const hasDeepFilters = (whereClauses = [], { minDepth = 1 } = {}) => {
  return (
    whereClauses.filter(({ field, operator, value }) => {
      if (BOOLEAN_OPERATORS.includes(operator)) {
        return value.filter(hasDeepFilters).length > 0;
      }

      return field.split('.').length > minDepth;
    }).length > 0
  );
};

const normalizeClauses = (whereClauses, { model }) => {
  return whereClauses
    .filter(({ value }) => !_.isNil(value))
    .map(({ field, operator, value }) => {
      if (BOOLEAN_OPERATORS.includes(operator)) {
        return {
          field,
          operator,
          value: value.map(clauses => normalizeClauses(clauses, { model })),
        };
      }

      const { model: assocModel, attribute } = getAssociationFromFieldKey({
        model,
        field,
      });

      const { type } = _.get(assocModel, ['allAttributes', attribute], {});

      // cast value or array of values
      const castedValue = castInput({ type, operator, value });

      return {
        field: normalizeFieldName({ model, field }),
        operator,
        value: castedValue,
      };
    });
};

/**
 *
 * @param {Object} options - Options
 * @param {Object} options.model - The model for which the query will be built
 * @param {Object} options.filters - The filters for the query (start, sort, limit, and where clauses)
 * @param {Object} options.rest - In case the database layer requires any other params pass them
 */
const buildQuery = ({ model, filters = {}, ...rest }) => {
  // Validate query clauses
  if (filters.where && Array.isArray(filters.where)) {
    if (hasDeepFilters(filters.where, { minDepth: 2 })) {
      strapi.log.warn(
        'Deep filtering queries should be used carefully (e.g Can cause performance issues).\nWhen possible build custom routes which will in most case be more optimised.'
      );
    }

    // cast where clauses to match the inner types
    filters.where = normalizeClauses(filters.where, { model });
  }

  // call the orm's buildQuery implementation
  return strapi.db.connectors.get(model.orm).buildQuery({ model, filters, ...rest });
};

module.exports = {
  buildQuery,
  hasDeepFilters,
};
