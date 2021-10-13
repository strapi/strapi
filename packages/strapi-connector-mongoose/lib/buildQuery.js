'use strict';

const _ = require('lodash');
const { isNil, isEmpty, set, omit, assoc } = require('lodash/fp');
const semver = require('semver');
const {
  hasDeepFilters,
  contentTypes: {
    constants: { DP_PUB_STATES },
    hasDraftAndPublish,
  },
} = require('strapi-utils');
const utils = require('./utils')();
const populateQueries = require('./utils/populate-queries');

const sortOrderMapper = {
  asc: 1,
  desc: -1,
};

const combineSearchAndWhere = (search = [], wheres = []) => {
  const criterias = {};
  if (search.length > 0 && wheres.length > 0) {
    criterias.$and = [{ $and: wheres }, { $or: search }];
  } else if (search.length > 0) {
    criterias.$or = search;
  } else if (wheres.length > 0) {
    criterias.$and = wheres;
  }
  return criterias;
};

const buildSearchOr = (model, query) => {
  if (typeof query !== 'string') {
    return [];
  }

  const searchOr = Object.keys(model.attributes).reduce((acc, curr) => {
    if (model.attributes[curr].searchable === false) {
      return acc;
    }
    switch (model.attributes[curr].type) {
      case 'biginteger':
      case 'integer':
      case 'float':
      case 'decimal':
        if (!_.isNaN(_.toNumber(query))) {
          const mongoVersion = model.db.base.mongoDBVersion;
          if (semver.valid(mongoVersion) && semver.gt(mongoVersion, '4.2.0')) {
            return acc.concat({
              $expr: {
                $regexMatch: {
                  input: { $toString: `$${curr}` },
                  regex: _.escapeRegExp(query),
                },
              },
            });
          } else {
            return acc.concat({ [curr]: _.toNumber(query) });
          }
        }
        return acc;
      case 'string':
      case 'text':
      case 'richtext':
      case 'email':
      case 'enumeration':
      case 'uid':
        return acc.concat({ [curr]: { $regex: _.escapeRegExp(query), $options: 'i' } });
      default:
        return acc;
    }
  }, []);

  if (utils.isMongoId(query)) {
    searchOr.push({ _id: query });
  }

  return searchOr;
};

const BOOLEAN_OPERATORS = ['or'];

/**
 * Build a mongo query
 * @param {Object} options - Query options
 * @param {Object} options.model - The model you are querying
 * @param {Object} options.filters - An object with the possible filters (start, limit, sort, where)
 * @param {Object} options.populate - An array of paths to populate
 * @param {boolean} options.aggregate - Force aggregate function to use group by feature
 */
const buildQuery = ({
  model,
  filters = {},
  searchParam,
  populate = [],
  aggregate = false,
  session = null,
} = {}) => {
  const search = buildSearchOr(model, searchParam);

  if (!hasDeepFilters(filters) && aggregate === false) {
    return buildSimpleQuery({ model, filters, search, populate }, { session });
  }

  return buildDeepQuery({ model, filters, populate, search }, { session });
};

/**
 * Builds a simple find query when there are no deep filters
 * @param {Object} options - Query options
 * @param {Object} options.model - The model you are querying
 * @param {Object} options.filters - An object with the possible filters (start, limit, sort, where)
 * @param {Object} options.search - An object with the possible search params
 * @param {Object} options.populate - An array of paths to populate
 */
