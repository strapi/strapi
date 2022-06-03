'use strict';

const _ = require('lodash');

const pascalCase = string => {
  return _.upperFirst(_.camelCase(string));
};

module.exports = pascalCase;
