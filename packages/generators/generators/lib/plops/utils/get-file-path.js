'use strict';

module.exports = destination => {
  if (destination === 'api') {
    return `api/{{ api }}`;
  }

  if (destination === 'plugin') {
    return `plugins/{{ plugin }}/server`;
  }

  return `api/{{ id }}`;
};
