'use strict';

const _ = require('lodash');

const removeEmptyDefaults = (data) => {
  if (_.has(data, 'attributes')) {
    Object.keys(data.attributes).forEach((attribute) => {
      if (data.attributes[attribute].default === '') {
        data.attributes[attribute].default = undefined;
      }
    });
  }
};

const removeDeletedUIDTargetFields = (data) => {
  if (_.has(data, 'attributes')) {
    Object.values(data.attributes).forEach((attribute) => {
      if (
        attribute.type === 'uid' &&
        !_.isUndefined(attribute.targetField) &&
        !_.has(data.attributes, attribute.targetField)
      ) {
        attribute.targetField = undefined;
      }
    });
  }
};

module.exports = {
  removeDeletedUIDTargetFields,
  removeEmptyDefaults,
};
