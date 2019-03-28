const _ = require('lodash');
const pluralize = require('pluralize');

/**
 * Build filters on a bookshelf query
 * @param {Object} options - Options
 * @param {Object} options.model - Bookshelf model
 * @param {Object} options.filters - Filters params (start, limit, sort, where)
 */
const buildQuery = ({ model, filters }) => qb => {
  if (_.has(filters, 'where') && Array.isArray(filters.where)) {
    // build path with aliases and return a mapping of the paths with there aliases;

    // build joins
    buildQueryJoins(qb, { model, whereClauses: filters.where });

    // apply filters
    filters.where.forEach(({ field, operator, value }) => {
      const { association, model: associationModel, attributeKey } = getAssociationFromFieldKey(
        model,
        field
      );

      let fieldKey = `${associationModel.collectionName}.${attributeKey}`;

      if (association && attributeKey === whereClause.field) {
        fieldKey = `${associationModel.collectionName}.${associationModel.primaryKey}`;
      }

      buildWhereClause({
        qb,
        field: fieldKey,
        operator,
        value,
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

/**
 * Builds a sql where clause
 * @param {Object} options - Options
 * @param {Object} options.qb - Bookshelf (knex) query builder
 * @param {Object} options.model - Bookshelf model
 * @param {Object} options.field - Filtered field
 * @param {Object} options.operator - Filter operator (=,in,not eq etc..)
 * @param {Object} options.value - Filter value
 */
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

/**
 * Returns a list of model path to populate from a list of where clausers
 * @param {Object} where - where clause
 */
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

/**
 * Returns a model association and the model concerned based on a model and a field to reach
 * @param {Object} model - Bookshelf model
 * @param {*} fieldKey - a path to a model field (e.g author.group.title)
 */
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

/**
 * Returns a Bookshelf model based on a model association
 * @param {Object} assoc - A strapi association
 */
const findModelByAssoc = assoc => {
  const { models } = assoc.plugin ? strapi.plugins[assoc.plugin] : strapi;
  return models[assoc.collection || assoc.model];
};

/**
 * Builds database query joins based on a model and a where clause
 * @param {Object} qb - Bookshelf (knex) query builder
 * @param {Object} options - Options
 * @param {Object} options.model - Bookshelf model
 * @param {Array<Object>} options.whereClauses - a list of where clauses
 */
const buildQueryJoins = (qb, { model, whereClauses }) => {
  const relationToPopulate = extractRelationsFromWhere(whereClauses);

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

/**
 * Builds an individual join
 * @param {Object} qb - Bookshelf model
 * @param {Object} rootModel - The bookshelf model on which we are joining
 * @param {*} assocModel - The model we are joining to
 * @param {*} association - The association upo,n which the join is built
 */
const buildSingleJoin = (qb, rootModel, assocModel, association) => {
  const relationTable = assocModel.collectionName;

  qb.distinct();

  if (association.nature === 'manyToMany') {
    // Join on both ends
    qb.innerJoin(
      association.tableCollectionName,
      `${association.tableCollectionName}.${pluralize.singular(rootModel.collectionName)}_${
        rootModel.primaryKey
      }`,
      `${rootModel.collectionName}.${rootModel.primaryKey}`
    );

    qb.innerJoin(
      relationTable,
      `${association.tableCollectionName}.${rootModel.attributes[association.alias].attribute}_${
        rootModel.attributes[association.alias].column
      }`,
      `${relationTable}.${assocModel.primaryKey}`
    );
  } else {
    const externalKey =
      association.type === 'collection'
        ? `${relationTable}.${association.via}`
        : `${relationTable}.${assocModel.primaryKey}`;

    const internalKey =
      association.type === 'collection'
        ? `${rootModel.collectionName}.${rootModel.primaryKey}`
        : `${rootModel.collectionName}.${association.alias}`;

    qb.innerJoin(relationTable, externalKey, internalKey);
  }
};

module.exports = buildQuery;
