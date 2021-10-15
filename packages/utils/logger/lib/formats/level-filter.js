'use strict';

const { format } = require('winston');

/**
 * @param  {...string} levels
 */
module.exports = (...levels) => {
  return format(info => (levels.some(level => info.level.includes(level)) ? info : false))();
};
