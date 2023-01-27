'use strict';

const pMap = require('p-map');
const { curry } = require('lodash/fp');

function pipeAsync(...methods) {
  return async (data) => {
    let res = data;

    for (const method of methods) {
      res = await method(res);
    }

    return res;
  };
}

/**
 * @type { import('./async').MapAsync }
 */
const mapAsync = curry(pMap);

module.exports = {
  mapAsync,
  pipeAsync,
};
