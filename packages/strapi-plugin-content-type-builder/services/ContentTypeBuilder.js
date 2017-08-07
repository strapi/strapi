'use strict';

const path = require('path')
const fs = require('fs')
const _ = require('lodash');
const generator = require('strapi-generate');

module.exports = {
  getModels: () => {
    const models = [];

    _.forEach(strapi.models, (model, name) => {
      models.push({
        icon: 'fa-cube',
        name,
        description: _.get(model, 'description', 'model.description.missing'),
        fields: _.keys(model.attributes).length
      });
    });

    return models;
  },

  getModel: slug => {
    const model = _.get(strapi.models, slug);

    const attributes = [];
    _.forEach(model.attributes, (params, name) => {
      const relation = _.find(model.associations, { alias: name });

      if (relation) {
        params = {
          target: relation.model || relation.collection,
          key: relation.via,
          nature: relation.nature
        }
      }

      attributes.push({
        name,
        params
      });
    });

    return {
      name: slug,
      description: _.get(model, 'description', 'model.description.missing'),
      attributes: attributes
    };
  },

  generateAPI: (name, attributes) => {
    const scope = {
      generatorType: 'api',
      id: name,
      rootPath: strapi.config.appPath,
      args: {
        api: name,
        attributes
      }
    }

    generator(scope);
  },

  getModelPath: model => {
    let searchFilePath;
    const searchFileName = `${strapi.models[model].globalId}.settings.json`;
    const apiPath = path.join(strapi.config.appPath, 'api');
    const apis = fs.readdirSync(apiPath);

    _.forEach(apis, api => {
      const modelsPath = path.join(apiPath, api, 'models');
      const models = fs.readdirSync(modelsPath);

      if (_.indexOf(models, searchFileName) !== -1) searchFilePath = `${modelsPath}/${searchFileName}`;
    });

    return searchFilePath;
  },

  readModel: path => {
    return JSON.parse(fs.readFileSync(path), 'utf8');
  },

  rewriteModel: (filePath, data) => {
    fs.unlinkSync(filePath);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }
};
