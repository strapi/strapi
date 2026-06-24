import _ from 'lodash';
import type { Event, Subscriber } from '../types';

// NOTE: we could add onCreate & onUpdate on field level to do this instead
export const timestampsLifecyclesSubscriber: Subscriber = {
  /**
   * Init createdAt & updatedAt before create
   */
  beforeCreate(event: Event) {
    const { data } = event.params;

    const now = new Date();
    // _.defaults only fills undefined slots; Object.assign would overwrite
    // eslint-disable-next-line you-dont-need-lodash-underscore/defaults
    _.defaults(data, { createdAt: now, updatedAt: now });
  },

  /**
   * Init createdAt & updatedAt before create
   * @param {Event} event
   */
  beforeCreateMany(event) {
    const { data } = event.params;

    const now = new Date();
    if (Array.isArray(data)) {
      // _.defaults only fills undefined slots; Object.assign would overwrite
      // eslint-disable-next-line you-dont-need-lodash-underscore/defaults
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
    Object.assign(data, { updatedAt: now });
  },

  /**
   * Update updatedAt before update
   * @param {Event} event
   */
  beforeUpdateMany(event) {
    const { data } = event.params;

    const now = new Date();
    if (Array.isArray(data)) {
      data.forEach((data) => Object.assign(data, { updatedAt: now }));
    }
  },
};
