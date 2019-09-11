const _ = require('lodash');
const utils = require('./utils')();

/**
 * Build a mongo query
 * @param {Object} options - Query options
 * @param {Object} options.model - The model you are querying
 * @param {Object} options.filers - An object with the possible filters (start, limit, sort, where)
 * @param {Object} options.populate - An array of paths to populate
 * @param {boolean} options.aggregate - Force aggregate function to use group by feature
 */
const buildQuery = ({
  model,
  filters = {},
  populate = [],
  aggregate = false,
} = {}) => {
  const deepFilters = (filters.where || []).filter(
    ({ field }) => field.split('.').length > 1
  );

  if (deepFilters.length === 0 && aggregate === false) {
    return buildSimpleQuery({ model, filters, populate });
  }

  return buildDeepQuery({ model, filters, populate });
};

/**
 * Builds a simple find query when there are no deep filters
 * @param {Object} options - Query options
 * @param {Object} options.model - The model you are querying
 * @param {Object} options.filers - An object with the possible filters (start, limit, sort, where)
 * @param {Object} options.populate - An array of paths to populate
 */
const buildSimpleQuery = ({ model, filters, populate }) => {
  const { where = [] } = filters;

  const wheres = where.map(buildWhereClause);
  const findCriteria = wheres.length > 0 ? { $and: wheres } : {};

  let query = model.find(findCriteria).populate(populate);
  query = applyQueryParams({ query, filters });

  return Object.assign(query, {
    // Override count to use countDocuments on simple find query
    count(...args) {
      return query.countDocuments(...args);
    },
  });
};

/**
 * Builds a deep aggregate query when there are deep filters
 * @param {Object} options - Query options
 * @param {Object} options.model - The model you are querying
 * @param {Object} options.filers - An object with the possible filters (start, limit, sort, where)
 * @param {Object} options.populate - An array of paths to populate
 */
const buildDeepQuery = ({ model, filters, populate }) => {
  // Build a tree of paths to populate based on the filtering and the populate option
  const { populatePaths, wherePaths } = computePopulatedPaths({
    model,
    populate,
    where: filters.where,
  });

  // Init the query
  let query = model
    .aggregate(
      buildQueryAggregate(model, {
        paths: _.merge({}, populatePaths, wherePaths),
      })
    )
    .append(buildQueryMatches(model, filters));

  return {
    /**
     * Overrides the promise to rehydrate mongoose docs after the aggregation query
     */
    then(...args) {
      return query
        .append({
          $project: { _id: true },
        })
        .then(results => results.map(el => el._id))
        .then(ids => {
          if (ids.length === 0) return [];

          const query = model
            .find({
              _id: {
                $in: ids,
              },
            })
            .populate(populate);

          return applyQueryParams({ query, filters });
        })
        .then(...args);
    },
    catch(...args) {
      return this.then(r => r).catch(...args);
    },
    /**
     * Maps to query.count
     */
    count() {
      return query
        .count('count')
        .then(results => _.get(results, ['0', 'count'], 0));
    },

    /**
     * Maps to query group
     */
    group(...args) {
      return query.group(...args);
    },
    /**
     * Returns an array of plain JS object instead of mongoose documents
     */
    lean() {
      // Returns plain js objects without the transformations we normally do on find
      return this.then(results => {
        return results.map(r => r.toObject({ transform: false }));
      });
    },
  };
};

/**
 * Apply sort limit and start params
 * @param {Object} options - Options
 * @param {Object} options.query - Mongoose query
 * @param {Object} options.filters - Filters object
 */
const applyQueryParams = ({ query, filters }) => {
  // Apply sort param
  if (_.has(filters, 'sort')) {
    const sortFilter = filters.sort.reduce((acc, sort) => {
      const { field, order } = sort;
      acc[field] = order === 'asc' ? 1 : -1;
      return acc;
    }, {});

    query = query.sort(sortFilter);
  }

  // Apply start param
  if (_.has(filters, 'start')) {
    query = query.skip(filters.start);
  }

  // Apply limit param
  if (_.has(filters, 'limit') && filters.limit >= 0) {
    query = query.limit(filters.limit);
  }

  return query;
};

/**
 * Returns a tree of the paths to populate both for population and deep filtering purposes
 * @param {Object} options - Options
 * @param {Object} options.model - Model from which to populate
 * @param {Object} options.populate - Paths to populate
 * @param {Object} options.where - Where clauses we need to populate to filters
 */
