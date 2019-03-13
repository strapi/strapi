const _ = require('lodash');
const utils = require('./utils')();
const util = require('util');

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

const computePopulatedPaths = ({ model, populate = [], where = [] }) => {
  const castedPopulate = populate.map(el => (Array.isArray(el) ? el.join('.') : el));

  const castedWhere = where
    .map(({ field }) => findModelPath({ rootModel: model, path: field }))
    .filter(path => !!path);

  return pathsToTree([...castedPopulate, ...castedWhere]);
};

const buildQuery = ({ model, filters, populate = [] } = {}) => {
  let query = model.aggregate();

  // compute all the final populated paths and their models
  const populatedModels = computePopulatedPaths({ model, populate, where: filters.where });

  const joins = buildJoins(model, { paths: populatedModels });
  query.append(joins);

  if (_.has(filters, 'where') && Array.isArray(filters.where)) {
    const matches = filters.where.map(whereClause => {
      return {
        $match: buildWhereClause(formatWhereClause(model, whereClause)),
      };
    });

    query = query.append(matches);
  }

  if (_.has(filters, 'sort')) {
    const sortFilter = filters.sort.reduce((acc, sort) => {
      const { field, order } = sort;
      acc[field] = order === 'asc' ? 1 : -1;
      return acc;
    }, {});

    query = query.sort(sortFilter);
  }

  if (_.has(filters, 'start')) {
    query = query.skip(filters.start);
  }

  if (_.has(filters, 'limit') && filters.limit >= 0) {
    query = query.limit(filters.limit);
  }

  const hydrateFn = hydrateModel({
    model,
    populatedModels,
  });

  return {
    count(...args) {
      return query.count(...args);
    },
    group(...args) {
      return query.group(...args);
    },
    lean() {
      return this.then(results => {
        return results.map(r => r.toObject());
      });
    },
    then(onSuccess, onError) {
      return query
        .then(result => (Array.isArray(result) ? result.map(hydrateFn) : hydrateFn(result)))
        .then(onSuccess, onError);
    },
    catch(...args) {
      return query.catch(...args);
    },
  };
};

const hydrateModel = ({ model: rootModel, populatedModels }) => obj => {
  const toSet = Object.keys(populatedModels).reduce((acc, key) => {
    const val = _.get(obj, key);
    if (!val) return acc;

    const subHydrate = hydrateModel({
      model: findModelByPath({ rootModel, path: key }),
      populatedModels: populatedModels[key],
    });

    acc.push({
      path: key,
      data: Array.isArray(val) ? val.map(v => subHydrate(v)) : subHydrate(val),
    });

    return acc;
  }, []);

  let doc = rootModel.hydrate(obj);
  toSet.forEach(({ path, data }) => {
    _.set(doc, path, data);
  });

  return doc;
};

const buildWhereClause = ({ field, operator, value }) => {
  switch (operator) {
    case 'eq':
      return { [field]: utils.valueToId(value) };
    case 'ne':
      return { [field]: { $ne: utils.valueToId(value) } };
    case 'lt':
      return { [field]: { $lt: value } };
    case 'lte':
      return { [field]: { $lte: value } };
    case 'gt':
      return { [field]: { $gt: value } };
    case 'gte':
      return { [field]: { $gte: value } };
    case 'in':
      return {
        [field]: {
          $in: Array.isArray(value) ? value.map(utils.valueToId) : [utils.valueToId(value)],
        },
      };
    case 'nin':
      return {
        [field]: {
          $nin: Array.isArray(value) ? value.map(utils.valueToId) : [utils.valueToId(value)],
        },
      };
    case 'contains': {
      return {
        [field]: {
          $regex: value,
          $options: 'i',
        },
      };
    }
    case 'ncontains':
      return {
        [field]: {
          $not: new RegExp(value, 'i'),
        },
      };
    case 'containss':
      return {
        [field]: {
          $regex: value,
        },
      };
    case 'ncontainss':
      return {
        [field]: {
          $not: new RegExp(value),
        },
      };

    default:
      throw new Error(`Unhandled whereClause : ${fullField} ${operator} ${value}`);
  }
};

const getAssociationFromFieldKey = (strapiModel, fieldKey) => {
  let model = strapiModel;
  let assoc;

  const parts = fieldKey.split('.');

  for (let key of parts) {
    assoc = model.associations.find(ast => ast.alias === key);
    if (assoc) {
      model = findModelByAssoc({ assoc });
    }
  }

  return {
    assoc,
    model,
  };
};

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

const buildMatch = ({ assoc }) => {
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
    case 'oneToManyMorph': {
      return [
        { $unwind: { path: `$${assoc.via}`, preserveNullAndEmptyArrays: true } },
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
  }
};

const buildLookup = ({ part, model, paths }) => {
  const assoc = model.associations.find(a => a.alias === part);
  const assocModel = findModelByAssoc({ assoc });

  return [
    {
      $lookup: {
        from: assocModel.collectionName,
        as: assoc.alias,
        let: {
          localId: '$_id',
          localAlias: `$${assoc.alias}`,
        },
        pipeline: [].concat(buildMatch({ assoc })).concat(buildJoins(assocModel, { paths })),
      },
    },
  ].concat(
    assoc.type === 'model'
      ? {
        $unwind: {
          path: `$${assoc.alias}`,
          preserveNullAndEmptyArrays: true,
        },
      }
      : []
  );
};

const buildJoins = (model, { paths } = {}) => {
  return Object.keys(paths).reduce((acc, path) => {
    return acc.concat(buildLookup({ part: path, paths: paths[path], model }));
  }, []);
};

const pathsToTree = paths => paths.reduce((acc, path) => _.merge(acc, _.set({}, path, {})), {});

module.exports = buildQuery;
