'use strict';

const _ = require('lodash');

/**
 * Convert zero length string on default attributes to undefined
 */
module.exports = data => {
  if (_.has(data, 'attributes')) {
    Object.keys(data.attributes).forEach(attribute => {
      if (data.attributes[attribute].default === '') {
        data.attributes[attribute].default = undefined;
      }
    });
  }

  if (_.has(data, 'components') && Array.isArray(data.components)) {
    data.components.forEach(data => {
      if (_.has(data, 'attributes') && _.has(data, 'uid')) {
        Object.keys(data.attributes).forEach(attribute => {
          if (data.attributes[attribute].default === '') {
            data.attributes[attribute].default = undefined;
          }
        });
      }
    });
  }

  return data;
};