const computePopulatedPaths = ({ model, populate = [], where = [] }) => {
  const castedPopulatePaths = populate
    .map(el => (Array.isArray(el) ? el.join('.') : el))
    .map(path => findModelPath({ rootModel: model, path }))
    .map(path => {
      const assocModel = findModelByPath({ rootModel: model, path });

      // autoload morph relations
      let extraPaths = [];
      if (assocModel) {
        extraPaths = assocModel.associations
          .filter(assoc => assoc.nature.toLowerCase().indexOf('morph') !== -1)
          .map(assoc => `${path}.${assoc.alias}`);
      }

      return [path, ...extraPaths];
    })
    .reduce((acc, paths) => acc.concat(paths), []);

  const castedWherePaths = where
    .map(({ field }) => findModelPath({ rootModel: model, path: field }))
    .filter(path => !!path);

  return {
    populatePaths: pathsToTree(castedPopulatePaths),
    wherePaths: pathsToTree(castedWherePaths),
  };
};

/**
 * Builds an object based on paths:
 * [
 *    'articles',
 *    'articles.tags.cateogry',
 *    'articles.tags.label',
 * ] => {
 *  articles: {
 *    tags: {
 *      category: {},
 *      label: {}
 *    }
 *  }
 * }
 * @param {Array<string>} paths - A list of paths to transform
 */
const pathsToTree = paths =>
  paths.reduce((acc, path) => _.merge(acc, _.set({}, path, {})), {});

/**
 * Builds the aggregations pipeling of the query
 * @param {Object} model - Queried model
 * @param {Object} options - Options
 * @param {Object} options.paths - A tree of paths to aggregate e.g { article : { tags : { label: {}}}}
 */
const buildQueryAggregate = (model, { paths } = {}) => {
  return Object.keys(paths).reduce((acc, key) => {
    return acc.concat(buildLookup({ model, key, paths: paths[key] }));
  }, []);
};

/**
 * Builds a lookup aggregation for a specific key
 * @param {Object} options - Options
 * @param {Object} options.model - Queried model
 * @param {string} options.key - The attribute name to lookup on the model
 * @param {Object} options.paths - A tree of paths to aggregate inside the current lookup e.g { { tags : { label: {}}}
 */
const buildLookup = ({ model, key, paths }) => {
  const assoc = model.associations.find(a => a.alias === key);
  const assocModel = findModelByAssoc({ assoc });

  if (!assocModel) return [];

  return [
    {
      $lookup: {
        from: assocModel.collectionName,
        as: assoc.alias,
        let: {
          localId: '$_id',
          localAlias: `$${assoc.alias}`,
        },
        pipeline: []
          .concat(buildLookupMatch({ assoc }))
          .concat(buildQueryAggregate(assocModel, { paths })),
      },
    },
  ];
};

/**
 * Build a lookup match expression (equivalent to a SQL join condition)
 * @param {Object} options - Options
 * @param {Object} options.assoc - The association on which is based the ematching xpression
 */
const buildLookupMatch = ({ assoc }) => {
  switch (assoc.nature) {
    case 'oneToOne': {
      return [
        {
          $match: {
            $expr: {
              $eq: [`$${assoc.via}`, '$$localId'],
            },
          },
        },
      ];
    }
    case 'oneToMany': {
      return {
        $match: {
          $expr: {
            $eq: [`$${assoc.via}`, '$$localId'],
          },
        },
      };
    }
    case 'oneWay':
    case 'manyToOne': {
      return {
        $match: {
          $expr: {
            $eq: ['$$localAlias', '$_id'],
          },
        },
      };
    }
    case 'manyToMany': {
      if (assoc.dominant === true) {
        return {
          $match: {
            $expr: {
              $in: ['$_id', '$$localAlias'],
            },
          },
        };
      }

      return {
        $match: {
          $expr: {
            $in: ['$$localId', `$${assoc.via}`],
          },
        },
      };
    }
    case 'manyToManyMorph':
    case 'oneToManyMorph': {
      return [
        {
          $unwind: { path: `$${assoc.via}`, preserveNullAndEmptyArrays: true },
        },
        {
          $match: {
            $expr: {
              $and: [
                { $eq: [`$${assoc.via}.ref`, '$$localId'] },
                { $eq: [`$${assoc.via}.${assoc.filter}`, assoc.alias] },
              ],
            },
          },
        },
      ];
    }
    default:
      return [];
  }
};

/**
 * Match query for lookups
 * @param {Object} model - Mongoose model
 * @param {Object} filters - Filters object
 */
const buildQueryMatches = (model, filters) => {
  if (_.has(filters, 'where') && Array.isArray(filters.where)) {
    return filters.where.map(whereClause => {
      return {
        $match: buildWhereClause(formatWhereClause(model, whereClause)),
      };
    });
  }

  return [];
};

/**
 * Cast values
 * @param {*} value - Value to cast
 */
const formatValue = value => utils.valueToId(value);

