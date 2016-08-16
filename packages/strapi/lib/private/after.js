'use strict';

/**
 * Module dependencies
 */

// Public node modules.
const _ = require('lodash');
const async = require('async');

/**
 * Mix-in an `after` function to an `EventEmitter`
 *
 * If `events` have already fired, trigger fn immediately (with no args)
 * Otherwise bind a normal one-time event using `EventEmitter.prototype.once()`.
 * Useful for checking whether or not something has finished loading, etc.
 *
 * @param {EventEmitter} emitter
 */

module.exports = function mixinAfter(emitter) {

  /**
   * `emitter.warmEvents`
   *
   * Events which have occurred at least once
   * (required to support `emitter.after()`).
   */

  emitter.warmEvents = {};

  /**
   * `emitter.emit()`
   *
   * Override `EventEmitter.prototype.emit`.
   * (required to support `emitter.after()`).
   */

  const _emit = _.assign(emitter.emit);

  emitter.emit = evName => {
    emitter.warmEvents[evName] = true;
    _emit.apply(emitter, _.slice(arguments, 0));
  };

  /**
   * `emitter.after()`
   *
   * Fires your handler if the specified event
   * has already been triggered or when it is triggered.
   *
   * @param {String|Array} events Name of the event(s)
   * @param {Function} fn Event handler function
   * @context {Strapi}
   */

  emitter.after = (events, fn) => {

    // Support a single event or an array of events.
    if (!_.isArray(events)) {
      events = [events];
    }

    // Convert named event dependencies into an array
    // of async-compatible functions.
    const dependencies = _.reduce(events, (dependencies, event) => {
      const handlerFn = cb => {
        if (emitter.warmEvents[event]) {
          cb();
        } else {
          emitter.once(event, cb);
        }
      };
      dependencies.push(handlerFn);
      return dependencies;
    }, []);

    // When all events have fired, call `fn`
    // (all arguments passed to `emit()` calls are discarded).
    async.parallel(dependencies, err => {
      if (err) {
        strapi.log.error(err);
      }
      return fn();
    });
  };
};
