'use strict';

module.exports = (date = new Date()) => {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .split('.')[0]
    .replace(/[-T:]/g, '_');
};