const buildSimpleQuery = ({ model, filters, search, populate }, { session }) => {
  const { where = [] } = filters;

  const wheres = where.map(buildWhereClause);

  const findCriteria = combineSearchAndWhere(search, wheres);

  let query = model
    .find(findCriteria, null, { publicationState: filters.publicationState })
    .session(session)
    .populate(populate);

  query = applyQueryParams({ model, query, filters });

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
 * @param {Object} options.filters - An object with the possible filters (start, limit, sort, where)
 * @param {Object} options.populate - An array of paths to populate
 */
const buildDeepQuery = ({ model, filters, search, populate }, { session }) => {
  // Build a tree of paths to populate based on the filtering and the populate option
  const { populatePaths, wherePaths } = computePopulatedPaths({
    model,
    populate,
    where: filters.where,
  });

  const aggregateOptions = {
    paths: _.merge({}, populatePaths, wherePaths),
  };

  // Init the query
  let query = model
    .aggregate(buildQueryAggregate(model, filters, aggregateOptions))
    .session(session)
    .append(buildQueryMatches(model, filters, search))
    .append(buildQuerySort(model, filters))
    .append(buildQueryPagination(model, filters));

  return {
    /**
     * Overrides the promise to rehydrate mongoose docs after the aggregation query
     */
    then(...args) {
      return query
        .append({ $project: { _id: true } })
        .then(results => results.map(el => el._id))
        .then(ids => {
          if (ids.length === 0) return [];

          const idsMap = ids.reduce((acc, id, idx) => assoc(id, idx, acc), {});

          const mongooseQuery = model
            .find({ _id: { $in: ids } }, null)
            .session(session)
            .populate(populate);
          const query = applyQueryParams({
            model,
            query: mongooseQuery,
            filters: omit(['sort', 'start', 'limit'], filters),
          });

          return query.then(orderByIndexMap(idsMap));
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
      return query.count('count').then(results => _.get(results, ['0', 'count'], 0));
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
const applyQueryParams = ({ model, query, filters }) => {
  if (_.has(filters, 'sort')) {
    const sortFilter = filters.sort.reduce((acc, sort) => {
      const { field, order } = sort;
      acc[field] = sortOrderMapper[order];
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

  // Apply publication state param
  if (_.has(filters, 'publicationState')) {
    const populateQuery = populateQueries.publicationState[filters.publicationState];

    if (hasDraftAndPublish(model) && populateQuery) {
      query = query.where(populateQuery);
    }
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

  const castedWherePaths = recursiveCastedWherePaths(where, { model });

  return {
    populatePaths: pathsToTree(castedPopulatePaths),
    wherePaths: pathsToTree(castedWherePaths),
  };
};

const recursiveCastedWherePaths = (whereClauses, { model }) => {
  const paths = whereClauses.map(({ field, operator, value }) => {
    if (BOOLEAN_OPERATORS.includes(operator)) {
      return value.map(where => recursiveCastedWherePaths(where, { model }));
    }

    return findModelPath({ rootModel: model, path: field });
  });

  return _.flattenDeep(paths).filter(path => !!path);
};

/**
 * Builds an object based on paths:
 * [
 *    'articles',
 *    'articles.tags.category',
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
const pathsToTree = paths => paths.reduce((acc, path) => _.merge(acc, _.set({}, path, {})), {});

/**
 * Builds the aggregations pipeline of the query
 * @param {Object} model - Queried model
 * @param {Object} filters - The query filters
 * @param {Object} options - Options
 * @param {Object} options.paths - A tree of paths to aggregate e.g { article : { tags : { label: {}}}}
 */
const buildQueryAggregate = (model, filters, { paths } = {}) => {
  return Object.keys(paths).reduce((acc, key) => {
    return acc.concat(buildLookup({ model, key, paths: paths[key], filters }));
  }, []);
};

/**
 * Builds a lookup aggregation for a specific key
 * @param {Object} options - Options
 * @param {Object} options.model - Queried model
 * @param {string} options.key - The attribute name to lookup on the model
 * @param {Object} options.paths - A tree of paths to aggregate inside the current lookup e.g { { tags : { label: {}}}
 */
const buildLookup = ({ model, key, paths, filters }) => {
  const assoc = model.associations.find(a => a.alias === key);
  const assocModel = strapi.db.getModelByAssoc(assoc);

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
          .concat(buildLookupMatch({ assoc, assocModel, filters }))
          .concat(buildQueryAggregate(assocModel, filters, { paths })),
      },
    },
  ];
};

/**
 * Build a lookup match expression (equivalent to a SQL join condition)
 * @param {Object} options - Options
 * @param {Object} options.assoc - The association on which is based the matching expression
 */
const buildLookupMatch = ({ assoc, assocModel, filters = {} }) => {
  const defaultMatches = [];

  if (hasDraftAndPublish(assocModel) && DP_PUB_STATES.includes(filters.publicationState)) {
    const dpQuery = populateQueries.publicationState[filters.publicationState];

    if (_.isObject(dpQuery)) {
      defaultMatches.push(dpQuery);
    }
  }

  switch (assoc.nature) {
    case 'oneToOne': {
      return [
        {
          $match: {
            $and: defaultMatches.concat({
              $expr: {
                $eq: [`$${assoc.via}`, '$$localId'],
              },
            }),
          },
        },
      ];
    }
    case 'oneToMany': {
      return {
        $match: {
          $and: defaultMatches.concat({
            $expr: {
              $eq: [`$${assoc.via}`, '$$localId'],
            },
          }),
        },
      };
    }
    case 'oneWay':
    case 'manyToOne': {
      return {
        $match: {
          $and: defaultMatches.concat({
            $expr: {
              $eq: ['$$localAlias', '$_id'],
            },
          }),
        },
      };
    }
    case 'manyWay': {
      return {
        $match: {
          $and: defaultMatches.concat({
            $expr: {
              $in: ['$_id', { $ifNull: ['$$localAlias', []] }],
            },
          }),
        },
      };
    }
    case 'manyToMany': {
      if (assoc.dominant === true) {
        return {
          $match: {
            $and: defaultMatches.concat({
              $expr: {
                $in: ['$_id', { $ifNull: ['$$localAlias', []] }],
              },
            }),
          },
        };
      }

      return {
        $match: {
          $and: defaultMatches.concat({
            $expr: {
              $in: ['$$localId', { $ifNull: [`$${assoc.via}`, []] }],
            },
          }),
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
            $and: defaultMatches.concat({
              $expr: {
                $and: [
                  { $eq: [`$${assoc.via}.ref`, '$$localId'] },
                  { $eq: [`$${assoc.via}.${assoc.filter}`, assoc.alias] },
                ],
              },
            }),
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
 * @param {Array} search
 */
const buildQueryMatches = (model, filters, search = []) => {
  if (_.has(filters, 'where') && Array.isArray(filters.where)) {
    const wheres = filters.where.map(whereClause => {
      return buildWhereClause(formatWhereClause(model, whereClause));
    });

    const criterias = combineSearchAndWhere(search, wheres);

    return [{ $match: criterias }];
  }

  return [];
};

/**
 * Sort query for the aggregate
 * @param {Object} model - Mongoose model
 * @param {Object} filters - Filters object
 */
const buildQuerySort = (model, filters) => {
  const { sort } = filters;

  if (Array.isArray(sort) && !isEmpty(sort)) {
    return [
      {
        $sort: sort.reduce(
          (acc, { field, order }) => set([field], sortOrderMapper[order], acc),
          {}
        ),
      },
    ];
  }

  return [];
};

/**
 * Add pagination operators for the aggregate
 * @param {Object} model - Mongoose model
 * @param {Object} filters - Filters object
 */
const buildQueryPagination = (model, filters) => {
  const { limit, start } = filters;
  const pagination = [];

  if (start && start >= 0) {
    pagination.push({ $skip: start });
  }

  if (limit && limit >= 0) {
    pagination.push({ $limit: limit });
  }

  return pagination;
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
  if (Array.isArray(value) && !['or', 'in', 'nin'].includes(operator)) {
    return {
      $or: value.map(val => buildWhereClause({ field, operator, value: val })),
    };
  }

  const val = formatValue(value);

  switch (operator) {
    case 'or': {
      return {
        $or: value.map(orClause => {
          if (Array.isArray(orClause)) {
            return {
              $and: orClause.map(buildWhereClause),
            };
          } else {
            return buildWhereClause(orClause);
          }
        }),
      };
    }
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
          $regex: _.escapeRegExp(`${val}`),
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
          $regex: _.escapeRegExp(`${val}`),
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
  if (BOOLEAN_OPERATORS.includes(operator)) {
    return {
      field,
      operator,
      value: value.map(v => v.map(whereClause => formatWhereClause(model, whereClause))),
    };
  }

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
      tmpModel = strapi.db.getModelByAssoc(assoc);
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
      tmpModel = strapi.db.getModelByAssoc(assoc);
    }
  }

  return tmpModel;
};

/**
 * Returns a model path from an attribute path and a root model
 * @param {Object} options - Options
 * @param {Object} options.rootModel - Mongoose model
 * @param {string|Object} options.path - Attribute path
 */
const findModelPath = ({ rootModel, path }) => {
  const parts = (_.isObject(path) ? path.path : path).split('.');

  let tmpModel = rootModel;
  let tmpPath = [];
  for (let part of parts) {
    const assoc = tmpModel.associations.find(ast => ast.alias === part);

    if (assoc) {
      tmpModel = strapi.db.getModelByAssoc(assoc);
      tmpPath.push(part);
    }
  }

  return tmpPath.length > 0 ? tmpPath.join('.') : null;
};

/**
 * Order a list of entities based on an indexMap
 * @param {Object} indexMap - index map of the form { [id]: index }
 */
const orderByIndexMap = indexMap => entities => {
  return entities
    .reduce((acc, entry) => {
      acc[indexMap[entry._id]] = entry;
      return acc;
    }, [])
    .filter(entity => !isNil(entity));
};

module.exports = buildQuery;
