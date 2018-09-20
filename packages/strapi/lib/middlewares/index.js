'use strict';

const { after, includes, indexOf, drop, dropRight, uniq, defaultsDeep, get, set, isUndefined, merge } = require('lodash');

/* eslint-disable prefer-template */
module.exports = async function() {
  // Set if is admin destination for middleware application.
  this.app.use(async (ctx, next) => {
    if (ctx.request.header['origin'] === 'http://localhost:4000') {
      ctx.request.header['x-forwarded-host'] = 'strapi';
    }

    ctx.request.admin = ctx.request.header['x-forwarded-host'] === 'strapi';

    await next();
  });

  // Method to initialize middlewares and emit an event.
  const initialize = (module, middleware) => (resolve, reject) => {
    let timeout = true;

    setTimeout(() => {
      if (timeout) {
        reject(`(middleware: ${middleware}) takes too long to load`);
      }
    }, this.config.middleware.timeout || 1000);

    this.middleware[middleware] = merge(this.middleware[middleware], module);

    module.initialize.call(module, err => {
      timeout = false;

      if (err) {
        this.emit('middleware:' + middleware + ':error');

        return reject(err);
      }

      this.middleware[middleware].loaded = true;
      console.log('middleware:' + middleware + ':loaded');
      this.emit('middleware:' + middleware + ':loaded');
      // Remove listeners.
      this.removeAllListeners('middleware:' + middleware + ':loaded');

      resolve();
    });
  };

  await Promise.all(
    Object.keys(this.middleware).map(
      middleware =>
        new Promise((resolve) => {
          if (this.config.middleware.settings[middleware].enabled === false) {
            return resolve();
          }

          const module = this.middleware[middleware].load;

          if (module.beforeInitialize) {
            module.beforeInitialize.call(module);
          }

          resolve();
        })
    )
  );

  return Promise.all(
    Object.keys(this.middleware).map(
      middleware =>
        new Promise((resolve, reject) => {
          // Don't load disabled middleware.
          if (this.config.middleware.settings[middleware].enabled === false) {
            return resolve();
          }

          const module = this.middleware[middleware].load;

          // Retrieve middlewares configurations order
          const middlewares = Object.keys(this.middleware).filter(middleware => this.config.middleware.settings[middleware].enabled !== false);
          const middlewaresBefore = get(this.config.middleware, 'load.before', []).filter(middleware => !isUndefined(this.middleware[middleware])).filter(middleware => this.config.middleware.settings[middleware].enabled !== false);
          const middlewaresOrder = get(this.config.middleware, 'load.order', []).filter(middleware => !isUndefined(this.middleware[middleware])).filter(middleware => this.config.middleware.settings[middleware].enabled !== false);
          const middlewaresAfter = get(this.config.middleware, 'load.after', []).filter(middleware => !isUndefined(this.middleware[middleware])).filter(middleware => this.config.middleware.settings[middleware].enabled !== false);

          // Apply default configurations to middleware.
          if (isUndefined(get(this.config.middleware, `settings.${middleware}`))) {
            set(this.config.middleware, `settings.${middleware}`, {});
          }

          if (module.defaults && this.config.middleware.settings[middleware] !== false) {
            defaultsDeep(this.config.middleware.settings[middleware], module.defaults[middleware] || module.defaults);
          }

          // Initialize array.
          let previousDependencies = [];

          // Add BEFORE middlewares to load and remove the current one
          // to avoid that it waits itself.
          if (includes(middlewaresBefore, middleware)) {
            const position = indexOf(middlewaresBefore, middleware);

            previousDependencies = previousDependencies.concat(dropRight(middlewaresBefore, middlewaresBefore.length - position));
          } else {
            previousDependencies = previousDependencies.concat(middlewaresBefore.filter(x => x !== middleware));

            // Add ORDER dependencies to load and remove the current one
            // to avoid that it waits itself.
            if (includes(middlewaresOrder, middleware)) {
              const position = indexOf(middlewaresOrder, middleware);

              previousDependencies = previousDependencies.concat(dropRight(middlewaresOrder, middlewaresOrder.length - position));
            } else {
              // Add AFTER middlewares to load and remove the current one
              // to avoid that it waits itself.
              if (includes(middlewaresAfter, middleware)) {
                const position = indexOf(middlewaresAfter, middleware);
                const toLoadAfter = drop(middlewaresAfter, position);

                // Wait for every middlewares.
                previousDependencies = previousDependencies.concat(middlewares);
                // Exclude middlewares which need to be loaded after this one.
                previousDependencies = previousDependencies.filter(x => !includes(toLoadAfter, x));
              }
            }
          }

          // Remove duplicates.
          previousDependencies = uniq(previousDependencies);

          if (previousDependencies.length === 0) {
            initialize(module, middleware)(resolve, reject);
          } else {
            // Wait until the dependencies have been loaded.
            const queue = after(previousDependencies.length, () => {
              initialize(module, middleware)(resolve, reject);
            });

            previousDependencies.forEach(dependency => {
              // Some hooks are already loaded, we won't receive
              // any events of them, so we have to bypass the emitter.
              if (this.middleware[dependency].loaded === true) {
                return queue();
              }

              this.once('middleware:' + dependency + ':loaded', () => {
                queue();
              });
            });
          }
        })
    )
  );
};
