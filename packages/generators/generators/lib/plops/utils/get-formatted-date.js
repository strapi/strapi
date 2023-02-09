'use strict';

module.exports = (date = new Date()) => {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toJSON()
    .replace(/[-:]/g, '.')
    .replace(/\....Z/, '');
};
