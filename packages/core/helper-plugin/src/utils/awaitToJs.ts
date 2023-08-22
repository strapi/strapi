/**
 * Async await wrapper for easy error handling
 *
 * @deprecated
 * @param {Promise<unknown>} promise - Promise or Async Function.
 * @param {object} errorExt - Custom error message extended onto the error from the given promise.
 * @return {Promise<unknown[] | any[]>}
 */
const to = (promise: Promise<unknown>, errorExt: object) => {
  return promise
    .then(function (data) {
      return [null, data];
    })
    .catch(function (err) {
      if (errorExt) {
        Object.assign(err, errorExt);
      }
      return [err, undefined];
    });
};

export { to };
