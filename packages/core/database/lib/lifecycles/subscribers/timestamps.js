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
   * Init created_at & updated_at before create
   * @param {Event} event
   */
  beforeCreate(event) {
    const { data } = event.params;

    const now = new Date();
    _.defaults(data, { created_at: now, updated_at: now });
  },

  /**
   * Init created_at & updated_at before create
   * @param {Event} event
   */
  beforeCreateMany(event) {
    const { data } = event.params;

    const now = new Date();
    if (_.isArray(data)) {
      data.forEach(data => _.defaults(data, { created_at: now, updated_at: now }));
    }
  },

  /**
   * Update updated_at before update
   * @param {Event} event
   */
  beforeUpdate(event) {
    const { data } = event.params;

    const now = new Date();
    _.assign(data, { updated_at: now });
  },

  /**
   * Update updated_at before update
   * @param {Event} event
   */
  beforeUpdateMany(event) {
    const { data } = event.params;

    const now = new Date();
    if (_.isArray(data)) {
      data.forEach(data => _.assign(data, { updated_at: now }));
    }
  },
};

module.exports = timestampsLifecyclesSubscriber;
