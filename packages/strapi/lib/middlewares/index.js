'use strict';

const glob = require('glob');
const path = require('path');
const { parallel } = require('async');
const { after, includes, indexOf, dropRight, uniq } = require('lodash');

module.exports = function() {
  // Method to initialize middlewares and emit an event.
  const initialize = (module, middleware) => (resolve, reject) => {
    module.initialize.call(module, err => {
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
          const middlewaresOrder = this.config.middlewares.order.filter(middleware => this.config.middlewares.settings[middleware] !== false);

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