/**
 * Builds a where clause
 * @param {Object} options - Options
 * @param {string} options.field - Where clause field
 * @param {string} options.operator - Where clause operator
 * @param {*} options.value - Where clause alue
 */
const buildWhereClause = ({ field, operator, value }) => {
  if (Array.isArray(value) && !['in', 'nin'].includes(operator)) {
    return {
      $or: value.map(val => buildWhereClause({ field, operator, value: val })),
    };
  }

  const val = formatValue(value);

  switch (operator) {
    case 'eq':
      return { [field]: val };
    case 'ne':
      return { [field]: { $ne: val } };
    case 'lt':
      return { [field]: { $lt: val } };
    case 'lte':
      return { [field]: { $lte: val } };
    case 'gt':
      return { [field]: { $gt: val } };
    case 'gte':
      return { [field]: { $gte: val } };
    case 'in':
      return {
        [field]: {
          $in: Array.isArray(val) ? val : [val],
        },
      };
    case 'nin':
      return {
        [field]: {
          $nin: Array.isArray(val) ? val : [val],
        },
      };
    case 'contains': {
      return {
        [field]: {
          $regex: `${val}`,
          $options: 'i',
        },
      };
    }
    case 'ncontains':
      return {
        [field]: {
          $not: new RegExp(val, 'i'),
        },
      };
    case 'containss':
      return {
        [field]: {
          $regex: `${val}`,
        },
      };
    case 'ncontainss':
      return {
        [field]: {
          $not: new RegExp(val),
        },
      };
    case 'null': {
      return value ? { [field]: { $eq: null } } : { [field]: { $ne: null } };
    }

    default:
      throw new Error(`Unhandled whereClause : ${field} ${operator} ${value}`);
  }
};

/**
 * Add primaryKey on relation where clause for lookups match
 * @param {Object} model - Mongoose model
 * @param {Object} whereClause - Where clause
 * @param {string} whereClause.field - Where clause field
 * @param {string} whereClause.operator - Where clause operator
 * @param {*} whereClause.value - Where clause alue
 */
const formatWhereClause = (model, { field, operator, value }) => {
  const { assoc, model: assocModel } = getAssociationFromFieldKey(model, field);

  const shouldFieldBeSuffixed =
    assoc &&
    !_.endsWith(field, assocModel.primaryKey) &&
    (['in', 'nin'].includes(operator) || // When using in or nin operators we want to apply the filter on the relation's primary key and not the relation itself
      (['eq', 'ne'].includes(operator) && utils.isMongoId(value))); // Only suffix the field if the operators are eq or ne and the value is a valid mongo id

  return {
    field: shouldFieldBeSuffixed ? `${field}.${assocModel.primaryKey}` : field,
    operator,
    value,
  };
};

/**
 * Returns an association from a path starting from model
 * @param {Object} model - Mongoose model
 * @param {string} fieldKey - Relation path
 */
const getAssociationFromFieldKey = (model, fieldKey) => {
  let tmpModel = model;
  let assoc;

  const parts = fieldKey.split('.');

  for (let key of parts) {
    assoc = tmpModel.associations.find(ast => ast.alias === key);
    if (assoc) {
      tmpModel = findModelByAssoc({ assoc });
    }
  }

  return {
    assoc,
    model: tmpModel,
  };
};

/**
 * Returns a model from a relation path and a root model
 * @param {Object} options - Options
 * @param {Object} options.rootModel - Mongoose model
 * @param {string} options.path - Relation path
 */
const findModelByPath = ({ rootModel, path }) => {
  const parts = path.split('.');

  let tmpModel = rootModel;
  for (let part of parts) {
    const assoc = tmpModel.associations.find(ast => ast.alias === part);
    if (assoc) {
      tmpModel = findModelByAssoc({ assoc });
    }
  }

  return tmpModel;
};

/**
 * Returns a model path from an attribute path and a root model
 * @param {Object} options - Options
 * @param {Object} options.rootModel - Mongoose model
 * @param {string} options.path - Attribute path
 */
const findModelPath = ({ rootModel, path }) => {
  const parts = path.split('.');

  let tmpModel = rootModel;
  let tmpPath = [];
  for (let part of parts) {
    const assoc = tmpModel.associations.find(ast => ast.alias === part);

    if (assoc) {
      tmpModel = findModelByAssoc({ assoc });
      tmpPath.push(part);
    }
  }

  return tmpPath.length > 0 ? tmpPath.join('.') : null;
};

const findModelByAssoc = ({ assoc }) => {
  const { models } = strapi.plugins[assoc.plugin] || strapi;
  return models[assoc.model || assoc.collection];
};

module.exports = buildQuery;
