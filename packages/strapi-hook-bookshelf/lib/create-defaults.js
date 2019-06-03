'use strict';

const { typesArray } = require('./types');

/**
 * return a map of default values
 * @param {*} attributes
 */
function createDefaults(attributes) {
  return Object.keys(attributes).reduce((acc, key) => {
    const { type, default: defaultVal } = attributes[key];
    if (typesArray.includes(type) && defaultVal !== undefined) {
      acc[key] = defaultVal;
    }

    return acc;
  }, {});
}

module.exports = createDefaults;
