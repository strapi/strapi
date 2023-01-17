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
 * @type { import('./async').reduceAsync }
 */
function reduceAsync(promiseArray) {
  return (iteratee, initialValue) =>
    promiseArray.reduce(async (previousPromise, currentValue, index) => {
      const previousValue = await previousPromise;
      return iteratee(previousValue, await currentValue, index);
    }, Promise.resolve(initialValue));
}

module.exports = {
  mapAsync,
  reduceAsync,
  pipeAsync,
};
