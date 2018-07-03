const _ = require('lodash');

module.exports = {
  find: async function (params = {}) {
    let collectionName = this.collectionName;
    if (this.collectionName.split('_')) {
      collectionName = this.collectionName.split('_')[this.collectionName.split('_').length - 1];
    }

    const populate = this.associations
      .filter(ast => ast.autoPopulate)
      .reduce((acc, ast) => {
        const from = ast.plugin ? `${ast.plugin}_${ast.model}` : ast.collection ? ast.collection : ast.model;
        const as = ast.alias;
        const localField = !ast.dominant ? '_id' : ast.via === collectionName || ast.via === 'related' ? '_id' : ast.alias;
        const foreignField = ast.filter ? `${ast.via}.ref` :
          ast.dominant ?
            (ast.via === collectionName ? ast.via : '_id') :
            (ast.via === collectionName ? '_id' : ast.via);

        acc.push({
          $lookup: {
            from,
            localField,
            foreignField,
            as,
          }
        });

        if (ast.type === 'model') {
          acc.push({
            $unwind: {
              path: `$${ast.alias}`,
              preserveNullAndEmptyArrays: true
            }
          });
        }

        if (params.relations) {
          Object.keys(params.relations).forEach(
            (relationName) => {
              if (ast.alias === relationName) {
                const association = this.associations.find(a => a.alias === relationName);
                if (association) {
                  const relation = params.relations[relationName];

                  Object.keys(relation).forEach(
                    (filter) => {
                      acc.push({
                        $match: { [`${relationName}.${filter}`]: relation[filter] }
                      });
                    }
                  );
                }
              }
            }
          );
        }

        return acc;
      }, []);

    const result = this
      .aggregate([
        {
          $match: params.where ? params.where : {}
        },
        ...populate,
      ]);

    if (params.start) result.skip(params.start);
    if (params.limit) result.limit(params.limit);
    if (params.sort) result.sort(params.sort);

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
