'use strict';

/**
 * The event hub is Strapi's event control center.
 */
module.exports = function createEventHub() {
  const listeners = new Map();

  // Default subscriber to easily add listeners with the on() method
  const defaultSubscriber = async (eventName, ...args) => {
    if (listeners.has(eventName)) {
      return Promise.all(listeners.get(eventName).map((listener) => listener(...args)));
    }
  };

  // Store of subscribers that will be called when an event is emitted
  const subscribers = [defaultSubscriber];

  return {
    async emit(eventName, ...args) {
      await Promise.all(subscribers.map((subscriber) => subscriber(eventName, ...args)));
    },

    subscribe(subscriber) {
      subscribers.push(subscriber);

      // Return a function to remove the subscriber
      return () => {
        subscribers.splice(subscribers.indexOf(subscriber), 1);
      };
    },

    on(eventName, listener) {
      if (!listeners.has(eventName)) {
        listeners.set(eventName, []);
      }

      listeners.get(eventName).push(listener);

      // Return a function to remove the listener
      return () => {
        listeners.get(eventName).splice(listeners.get(eventName).indexOf(listener), 1);
      };
    },

    destroy() {
      listeners.clear();
      subscribers.length = 0;
    },
  };
};
