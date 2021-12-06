'use strict';

const parseBoolean = value => {
  if (typeof value === 'boolean') return value;

  if (['true', 't', '1', 1].includes(value)) {
    return true;
  }

  if (['false', 'f', '0', 0].includes(value)) {
    return false;
  }

  return Boolean(value);
};

module.exports = {
  parseBoolean,
};
