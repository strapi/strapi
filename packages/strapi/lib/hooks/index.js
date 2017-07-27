'use strict';

const glob = require('glob');
const path = require('path');
const { after, includes, indexOf, dropRight, uniq, isUndefined, get, defaultsDeep, set } = require('lodash');

module.exports = function() {
  // Method to initialize hooks and emit an event.
  const initialize = (module, hook) => (resolve, reject) => {
    if (typeof module === 'function') {
      let timeout = true;

      setTimeout(() => {
        if (timeout) {
          reject(`(hook:${hook}) takes too long to load`);
        }
      }, this.config.hook.timeout || 1000);

      module(this).initialize.call(module, err => {
        timeout = false;

        if (err) {
          this.emit('hook:' + hook + ':error');

          return reject(err);
        }

        this.hooks[hook].loaded = true;
        this.emit('hook:' + hook + ':loaded');

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
          if (this.config.hook.settings[hook].enabled === false) {
            return resolve();
          }

          const module = this.hooks[hook].load;
          let dependencies =  this.hooks[hook].dependencies || [];

          // Apply default configurations to middleware.
          if (isUndefined(get(this.config.hook, `settings.${hook}`))) {
            set(this.config.hook, `settings.${hook}`, {});
          }

          if (module(this).defaults && this.config.hook.settings[hook] !== false) {
            defaultsDeep(this.config.hook.settings[hook], module(this).defaults[hook] || module(this).defaults);
          }

          // Take care of hooks internals dependencies.
          if (dependencies.length > 0 || includes(this.config.hook.loadOrder, hook)) {
            const position = indexOf(this.config.hook.loadOrder, hook);
            const previousDependencies = dropRight(this.config.hook.loadOrder, this.config.hook.loadOrder.length - (position + 1));

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
                initialize(module, hook)(resolve, reject);
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
