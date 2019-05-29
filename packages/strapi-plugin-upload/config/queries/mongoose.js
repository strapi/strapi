const _ = require('lodash');
const { convertRestQueryParams, buildQuery } = require('strapi-utils');

module.exports = ({ model }) => ({
  find(params, populate) {
    const filters = convertRestQueryParams(params);

    return buildQuery({
      model,
      filters,
      populate: populate || model.associations.map(x => x.alias),
    }).lean();
  },

  count(params) {
    const filters = convertRestQueryParams(params);

    return buildQuery({
      model,
      filters: { where: filters.where },
    }).count();
  },

  findOne(params, populate) {
    const primaryKey = params[model.primaryKey] || params.id;

    if (primaryKey) {
      params = {
        [model.primaryKey]: primaryKey,
      };
    }

    return model
      .findOne(params)
      .populate(populate || model.associations.map(x => x.alias).join(' '))
      .lean();
  },

  create(params) {
    // Exclude relationships.
    const values = Object.keys(params).reduce((acc, current) => {
      if (
        _.get(model._attributes, [current, 'type']) ||
        _.get(model._attributes, [current, 'model'])
      ) {
        acc[current] = params[current];
      }

      return acc;
    }, {});

    return model.create(values).catch(err => {
      if (err.message.indexOf('index:') !== -1) {
        const message = err.message.split('index:');
        const field = _.words(_.last(message).split('_')[0]);
        const error = { message: `This ${field} is already taken`, field };

        throw error;
      }

      throw err;
    });
  },

  update(search, params = {}) {
    if (_.isEmpty(params)) {
      params = search;
    }

    const primaryKey = search[model.primaryKey] || search.id;

    if (primaryKey) {
      search = {
        [model.primaryKey]: primaryKey,
      };
    }

    return model
      .updateOne(search, params, {
        strict: false,
      })
      .catch(error => {
        const field = _.last(_.words(error.message.split('_')[0]));
        const err = { message: `This ${field} is already taken`, field };

        throw err;
      });
  },

  delete(params) {
    // Delete entry.
    return model.remove({
      [model.primaryKey]: params[model.primaryKey] || params.id,
    });
  },

  search(params) {
    const re = new RegExp(params.id, 'i');

    return model.find({
      $or: [{ hash: re }, { name: re }],
    });
  },
});
