'use strict';

/**
 * `Strapi.prototype.stop()`
 *
 * The inverse of `start()`, this method
 * shuts down all attached servers.
 *
 * It also unbinds listeners and terminates child processes.
 *
 * @api public
 */

module.exports = function stop() {

  // Flag `this._exiting` as soon as the application has begun to shutdown.
  // This may be used by hooks and other parts of core.
  this._exiting = true;

  // Exit the REPL.
  process.exit(0);

  // Emit a `stop` event.
  this.emit('stop');
};
