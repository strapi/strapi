const _ = require('lodash');

const createFilterValidator = model => ({ field }) => {
  const fieldParts = field.split('.');
  const fieldPartsSize = fieldParts.length;

  return _.every(fieldParts, (fieldPart, index) => {
    const fieldIdx = index + 1;
    const isAttribute = !!model.attributes[fieldPart] || model.primaryKey === fieldPart;

    const association = model.associations.find(ast => ast.alias === fieldPart);
    const isAssociation = !!association;
    if (fieldIdx < fieldPartsSize) {
      if (isAssociation) {
        const { models } = association.plugin ? strapi.plugins[association.plugin] : strapi;
        model = models[association.collection || association.model];
        return true;
      }
    } else if (fieldIdx === fieldPartsSize) {
      if (isAttribute || isAssociation) {
        return true;
      }
    }

    return false;
  });
};

const buildQuery = ({ model, filters, ...rest }) => {
  const validator = createFilterValidator(model);

  if (filters.where && Array.isArray(filters.where)) {
    filters.where.forEach(whereClause => {
      if (!validator(whereClause)) {
        throw new Error(
          `Your filters contain a field "${
            whereClause.field
          }" that doesn't appear on your model definition nor it's relations`
        );
      }
    });
  }

  const hook = strapi.hook[model.orm];

  return hook.load().buildQuery({ model, filters, ...rest });
};

module.exports = buildQuery;
