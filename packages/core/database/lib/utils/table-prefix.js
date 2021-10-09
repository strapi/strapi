'use strict';

const _ = require('lodash/fp');
const debug = require('debug')('strapi::database');

const TABLE_PREFIX_MAX_LENGTH = 10;

const createTablePrefix = prefix => {
  const pattern = `^([a-zA-Z0-9]|_){1,${TABLE_PREFIX_MAX_LENGTH}}$`;
  const re = new RegExp(pattern);

  if (typeof prefix === 'string' && re.test(prefix)) {
    prefix = _.snakeCase(prefix);
    if (!prefix.endsWith('_')) {
      prefix += '_';
    }
    debug(`Using table prefix: ${prefix}`);
    return prefix;
  }
  return '';
};

module.exports = { createTablePrefix };
