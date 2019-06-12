'use strict';

const { uniq, difference, get, isUndefined, merge } = require('lodash');

module.exports = async function() {
  // Set if is admin destination for middleware application.
  this.app.use(async (ctx, next) => {
    if (ctx.request.header['origin'] === 'http://localhost:4000') {
      ctx.request.header['x-forwarded-host'] = 'strapi';
    }

    ctx.request.admin = ctx.request.header['x-forwarded-host'] === 'strapi';

    await next();
  });

  /** Utils */

  const middlewareConfig = this.config.middleware;

  // check if a middleware exists
  const middlewareExists = key => {
    return !isUndefined(this.middleware[key]);
  };

  // check if a middleware is enabled
  const middlewareEnabled = key =>
    get(middlewareConfig, ['settings', key, 'enabled'], false) === true;

  // list of enabled middlewares
  const enabledMiddlewares = Object.keys(this.middleware).filter(
    middlewareEnabled
  );

  // Method to initialize middlewares and emit an event.
  const initialize = middlewareKey => {
    const module = this.middleware[middlewareKey].load;

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(
        () =>
          reject(`(middleware: ${middlewareKey}) is taking too long to load.`),
        middlewareConfig.timeout || 1000
      );

      this.middleware[middlewareKey] = merge(
        this.middleware[middlewareKey],
        module
      );

      Promise.resolve()
        .then(() => module.initialize())
        .then(() => {
          clearTimeout(timeout);
          this.middleware[middlewareKey].loaded = true;
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
      const { beforeInitialize } = this.middleware[key].load;
      if (typeof beforeInitialize === 'function') {
        return beforeInitialize();
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
