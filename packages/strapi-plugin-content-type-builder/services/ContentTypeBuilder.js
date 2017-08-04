'use strict';

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

    return {
      name: slug,
      description: _.get(model, 'description', 'model.description.missing'),
      attributes: model.attributes
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
  }
};
