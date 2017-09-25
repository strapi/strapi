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

        this.hook[hook].loaded = true;
        this.emit('hook:' + hook + ':loaded');
        // Remove listeners.
        this.removeAllListeners('hook:' + hook + ':loaded');

        resolve();
      });
    } else {
      resolve();
    }
  };

  return Promise.all(
    Object.keys(this.hook).map(
      hook =>
        new Promise((resolve, reject) => {
          // Don't load disabled hook.
          if (this.config.hook.settings[hook].enabled === false) {
            return resolve();
          }

          const module = this.hook[hook].load;
          let dependencies =  this.hook[hook].dependencies.map(x => x.replace('strapi-', '')) || [];

          // Apply default configurations to middleware.
          if (isUndefined(get(this.config.hook, `settings.${hook}`))) {
            set(this.config.hook, `settings.${hook}`, {});
          }

          if (module(this).defaults && this.config.hook.settings[hook] !== false) {
            defaultsDeep(this.config.hook.settings[hook], module(this).defaults[hook] || module(this).defaults);
          }

          // Take care of hooks internals dependencies.
          if (dependencies.length > 0 || includes(get(this.config.hook, 'load.order', []), hook)) {
            const position = indexOf(get(this.config.hook, 'load.order', []), hook);
            const previousDependencies = dropRight(get(this.config.hook, 'load.order', []), get(this.config.hook, 'load.order', []).length - (position + 1));

            // Remove current hook.
            previousDependencies.splice(position, 1);

            if (previousDependencies.length > 0) {
              dependencies = uniq(dependencies.concat(previousDependencies));
            }

            dependencies = dependencies.filter(x => includes(Object.keys(this.hook), x) === true);

            if (dependencies.length === 0) {
              initialize(module, hook)(resolve, reject);
            } else {
              // Wait until the dependencies have been loaded.
              const queue = after(dependencies.length, () => {
                initialize(module, hook)(resolve, reject);
              });

              dependencies.forEach(dependency => {
                const name = dependency.replace('strapi-', '');

                // Some hooks are already loaded, we won't receive
                // any events of them, so we have to bypass the emitter.
                if (this.hook[name].loaded === true) {
                  return queue();
                }

                this.once('hook:' + name + ':loaded', () => {
                  queue();
                });
              });
            }
          } else {
            initialize(module, hook)(resolve, reject);
          }
        })
    )
  );
};
