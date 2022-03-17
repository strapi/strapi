'use strict';
const _ = require('lodash');

const pascalCase = string => {
  return _.startCase(_.camelCase(string)).replace(/ /g, '');
};

module.exports = pascalCase;
