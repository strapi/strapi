'use strict';

const {
  after,
  includes,
  indexOf,
  drop,
  dropRight,
  uniq,
  defaultsDeep,
  get,
  set,
  merge,
  isUndefined,
} = require('lodash');

/* eslint-disable prefer-template */
module.exports = async function() {
  // Method to initialize hooks and emit an event.
  const initialize = (module, hook) => (resolve, reject) => {
    let timeout = true;

    setTimeout(() => {
      if (timeout) {
        reject(`(hook:${hook}) takes too long to load`);
      }
    }, this.config.hook.timeout || 1000);

    const loadedModule = module(this);

    const onFinish = err => {
      timeout = false;

      if (err) {
        this.emit('hook:' + hook + ':error');

        return reject(err);
      }

      this.hook[hook].loaded = true;

      this.hook[hook] = merge(this.hook[hook], loadedModule);

      this.emit('hook:' + hook + ':loaded');
      // Remove listeners.
      this.removeAllListeners('hook:' + hook + ':loaded');

      resolve();
    };

    try {
      loadedModule.initialize.call(module, onFinish);
    } catch (err) {
      reject(err);
    }
  };

  await Promise.all(
    Object.keys(this.hook).map(async hook => {
      if (this.config.hook.settings[hook].enabled === false) {
        return;
      }

      const module = this.hook[hook].load;

      if (module(this).beforeInitialize) {
        await module(this).beforeInitialize.call(module);
      }
    })
  );

  return Promise.all(
    Object.keys(this.hook).map(
      hook =>
        new Promise((resolve, reject) => {
          // Don't load disabled hook.
          if (this.config.hook.settings[hook].enabled === false) {
            return resolve();
          }

          const module = this.hook[hook].load;

          const hooks = Object.keys(this.hook).filter(
            hook => this.config.hook.settings[hook].enabled !== false
          );
          const hooksBefore = get(this.config.hook, 'load.before', [])
            .filter(hook => !isUndefined(this.hook[hook]))
            .filter(hook => this.config.hook.settings[hook].enabled !== false);
          const hooksOrder = get(this.config.hook, 'load.order', [])
            .filter(hook => !isUndefined(this.hook[hook]))
            .filter(hook => this.config.hook.settings[hook].enabled !== false);
          const hooksAfter = get(this.config.hook, 'load.after', [])
            .filter(hook => !isUndefined(this.hook[hook]))
            .filter(hook => this.config.hook.settings[hook].enabled !== false);

          // Apply default configurations to middleware.
          if (isUndefined(get(this.config.hook, `settings.${hook}`))) {
            set(this.config.hook, `settings.${hook}`, {});
          }

          if (module(this).defaults && this.config.hook.settings[hook] !== false) {
            defaultsDeep(
              this.config.hook.settings[hook],
              module(this).defaults[hook] || module(this).defaults
            );
          }

          // Initialize array.
          let previousDependencies = this.hook[hook].dependencies || [];

          // Add BEFORE middlewares to load and remove the current one
          // to avoid that it waits itself.
          if (includes(hooksBefore, hook)) {
            const position = indexOf(hooksBefore, hook);

            previousDependencies = previousDependencies.concat(
              dropRight(hooksBefore, hooksBefore.length - position)
            );
          } else {
            previousDependencies = previousDependencies.concat(hooksBefore.filter(x => x !== hook));

            // Add ORDER dependencies to load and remove the current one
            // to avoid that it waits itself.
            if (includes(hooksOrder, hook)) {
              const position = indexOf(hooksOrder, hook);

              previousDependencies = previousDependencies.concat(
                dropRight(hooksOrder, hooksOrder.length - position)
              );
            } else {
              // Add AFTER hooks to load and remove the current one
              // to avoid that it waits itself.
              if (includes(hooksAfter, hook)) {
                const position = indexOf(hooksAfter, hook);
                const toLoadAfter = drop(hooksAfter, position);

                // Wait for every hooks.
                previousDependencies = previousDependencies.concat(hooks);
                // Exclude hooks which need to be loaded after this one.
                previousDependencies = previousDependencies.filter(x => !includes(toLoadAfter, x));
              }
            }
          }

          // Remove duplicates.
          previousDependencies = uniq(previousDependencies);

          if (previousDependencies.length === 0) {
            initialize(module, hook)(resolve, reject);
          } else {
            // Wait until the dependencies have been loaded.
            const queue = after(previousDependencies.length, () => {
              initialize(module, hook)(resolve, reject);
            });

            previousDependencies.forEach(dependency => {
              // Some hooks are already loaded, we won't receive
              // any events of them, so we have to bypass the emitter.
              if (this.hook[dependency].loaded === true) {
                return queue();
              }

              this.once('hook:' + dependency + ':loaded', () => {
                queue();
              });
            });
          }
        })
    )
  );
};
