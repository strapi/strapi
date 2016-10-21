'use strict';

/**
 * `runBootstrap`
 *
 * @param {Function} cb [description]
 *
 * @api private
 */

module.exports = function runBootstrap(cb) {
  // Run boostrap script if specified.
  // Otherwise, do nothing and continue.
  if (!this.config.bootstrap) {
    return cb();
  }

  // If bootstrap takes too long, display warning message
  // (just in case user forgot to call their bootstrap's `cb`).
  const timeoutMs = this.config.bootstrapTimeout || 3500;
  const timer = setTimeout(() => {
    this.log.warn('Bootstrap is taking unusually long to execute its callback (' + timeoutMs + ' miliseconds).');
    this.log.warn('Perhaps you forgot to call it?');
  }, timeoutMs);

  let ranBootstrapFn = false;

  try {
    return this.config.bootstrap(err => {
      if (ranBootstrapFn) {
        this.log.error('You called the callback in `strapi.config.boostrap` more than once!');
        return;
      }
      ranBootstrapFn = true;
      clearTimeout(timer);
      return cb(err);
    });
  } catch (e) {
    if (ranBootstrapFn) {
      this.log.error('The bootstrap function threw an error after its callback was called.');
      this.log.error(e);
      return;
    }
    ranBootstrapFn = true;
    clearTimeout(timer);
    return cb(e);
  }
};
