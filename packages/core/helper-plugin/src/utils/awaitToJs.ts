/**
 * Async await wrapper for easy error handling
 *
 *
 * @deprecated This function will be removed in the next major release. Use async / await with try / catch instead.
 */
const to = (promise: Promise<unknown>, errorExt?: object) => {
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
