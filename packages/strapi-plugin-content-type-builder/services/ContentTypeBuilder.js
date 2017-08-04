'use strict';

const _ = require('lodash');

module.exports = {
  getModels: () => {
    const models = [];

    _.forEach(strapi.models, (model, name) => {
      models.push({
        icon: 'fa-cube',
        name,
        description: _.get(model, 'description', 'none'),
        fields: _.keys(model.attributes).length
      });
    });

    return models
  }
};
