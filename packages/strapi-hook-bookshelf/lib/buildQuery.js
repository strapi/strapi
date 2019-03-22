const _ = require('lodash');

const buildQuery = ({ model, filters }) => qb => {
  if (_.has(filters, 'where') && Array.isArray(filters.where)) {
    // build path with aliases and return a mapping of the paths with there aliases;

    // build joins
    buildQueryJoins(qb, { model, where: filters.where });

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

      buildWhereClause({
        qb,
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

const buildWhereClause = ({ qb, field, operator, value }) => {
  if (Array.isArray(value) && !['in', 'nin'].includes(operator)) {
    return qb.where(subQb => {
      for (let val of value) {
        subQb.orWhere(q => buildWhereClause({ qb: q, field, operator, value: val }));
      }
    });
  }

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
      return qb.whereNotIn(field, Array.isArray(value) ? value : [value]);
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
      throw new Error(`Unhandled whereClause : ${field} ${operator} ${value}`);
  }
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

const getAssociationFromFieldKey = (model, fieldKey) => {
  let tmpModel = model;
  let association;
  let attributeKey;

  const parts = fieldKey.split('.');

  for (let key of parts) {
    attributeKey = key;
    association = tmpModel.associations.find(ast => ast.alias === key);
    if (association) {
      tmpModel = findModelByAssoc(association);
    }
  }

  return {
    association,
    model: tmpModel,
    attributeKey,
  };
};

const findModelByAssoc = assoc => {
  const { models } = assoc.plugin ? strapi.plugins[assoc.plugin] : strapi;
  return models[assoc.collection || assoc.model];
};

const buildQueryJoins = (qb, { model, where }) => {
  const relationToPopulate = extractRelationsFromWhere(where);

  return relationToPopulate.forEach(path => {
    const parts = path.split('.');

    let tmpModel = model;
    for (let part of parts) {
      const association = tmpModel.associations.find(assoc => assoc.alias === part);

      if (association) {
        const assocModel = findModelByAssoc(association);
        buildSingleJoin(qb, tmpModel, assocModel, association);
        tmpModel = assocModel;
      }
    }
  });
};

const buildSingleJoin = (qb, strapiModel, astModel, association) => {
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
      `${association.tableCollectionName}.${strapiModel.attributes[association.alias].attribute}_${
        strapiModel.attributes[association.alias].column
      }`,
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

module.exports = buildQuery;
