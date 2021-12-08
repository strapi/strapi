'use strict';

module.exports = destination => {
  if (destination === 'api') {
    return `api/{{ api }}`;
  }

  if (destination === 'plugin') {
    return `plugins/{{ plugin }}`;
  }

  return `api/{{ id }}`;
};
