const _ = require('lodash');

const buildQuery = ({ model, filters }) => qb => {
  if (_.has(filters, 'where') && Array.isArray(filters.where)) {
    // build joins
    buildQueryJoins(qb)(model, filters.where);

    // apply filters
    filters.where.forEach(whereClause => {
      const { association, model: fieldModel, attributeKey } = getAssociationFromFieldKey(
        model,
        whereClause.field
      );

      let fieldKey = `${fieldModel.collectionName}.${attributeKey}`;

      if (association && attributeKey === whereClause.field) {
        fieldKey = `${fieldModel.collectionName}.${fieldModel.primaryKey}`;
      }

      buildWhereClause(qb)({
        ...whereClause,
        field: fieldKey,
      });
    });
  }

  if (_.has(filters, 'sort')) {
    qb.orderBy(
      filters.sort.map(({ field, order }) => ({
        column: field,
        order,
      }))
    );
  }

  if (_.has(filters, 'start')) {
    qb.offset(filters.start);
  }

  if (_.has(filters, 'limit') && filters.limit >= 0) {
    qb.limit(filters.limit);
  }
};

const buildWhereClause = qb => ({ field, operator, value }) => {
  switch (operator) {
    case 'eq':
      return qb.where(field, value);
    case 'ne':
      return qb.where(field, '!=', value);
    case 'lt':
      return qb.where(field, '<', value);
    case 'lte':
      return qb.where(field, '<=', value);
    case 'gt':
      return qb.where(field, '>', value);
    case 'gte':
      return qb.where(field, '>=', value);
    case 'in':
      return qb.whereIn(field, Array.isArray(value) ? value : [value]);
    case 'nin':
      return qb.whereNotIn(field, 'NOT IN', Array.isArray(value) ? value : [value]);
    case 'contains': {
      return qb.whereRaw('LOWER(??) LIKE LOWER(?)', [field, `%${value}%`]);
    }
    case 'ncontains':
      return qb.whereRaw('LOWER(??) NOT LIKE LOWER(?)', [field, `%${value}%`]);
    case 'containss':
      return qb.where(field, 'like', `%${value}%`);
    case 'ncontainss':
      return qb.whereNot(field, 'like', `%${value}%`);

    default:
      throw new Error(`Unhandled whereClause : ${fullField} ${operator} ${value}`);
  }
};

const buildQueryJoins = qb => {
  return (strapiModel, where) => {
    const relationToPopulate = extractRelationsFromWhere(where);

    relationToPopulate.forEach(fieldPath => {
      const associationParts = fieldPath.split('.');

      let currentModel = strapiModel;
      associationParts.forEach(astPart => {
        const { association, model } = getAssociationFromFieldKey(currentModel, astPart);

        if (association) {
          buildSingleJoin(qb)(currentModel, model, association);
          currentModel = model;
        }
      });
    });
  };
};

const extractRelationsFromWhere = where => {
  return where
    .map(({ field }) => {
      const parts = field.split('.');
      return parts.length === 1 ? field : _.initial(parts).join('.');
    })
    .sort()
    .reverse()
    .reduce((acc, currentValue) => {
      const alreadyPopulated = _.some(acc, item => _.startsWith(item, currentValue));
      if (!alreadyPopulated) {
        acc.push(currentValue);
      }
      return acc;
    }, []);
};

const getAssociationFromFieldKey = (strapiModel, fieldKey) => {
  let model = strapiModel;
  let association;
  let attributeKey;

  const parts = fieldKey.split('.');

  for (let key of parts) {
    attributeKey = key;
    association = model.associations.find(ast => ast.alias === key);
    if (association) {
      const { models } = strapi.plugins[association.plugin] || strapi;
      model = models[association.model || association.collection];
    }
  }

  return {
    association,
    model,
    attributeKey,
  };
};

const buildSingleJoin = qb => {
  return (strapiModel, astModel, association) => {
    const relationTable = astModel.collectionName;

    qb.distinct();

    if (association.nature === 'manyToMany') {
      // Join on both ends
      qb.innerJoin(
        association.tableCollectionName,
        `${association.tableCollectionName}.${strapiModel.info.name}_${strapiModel.primaryKey}`,
        `${strapiModel.collectionName}.${strapiModel.primaryKey}`
      );

      qb.innerJoin(
        relationTable,
        `${association.tableCollectionName}.${
          strapiModel.attributes[association.alias].attribute
        }_${strapiModel.attributes[association.alias].column}`,
        `${relationTable}.${astModel.primaryKey}`
      );
    } else {
      const externalKey =
        association.type === 'collection'
          ? `${relationTable}.${association.via}`
          : `${relationTable}.${astModel.primaryKey}`;

      const internalKey =
        association.type === 'collection'
          ? `${strapiModel.collectionName}.${strapiModel.primaryKey}`
          : `${strapiModel.collectionName}.${association.alias}`;

      qb.innerJoin(relationTable, externalKey, internalKey);
    }
  };
};

module.exports = buildQuery;
