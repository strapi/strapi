'use strict';

const pMap = require('p-map');
const { curry, curryN } = require('lodash/fp');

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
 * @type { import('./async').ReduceAsync }
 */
const reduceAsync = curryN(2, async (mixedArray, iteratee, initialValue) => {
  let acc = initialValue;
  for (let i = 0; i < mixedArray.length; i += 1) {
    acc = await iteratee(acc, await mixedArray[i], i);
  }
  return acc;
});

/**
 * @type { import('./async').ForEachAsync }
 */
const forEachAsync = curry(async (array, func, options) => {
  await mapAsync(array, func, options);
});

module.exports = {
  mapAsync,
  reduceAsync,
  forEachAsync,
  pipeAsync,
};
