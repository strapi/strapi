'use strict';

const _ = require('lodash');

// Expose standalone available dependency
// through an object.
module.exports = (options) => {
  if (_.isString(options)) {
    options = JSON.parse(options);
  }

  return Object.keys(options).reduce((acc, current) => {
    if (_.isArray(options[current])) {
      acc[current] = _.cloneDeep(_.pick(require(current), options[current]));
    } else if (_.isObject(options[current]) && _.isArray(options[current].value)) {
      acc[current] =  _.cloneDeep(_.pick(require(options[current].name), options[current].value));
    } else if (_.isObject(options[current]) && options[current].value === '') {
      acc[current] = require(options[current].name);
    } else if (options[current] === '' && current !== 'strapi') {
      const clone = _.cloneDeep(require(current));
      acc[current] = _.get(clone, 'default') ? clone.default : clone;
    } else if (options[current] === '' && current === 'strapi') {
      acc[current] = strapi;
    }

    return acc;
  }, {});

};
