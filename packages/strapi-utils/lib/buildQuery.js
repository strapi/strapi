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

const buildQuery = ({ model, filters, ...rest }) => {
  const validator = createFilterValidator(model);

  if (filters.where && Array.isArray(filters.where)) {
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

  const hook = strapi.hook[model.orm];

  return hook.load().buildQuery({ model, filters, ...rest });
};

module.exports = buildQuery;
