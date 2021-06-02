'use strict';

const createHook = () => {
  const _handlers = [];

  return {
    register(fn) {
      _handlers.push(fn);
    },
    delete: handler => {
      _handlers.splice(_handlers.indexOf(handler), 1);
    },
    runWaterfall(args) {
      return _handlers.reduce((acc, fn) => fn(acc), args);
    },
    async runWaterfallAsync(args) {
      let result = args;

      for (const fn of _handlers) {
        result = await fn(result);
      }

      return result;
    },
    runSeries(...args) {
      return _handlers.map(fn => fn(...args));
    },
    async runSeriesAsync(...args) {
      const result = [];

      for (const fn of _handlers) {
        result.push(await fn(...args));
      }

      return result;
    },
    runParallel(...args) {
      return Promise.all(
        _handlers.map(fn => {
          return fn(...args);
        })
      );
    },
  };
};

module.exports = createHook;
