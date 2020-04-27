'use strict';

const checkDuplicatedTableNames = require('./check-duplicated-table-names');
const checkReservedNames = require('./check-reserved-names');

const validateModelSchemas = strapi => {
  checkDuplicatedTableNames(strapi);
  checkReservedNames(strapi);
};

module.exports = {
  validateModelSchemas,
};
