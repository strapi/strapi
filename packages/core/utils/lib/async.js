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

/**
 * Because of how mysql works, making parallel requests can cause deadlocks.
 * This function will run the requests sequentially if mysql is used. Else,
 * it will encapsulate them in a Promise.all.
 *
 * @type { import('./async').MapAsync }
 */
const mapAsyncDialects = async (array, func) => {
  switch (strapi.db.dialect.client) {
    case 'mysql': {
      return mapAsync(array, func);
    }
    default:
      return Promise.all(array.map(func));
  }
};

module.exports = {
  mapAsync,
  mapAsyncDialects,
  pipeAsync,
};
