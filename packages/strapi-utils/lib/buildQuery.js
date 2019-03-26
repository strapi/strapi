const _ = require('lodash');

const findModelByAssoc = assoc => {
  const { models } = assoc.plugin ? strapi.plugins[assoc.plugin] : strapi;
  return models[assoc.collection || assoc.model];
};

const isAttribute = (model, field) => _.has(model.attributes, field) || model.primaryKey === field;

const createFilterValidator = model => ({ field }) => {
  const fieldParts = field.split('.');

  let isValid = true;
  let tmpModel = model;
  for (let i = 0; i < fieldParts.length; i++) {
    const field = fieldParts[i];

    const assoc = tmpModel.associations.find(ast => ast.alias === field);

    if (assoc) {
      tmpModel = findModelByAssoc(assoc);
      continue;
    }

    if (!assoc && (!isAttribute(tmpModel, field) || i !== fieldParts.length - 1)) {
      isValid = false;
      break;
    }
  }

  return isValid;
};

/**
 *
 * @param {Object} options - Options
 * @param {Object} options.model - The model for which the query will be built
 * @param {Object} options.filters - The filters for the query (start, sort, limit, and where clauses)
 * @param {Object} options.rest - In case the database layer requires any other params pass them
 */
const buildQuery = ({ model, filters, ...rest }) => {
  const validator = createFilterValidator(model);

  // Validate query clauses
  if (filters.where && Array.isArray(filters.where)) {
    const deepFilters = filters.where.filter(({ field }) => field.split('.').length > 1);
    if (deepFilters.length > 0) {
      strapi.log.warn(
        'Deep filtering queries should be used carefully (e.g Can cause performance issues).\nWhen possible build custom routes which will in most case be more optimised.'
      );
    }

    filters.where.forEach(whereClause => {
      if (!validator(whereClause)) {
        const err = new Error(
          `Your filters contain a field '${
            whereClause.field
          }' that doesn't appear on your model definition nor it's relations`
        );

        err.status = 400;
        throw err;
      }
    });
  }

  const orm = strapi.hook[model.orm];

  // call the orm's buildQuery implementation
  return orm.load().buildQuery({ model, filters, ...rest });
};

module.exports = buildQuery;
