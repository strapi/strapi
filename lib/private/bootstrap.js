'use strict';

/**
 * `runBootstrap`
 *
 * @param {Function} cb [description]
 *
 * @api private
 */

module.exports = function runBootstrap(cb) {
  const self = this;

  // Run boostrap script if specified.
  // Otherwise, do nothing and continue.
  if (!self.config.bootstrap) {
    return cb();
  }

  // If bootstrap takes too long, display warning message
  // (just in case user forgot to call their bootstrap's `cb`).
  const timeoutMs = self.config.bootstrapTimeout || 3500;
  const timer = setTimeout(function bootstrapTookTooLong() {
    self.log.warn('Bootstrap is taking unusually long to execute its callback (' + timeoutMs + ' miliseconds).');
    self.log.warn('Perhaps you forgot to call it?');
  }, timeoutMs);

  let ranBootstrapFn = false;

  try {
    return self.config.bootstrap(function bootstrapDone(err) {
      if (ranBootstrapFn) {
        self.log.error('You called the callback in `strapi.config.boostrap` more than once!');
        return;
      }
      ranBootstrapFn = true;
      clearTimeout(timer);
      return cb(err);
    });
  } catch (e) {
    if (ranBootstrapFn) {
      self.log.error('The bootstrap function threw an error after its callback was called.');
      self.log.error(e);
      return;
    }
    ranBootstrapFn = true;
    clearTimeout(timer);
    return cb(e);
  }
};
