'use strict';

const _ = require('lodash');

/**
 * @typedef {import(".").Subscriber } Subscriber
 * @typedef { import("../").Event } Event
 */

// NOTE: we could add onCreate & onUpdate on field level to do this instead

/**
 * @type {Subscriber}
 */
const timestampsLifecyclesSubscriber = {
  /**
   * Init createdAt & updatedAt before create
   * @param {Event} event
   */
  beforeCreate(event) {
    const { data } = event.params;

    const now = new Date();
    _.defaults(data, { createdAt: now, updatedAt: now });
  },

  /**
   * Init createdAt & updatedAt before create
   * @param {Event} event
   */
  beforeCreateMany(event) {
    const { data } = event.params;

    const now = new Date();
    if (_.isArray(data)) {
      data.forEach((data) => _.defaults(data, { createdAt: now, updatedAt: now }));
    }
  },

  /**
   * Update updatedAt before update
   * @param {Event} event
   */
  beforeUpdate(event) {
    const { data } = event.params;

    const now = new Date();
    _.assign(data, { updatedAt: now });
  },

  /**
   * Update updatedAt before update
   * @param {Event} event
   */
  beforeUpdateMany(event) {
    const { data } = event.params;

    const now = new Date();
    if (_.isArray(data)) {
      data.forEach((data) => _.assign(data, { updatedAt: now }));
    }
  },
};

module.exports = timestampsLifecyclesSubscriber;
