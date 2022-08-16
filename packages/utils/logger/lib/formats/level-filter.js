'use strict';

const { format } = require('winston');

module.exports = (...levels) => {
  return format((info) => (levels.some((level) => info.level.includes(level)) ? info : false))();
};
