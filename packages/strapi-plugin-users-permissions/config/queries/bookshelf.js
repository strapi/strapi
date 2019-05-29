const _ = require('lodash');
const { convertRestQueryParams, buildQuery } = require('strapi-utils');

module.exports = ({ model }) => ({
  find(params, populate) {
    const filters = convertRestQueryParams(params);

    return model
      .query(buildQuery({ model, filters }))
      .fetchAll({
        withRelated: populate || model.associations.map(x => x.alias),
      })
      .then(data => data.toJSON());
  },

  count(params = {}) {
    const { where } = convertRestQueryParams(params);

    return model.query(buildQuery({ model, filters: { where } })).count();
  },

  async findOne(params, populate) {
    const primaryKey = params[model.primaryKey] || params.id;

    if (primaryKey) {
      params = {
        [model.primaryKey]: primaryKey,
      };
    }

    const record = await model.forge(params).fetch({
      withRelated: populate || model.associations.map(x => x.alias),
    });

    return record ? record.toJSON() : record;
  },

  async create(params) {
    return model
      .forge()
      .save(
        Object.keys(params).reduce((acc, current) => {
          if (
            _.get(model._attributes, [current, 'type']) ||
            _.get(model._attributes, [current, 'model'])
          ) {
            acc[current] = params[current];
          }

          return acc;
        }, {})
      )
      .catch(err => {
        if (err.detail) {
          const field = _.last(_.words(err.detail.split('=')[0]));
          err = { message: `This ${field} is already taken`, field };
        }

        throw err;
      });
  },

  async update(search, params = {}) {
    if (_.isEmpty(params)) {
      params = search;
    }

    const primaryKey = search[model.primaryKey] || search.id;

    if (primaryKey) {
      search = {
        [model.primaryKey]: primaryKey,
      };
    } else {
      const entry = await this.findOne(search);

      search = {
        [model.primaryKey]: entry[model.primaryKey] || entry.id,
      };
    }

    return model
      .forge(search)
      .save(params, {
        patch: true,
      })
      .catch(err => {
        const field = _.last(_.words(err.detail.split('=')[0]));
        const error = { message: `This ${field} is already taken`, field };

        throw error;
      });
  },

  delete(params) {
    return model
      .forge({
        [model.primaryKey]: params[model.primaryKey] || params.id,
      })
      .destroy();
  },

  search(params) {
    return model
      .query(function(qb) {
        qb.where('username', 'LIKE', `%${params.id}%`).orWhere(
          'email',
          'LIKE',
          `%${params.id}%`
        );
      })
      .fetchAll();
  },

  addPermission(params) {
    return model.forge(params).save();
  },

  removePermission(params) {
    const value = params[model.primaryKey]
      ? { [model.primaryKey]: params[model.primaryKey] || params.id }
      : params;

    return model
      .forge()
      .where(value)
      .destroy();
  },
});
