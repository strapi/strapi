'use strict';

const _ = require('lodash');

/**
 * A set of functions called "actions" for `ContentManager`
 */
module.exports = {
  fetch(params, source, populate) {
    return strapi
      .query(params.model, source)
      .findOne({ id: params.id }, populate);
  },

  fetchAll(params, query) {
    const { query: request, source, populate = [], ...filters } = query;

    const queryFilter = !_.isEmpty(request)
      ? {
          ...filters, // Filters is an object containing the limit/sort and start
          ...request,
        }
      : filters;

    // Find entries using `queries` system
    return strapi.query(params.model, source).find(queryFilter, populate);
  },

  count(params, query) {
    const { source, ...filters } = query;
    return strapi.query(params.model, source).count(filters);
  },

  async createMultipart(data, { files = {}, model, source } = {}) {
    const entry = await strapi.query(model, source).create(data);

    await uploadFiles(entry, files, { model, source });

    return strapi.query(model, source).findOne({ id: entry.id });
  },

  add(params, values, source) {
    return strapi.query(params.model, source).create(values);
  },

  async editMultipart(params, data, { files = {}, model, source } = {}) {
    const entry = await strapi
      .query(model, source)
      .update({ id: params.id }, data);

    await uploadFiles(entry, files, { model, source });

    return strapi.query(model, source).findOne({ id: entry.id });
  },

  edit(params, values, source) {
    return strapi.query(params.model, source).update({ id: params.id }, values);
  },

  delete(params, { source }) {
    return strapi.query(params.model, source).delete({ id: params.id });
  },

  deleteMany(params, query) {
    const { source } = query;
    const { model } = params;

    const toRemove = Object.values(_.omit(query, 'source'));
    const { primaryKey } = strapi.query(model, source);
    const filter = { [`${primaryKey}_in`]: toRemove, _limit: 100 };

    return strapi.query(model, source).delete(filter);
  },

  search(params, query) {
    const { model } = params;
    const { source } = query;

    return strapi.query(model, source).search(query);
  },

  countSearch(params, query) {
    const { model } = params;
    const { source, _q } = query;
    return strapi.query(model, source).countSearch({ _q });
  },
};

async function uploadFiles(entry, files, { model, source }) {
  const entity = strapi.getModel(model, source);

  if (!_.has(strapi.plugins, 'upload')) return entry;

  const uploadService = strapi.plugins.upload.services.upload;

  const findModelFromUploadPath = path => {
    if (path.length === 0) return { model, source };

    // exclude array indexes from path
    const parts = path.filter(p => !_.isFinite(_.toNumber(p)));

    let tmpModel = entity;
    let modelName = model;
    let sourceName;
    for (let part of parts) {
      if (!tmpModel) return {};
      const attr = tmpModel.attributes[part];

      if (!attr) return {};

      if (attr.type === 'group') {
        modelName = attr.group;
        tmpModel = strapi.groups[attr.group];
      } else if (_.has(attr, 'model') || _.has(attr, 'collection')) {
        sourceName = attr.plugin;
        modelName = attr.model || attr.collection;
        tmpModel = strapi.getModel(attr.model || attr.collection, source);
      } else {
        return {};
      }
    }

    return { model: modelName, source: sourceName };
  };

  const doUpload = async (key, files) => {
    const parts = key.split('.');
    const [path, field] = [_.initial(parts), _.last(parts)];

    const { model, source } = findModelFromUploadPath(path);

    if (model) {
      return uploadService.uploadToEntity(
        { id: _.get(entry, path.concat('id')), model: model },
        { [field]: files },
        source
      );
    }
  };

  await Promise.all(Object.keys(files).map(key => doUpload(key, files[key])));
}
