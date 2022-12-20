'use strict';

const { chunk } = require('lodash/fp');

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
 * @type { import('./async').mapAsync }
 */
function mapAsync(promiseArray, { concurrency = Infinity } = {}) {
  const appliedConcurrency = concurrency > promiseArray.length ? promiseArray.length : concurrency;
  const promiseArrayChunks = chunk(appliedConcurrency)(promiseArray);

  return async (callback) => {
    return promiseArrayChunks.reduce(async (prevChunksPromise, chunk, chunkIndex) => {
      // Need to await previous promise in order to respect the concurrency option
      const prevChunks = await prevChunksPromise;
      // As chunks can contain promises, we need to await the chunk
      const awaitedChunk = await Promise.all(chunk);
      const transformedPromiseChunk = await Promise.all(
        // Calculating the index based on the original array, we do not want to have the index of the element inside the chunk
        awaitedChunk.map((value, index) => callback(value, chunkIndex * appliedConcurrency + index))
      );

      return prevChunks.concat(transformedPromiseChunk);
    }, Promise.resolve([]));
  };
}

/**
 * @type { import('./async').reduceAsync }
 */
function reduceAsync(promiseArray) {
  return (callback, initialValue) =>
    promiseArray.reduce(async (previousPromise, currentValue, index) => {
      const previousValue = await previousPromise;
      return callback(previousValue, await currentValue, index);
    }, Promise.resolve(initialValue));
}

module.exports = {
  mapAsync,
  reduceAsync,
  pipeAsync,
};
