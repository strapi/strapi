'use strict';

const glob = require('glob');
const path = require('path');
const { after, includes, indexOf, dropRight, uniq } = require('lodash');

module.exports = function() {
  // Method to initialize hooks and emit an event.
  const initialize = (module, hook) => (resolve, reject) => {
    if (typeof module === 'function') {
      module(this).initialize.call(module, err => {
        if (err) {
          this.emit('hook:' + hook + ':error');

          return reject(err);
        }

        this.hooks[hook].loaded = true;
        this.emit('hook:' + hook + ':loaded');

        // console.log('Hook ', hook, Date.now() - global.startedAt, 'ms');

        resolve();
      });
    } else {
      resolve();
    }
  };

  return Promise.all(
    Object.keys(this.hooks).map(
      hook =>
        new Promise((resolve, reject) => {
          // Don't load disabled hook.
          if (this.config.hooks.settings[hook] === false) {
            return resolve();
          }

          const module = this.hooks[hook].load;
          let dependencies =  this.hooks[hook].dependencies || [];

          // Take care of hooks internals dependencies.
          if (dependencies.length > 0 || includes(this.config.hooks.order, hook)) {
            const position = indexOf(this.config.hooks.order, hook);
            const previousDependencies = dropRight(this.config.hooks.order, this.config.hooks.order.length - (position + 1));

            // Remove current hook.
            previousDependencies.splice(position, 1);

            if (previousDependencies.length > 0) {
              dependencies = uniq(dependencies.concat(previousDependencies));
            }

            if (dependencies.length === 0) {
              initialize(module, hook)(resolve, reject);
            } else {
              // Wait until the dependencies have been loaded.
              const queue = after(dependencies.length, () => {
                initialize(module, hook)(resolve, reject)
              });

              dependencies.forEach(dependency => {
                this.once('hook:' + dependency.replace('strapi-', '') + ':loaded', () => {
                  queue();
                })
              });
            }
          } else {
            initialize(module, hook)(resolve, reject);
          }
        })
    )
  );
};
