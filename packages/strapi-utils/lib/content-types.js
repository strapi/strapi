'use strict';

const _ = require('lodash');

const getPrivateAttributes = (model = {}) => {
  return _.union(
    strapi.config.get('api.responses.privateAttributes', []),
    _.get(model, 'options.privateAttributes', []),
    _.keys(_.pickBy(model.attributes, attr => !!attr.private))
  );
};

const isPrivateAttribute = (model = {}, attributeName) => {
  return model.privateAttributes.includes(attributeName);
};

module.exports = {
  getPrivateAttributes,
  isPrivateAttribute,
};
