/**
 * The event hub is Strapi's event control center.
 */
'use strict';

const EventEmitter = require('events');

const { pipeAsync, traverseEntity, sanitize } = require('@strapi/utils');

class EventHub extends EventEmitter {
  /**
   * Removes password & private fields from an entity
   * @param {object | object[]} entity
   * @param {object} schema
   * @returns {object}
   */
  sanitizeEntity(entity, schema) {
    if (Array.isArray(entity)) {
      return Promise.all(entity.map(entry => this.sanitizeEntity(entry, schema)));
    }

    const sanitizeFunction = pipeAsync(
      traverseEntity(sanitize.visitors.removePrivate, { schema }),
      traverseEntity(sanitize.visitors.removePassword, { schema })
    );

    return sanitizeFunction(entity);
  }
}

/**
 * Expose a factory function instead of the class
 */
module.exports = function createEventHub(opts) {
  return new EventHub(opts);
};
