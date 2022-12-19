'use strict';

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
function mapAsync(promiseArray) {
  return (callback) => {
    const transformedPromiseArray = promiseArray.map(async (promiseValue, index) => {
      const value = await promiseValue;
      return callback(value, index);
    });
    return Promise.all(transformedPromiseArray);
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
