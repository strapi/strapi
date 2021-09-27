'use strict';

const { uniq, difference, get, isUndefined, merge } = require('lodash');

const requiredMiddlewares = [
  'auth',
  'responses',
  'router',
  'logger',
  'error',
  'cors',
  'cron',
  'xframe',
  'xss',
  'public',
  'favicon',
];

module.exports = async function(strapi) {
  /** Utils */
  const middlewareConfig = strapi.config.middleware;

  // check if a middleware exists
  const middlewareExists = key => {
    return !isUndefined(strapi.middleware[key]);
  };

  // check if a middleware is enabled
  const middlewareEnabled = key => {
    return (
      requiredMiddlewares.includes(key) ||
      get(middlewareConfig, ['settings', key, 'enabled'], false) === true
    );
  };

  // list of enabled middlewares
  const enabledMiddlewares = Object.keys(strapi.middleware).filter(middlewareEnabled);

  // Method to initialize middlewares and emit an event.
  const initialize = middlewareKey => {
    if (strapi.middleware[middlewareKey].loaded === true) return;

    const module = strapi.middleware[middlewareKey].load;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(`(middleware: ${middlewareKey}) is taking too long to load.`),
        middlewareConfig.timeout || 1000
      );
      strapi.middleware[middlewareKey] = merge(strapi.middleware[middlewareKey], module);

      Promise.resolve()
        .then(() => module.initialize(strapi))
        .then(() => {
          clearTimeout(timeout);
          strapi.middleware[middlewareKey].loaded = true;
          resolve();
        })
        .catch(err => {
          clearTimeout(timeout);

          if (err) {
            return reject(err);
          }
        });
    });
  };

  /**
   * Run init functions
   */

  // Run beforeInitialize of every middleware
  await Promise.all(
    enabledMiddlewares.map(key => {
      const { beforeInitialize } = strapi.middleware[key].load;
      if (typeof beforeInitialize === 'function') {
        return beforeInitialize(strapi);
      }
    })
  );

  // run the initialization of an array of middlewares sequentially
  const initMiddlewaresSeq = async middlewareArr => {
    for (let key of uniq(middlewareArr)) {
      await initialize(key);
    }
  };

  const middlewaresBefore = get(middlewareConfig, 'load.before', [])
    .filter(middlewareExists)
    .filter(middlewareEnabled);

  const middlewaresAfter = get(middlewareConfig, 'load.after', [])
    .filter(middlewareExists)
    .filter(middlewareEnabled);

  const middlewaresOrder = get(middlewareConfig, 'load.order', [])
    .filter(middlewareExists)
    .filter(middlewareEnabled);

  const unspecifiedMiddlewares = difference(
    enabledMiddlewares,
    middlewaresBefore,
    middlewaresOrder,
    middlewaresAfter
  );

  // before
  await initMiddlewaresSeq(middlewaresBefore);

  // ordered // rest of middlewares
  await Promise.all([
    initMiddlewaresSeq(middlewaresOrder),
    Promise.all(unspecifiedMiddlewares.map(initialize)),
  ]);

  // after
  await initMiddlewaresSeq(middlewaresAfter);
};
