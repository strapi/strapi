const { isString, isPlainObject } = require('lodash');

const regex = /\$\{[^()]*\}/g;

/**
 * Allow dynamic config values through the native ES6 template string function.
 */
const templateConfiguration = (obj) => {
  // Allow values which looks like such as an ES6 literal string without parenthesis inside (aka function call).
  return Object.keys(obj).reduce((acc, key) => {
    if (isPlainObject(obj[key]) && !isString(obj[key])) {
      acc[key] = templateConfiguration(obj[key]);

    } else if (isString(obj[key]) && obj[key].match(regex) !== null) {
      // eslint-disable-next-line prefer-template
      acc[key] = eval('`' + obj[key] + '`');

    } else {
      acc[key] = obj[key];
    }

    return acc;
  }, {});
};

module.exports = templateConfiguration;
