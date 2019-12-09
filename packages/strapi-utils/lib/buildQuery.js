//TODO: move to dbal

const _ = require('lodash');

const findModelByAssoc = assoc => {
  const { models } = assoc.plugin ? strapi.plugins[assoc.plugin] : strapi;
  return models[assoc.collection || assoc.model];
};

const isAttribute = (model, field) =>
  _.has(model.allAttributes, field) || model.primaryKey === field;

/**
 * Returns the model, attribute name and association from a path of relation
 * @param {Object} options - Options
 * @param {string} options.model - Strapi model
 * @param {string} options.field - pathj of relation / attribute
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
      tmpModel = findModelByAssoc(assoc);
      continue;
    }

    if (
      !assoc &&
      (!isAttribute(tmpModel, part) || i !== fieldParts.length - 1)
    ) {
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
 * Cast basic values based on attribute type
 * @param {Object} options - Options
 * @param {string} options.type - type of the atribute
 * @param {*} options.value - value tu cast
 */
const castValueToType = ({ type, value }) => {
  switch (type) {
    case 'boolean': {
      if (['true', 't', '1', 1, true].includes(value)) {
        return true;
      }

      if (['false', 'f', '0', 0].includes(value)) {
        return false;
      }

      return Boolean(value);
    }
    case 'integer':
    case 'biginteger':
    case 'float':
    case 'decimal': {
      return _.toNumber(value);
    }
    default:
      return value;
  }
};

/**
 * Cast basic values based on attribute type
 * @param {Object} options - Options
 * @param {string} options.type - type of the atribute
 * @param {*} options.value - value tu cast
 * @param {string} options.operator - name of operator
 */
const castValue = ({ type, value, operator }) => {
  if (operator === 'null') return castValueToType({ type: 'boolean', value });
  return castValueToType({ type, value });
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
    const deepFilters = filters.where.filter(
      ({ field }) => field.split('.').length > 1
    );
    if (deepFilters.length > 0) {
      strapi.log.warn(
        'Deep filtering queries should be used carefully (e.g Can cause performance issues).\nWhen possible build custom routes which will in most case be more optimised.'
      );
    }

    // cast where clauses to match the inner types
    filters.where = filters.where
      .filter(({ value }) => !_.isNil(value))
      .map(({ field, operator, value }) => {
        const { model: assocModel, attribute } = getAssociationFromFieldKey({
          model,
          field,
        });

        const { type } = _.get(assocModel, ['attributes', attribute], {});

        // cast value or array of values
        const castedValue = Array.isArray(value)
          ? value.map(val => castValue({ type, operator, value: val }))
          : castValue({ type, operator, value: value });

        return { field, operator, value: castedValue };
      });
  }

  // call the orm's buildQuery implementation
  return strapi.db.connectors
    .get(model.orm)
    .buildQuery({ model, filters, ...rest });
};

module.exports = buildQuery;
