const _ = require('lodash');

const buildTempFieldPath = field => {
  return `__${field}`;
};

const restoreRealFieldPath = (field, prefix) => {
  return `${prefix}${field}`;
};

export const generateLookupStage = (
  strapiModel,
  { whitelistedPopulate = null, prefixPath = '' } = {}
) => {
  const result = strapiModel.associations
    .filter(ast => {
      if (whitelistedPopulate) {
        return _.includes(whitelistedPopulate, ast.alias);
      }
      return ast.autoPopulate;
    })
    .reduce((acc, ast) => {
      const model = ast.plugin
        ? strapi.plugins[ast.plugin].models[ast.collection || ast.model]
        : strapi.models[ast.collection || ast.model];

      const from = model.collectionName;
      const isDominantAssociation = ast.dominant || !!ast.model;

      const _localField = !isDominantAssociation
        ? '_id'
        : ast.via === strapiModel.collectionName || ast.via === 'related'
          ? '_id'
          : ast.alias;

      const localField = `${prefixPath}${_localField}`;

      const foreignField = ast.filter
        ? `${ast.via}.ref`
        : isDominantAssociation
          ? ast.via === strapiModel.collectionName
            ? ast.via
            : '_id'
          : ast.via === strapiModel.collectionName
            ? '_id'
            : ast.via;

      // Add the juncture like the `.populate()` function
      const asTempPath = buildTempFieldPath(ast.alias, prefixPath);
      const asRealPath = restoreRealFieldPath(ast.alias, prefixPath);
      acc.push({
        $lookup: {
          from,
          localField,
          foreignField,
          as: asTempPath,
        },
      });

      // Unwind the relation's result if only one is expected
      if (ast.type === 'model') {
        acc.push({
          $unwind: {
            path: `$${asTempPath}`,
            preserveNullAndEmptyArrays: true,
          },
        });
      }

      // Preserve relation field if it is empty
      acc.push({
        $addFields: {
          [asRealPath]: {
            $ifNull: [`$${asTempPath}`, null],
          },
        },
      });

      // Remove temp field
      acc.push({
        $project: {
          [asTempPath]: 0,
        },
      });

      return acc;
    }, []);

  return result;
};

export const generateMatchStage = (
  strapiModel,
  filters,
  { prefixPath = '' } = {}
) => {
  const result = _.chain(filters)
    .get('relations')
    .reduce((acc, relationFilters, relationName) => {
      const association = strapiModel.associations.find(
        a => a.alias === relationName
      );

      // Ignore association if it's not been found
      if (!association) {
        return acc;
      }

      const model = association.plugin
        ? strapi.plugins[association.plugin].models[
            association.collection || association.model
          ]
        : strapi.models[association.collection || association.model];

      _.forEach(relationFilters, (value, key) => {
        if (key !== 'relations') {
          acc.push({
            $match: { [`${prefixPath}${relationName}.${key}`]: value },
          });
        } else {
          const nextPrefixedPath = `${prefixPath}${relationName}.`;
          acc.push(
            ...generateLookupStage(model, {
              whitelistedPopulate: _.keys(value),
              prefixPath: nextPrefixedPath,
            }),
            ...generateMatchStage(model, relationFilters, {
              prefixPath: nextPrefixedPath,
            })
          );
        }
      });
      return acc;
    }, [])
    .value();

  return result;
};

module.exports = {
  find: async function (filters = {}, populate) {
    // Generate stages.
    const populateStage = generateLookupStage(this, { whitelistedPopulate: populate });
    const matchStage = generateMatchStage(this, filters);

    const result = this.aggregate([
      {
        $match: filters.where || {}, // Direct relation filter
      },
      ...populateStage, // Nested-Population
      ...matchStage, // Nested relation filter
    ]);

    if (_.has(filters, 'start')) result.skip(filters.start);
    if (_.has(filters, 'limit')) result.limit(filters.limit);
    if (_.has(filters, 'sort')) result.sort(filters.sort);

    return result;
  },

  count: async function (params = {}) {
    return Number(await this
      .count(params));
  },

  findOne: async function (params, populate) {
    const primaryKey = params[this.primaryKey] || params.id;

    if (primaryKey) {
      params = {
        [this.primaryKey]: primaryKey
      };
    }

    return this
      .findOne(params)
      .populate(populate || this.associations.map(x => x.alias).join(' '))
      .lean();
  },

  create: async function (params) {
    return this.create(Object.keys(params).reduce((acc, current) => {
      if (_.get(this._attributes, [current, 'type']) || _.get(this._attributes, [current, 'model'])) {
        acc[current] = params[current];
      }

      return acc;
    }, {}))
      .catch((err) => {
        if (err.message.indexOf('index:') !== -1) {
          const message = err.message.split('index:');
          const field = _.words(_.last(message).split('_')[0]);
          const error = { message: `This ${field} is already taken`, field };

          throw error;
        }

        throw err;
      });
  },

  update: async function (search, params = {}) {
    if (_.isEmpty(params)) {
      params = search;
    }

    const primaryKey = search[this.primaryKey] || search.id;

    if (primaryKey) {
      search = {
        [this.primaryKey]: primaryKey
      };
    }

    return this.update(search, params, {
      strict: false
    })
      .catch((error) => {
        const field = _.last(_.words(error.message.split('_')[0]));
        const err = { message: `This ${field} is already taken`, field };

        throw err;
      });
  },

  delete: async function (params) {
    // Delete entry.
    return this
      .remove({
        [this.primaryKey]: params[this.primaryKey] || params.id
      });
  },

  deleteMany: async function (params) {
    // Delete entry.
    return this
      .remove({
        [this.primaryKey]: {
          $in: params[this.primaryKey] || params.id
        }
      });
  },

  search: async function (params) {
    const re = new RegExp(params.id);

    return this
      .find({
        '$or': [
          { username: re },
          { email: re }
        ]
      });
  },

  addPermission: async function (params) {
    return this
      .create(params);
  },

  removePermission: async function (params) {
    return this
      .remove(params);
  }
};
