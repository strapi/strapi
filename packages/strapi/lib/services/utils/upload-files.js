'use strict';

const _ = require('lodash');

module.exports = async (entry, files, { model, source }) => {
  const entity = strapi.getModel(model, source);

  if (!_.has(strapi.plugins, 'upload')) return entry;

  const uploadService = strapi.plugins.upload.services.upload;

  const findModelFromUploadPath = path => {
    if (path.length === 0) return { model, source };

    let currentPath = [];
    let tmpModel = entity;
    let modelName = model;
    let sourceName;

    for (let i = 0; i < path.length; i++) {
      if (!tmpModel) return {};
      const part = path[i];
      const attr = tmpModel.attributes[part];

      currentPath.push(part);

      // ignore array indexes => handled in the dynamic zone section
      if (_.isFinite(_.toNumber(path[i]))) {
        continue;
      }

      if (!attr) return {};

      if (attr.type === 'component') {
        modelName = attr.component;
        tmpModel = strapi.components[attr.component];
      } else if (attr.type === 'dynamiczone') {
        const entryIdx = path[i + 1]; // get component index
        const value = _.get(entry, [...currentPath, entryIdx]);

        if (!value) return {};

        modelName = value.__component; // get component type
        tmpModel = strapi.components[modelName];
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
      const id = _.get(entry, path.concat('id'));
      return uploadService.uploadToEntity({ id, model, field }, files, source);
    }
  };

  await Promise.all(Object.keys(files).map(key => doUpload(key, files[key])));
};
