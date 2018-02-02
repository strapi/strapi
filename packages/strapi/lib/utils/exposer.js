'use strict';

const _ = require('lodash');

module.exports = (options) => {
  if (_.isString(options)) {
    options = JSON.parse(options);
  }

  return Object.keys(options).reduce((acc, current) => {
    if (_.isArray(options[current])) {
      acc[current] = _.pick(require(current), options[current]);
    } else if (_.isObject(options[current]) && _.isArray(options[current].value)) {
      acc[current] =  _.pick(require(options[current].name), options[current].value);
    } else if (_.isObject(options[current]) && options[current].value === '') {
      acc[current] = require(options[current].name);
    } else if (options[current] === '') {
      acc[current] = require(current);
    }

    return acc;
  }, {});

};
