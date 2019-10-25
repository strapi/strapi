'use strict';

const _ = require('lodash');

module.exports = async (entry, files, { model, source }) => {
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

      if (attr.type === 'component') {
        modelName = attr.component;
        tmpModel = strapi.components[attr.component];
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
};
