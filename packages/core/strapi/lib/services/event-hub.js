/**
 * The event hub is Strapi's event control center.
 */
'use strict';

const EventEmitter = require('events');

class EventHub extends EventEmitter {}

/**
 * Expose a factory function instead of the class
 */
module.exports = function createEventHub() {
  return new EventHub();
};
