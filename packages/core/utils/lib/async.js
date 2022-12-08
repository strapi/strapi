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
 * Map function callback.
 * @callback mapAsyncCallback
 * @param {*} value
 * @param {number} index
 */
/**
 * Async iteration over an array of promises
 * @param {promise<*>[]} promiseArray
 * @returns {function(callback: mapAsyncCallback): promise<*[]>}
 */
function mapAsync(promiseArray) {
  /**
   * @param {mapAsyncCallback} callback
   * @returns promise<*[]>
   */
  return (callback) => {
    const transformedPromiseArray = promiseArray.map(async (promiseValue, index) => {
      const value = await promiseValue;
      return callback(value, index);
    });
    return Promise.all(transformedPromiseArray);
  };
}

/**
 * Reduce function callback.
 * @callback reduceAsyncCallback
 * @param {*} previousValue
 * @param {*} currentValue
 * @param {number} index
 */
/**
 * Async chain over an array of promises
 * @param {promise<*>[]} promiseArray
 * @returns {function(callback: reduceAsyncCallback, initialValue?: *): promise<*>}
 */
function reduceAsync(promiseArray) {
  /**
   * @param {reduceAsyncCallback} callback
   * @param {*} [initialValue]
   * @returns promise<*>
   */
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
