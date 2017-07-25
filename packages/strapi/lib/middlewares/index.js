'use strict';

const glob = require('glob');
const path = require('path');
const { parallel } = require('async');
const { after, includes, indexOf, dropRight, uniq, defaultsDeep, get, set, isEmpty, isUndefined } = require('lodash');

module.exports = function() {
  // Method to initialize middlewares and emit an event.
  const initialize = (module, middleware) => (resolve, reject) => {
    let timeout = true;

    setTimeout(() => {
      if (timeout) {
        reject(`The middleware ${middleware} takes too long to load!`);
      }
    }, this.config.middlewares.timeout || 1000);

    module.initialize.call(module, err => {
      timeout = false;

      if (err) {
        this.emit('middleware:' + middleware + ':error');

        return reject(err);
      }

      this.middlewares[middleware].loaded = true;
      this.emit('middleware:' + middleware + ':loaded');

      resolve();
    });
  };

  return Promise.all(
    Object.keys(this.middlewares).map(
      middleware =>
        new Promise((resolve, reject) => {
          // Don't load disabled middleware.
          if (this.config.middlewares.settings[middleware] === false) {
            return resolve();
          }

          const module = this.middlewares[middleware].load;
          const middlewaresOrder = get(this.config.middlewares, 'loadOrder', []).filter(middleware => this.config.middlewares.settings[middleware] !== false);

          // Apply default configurations to middleware.
          if (isUndefined(get(this.config.middlewares, `settings.${middleware}`))) {
            set(this.config.middlewares, `settings.${middleware}`, {});
          }

          if (module.defaults && this.config.middlewares.settings[middleware] !== false) {
            defaultsDeep(this.config.middlewares.settings[middleware], module.defaults[middleware] || module.defaults);
          }

          if (includes(middlewaresOrder, middleware)) {
            const position = indexOf(middlewaresOrder, middleware);
            const previousDependencies = dropRight(middlewaresOrder, middlewaresOrder.length - (position + 1));

            // Remove current middleware.
            previousDependencies.splice(position, 1);

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
                if (this.middlewares[dependency].loaded === true) {
                  return queue();
                }

                this.once('middleware:' + dependency + ':loaded', () => {
                  queue();
                })
              });
            }
          } else {
            initialize(module, middleware)(resolve, reject);
          }
        })
    )
  );
};
