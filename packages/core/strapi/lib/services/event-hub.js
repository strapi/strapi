'use strict';

/**
 * The event hub is Strapi's event control center.
 */
module.exports = function createEventHub() {
  const listeners = new Map();

  // Default subscriber to easily add listeners with the on() method
  const defaultSubscriber = async (eventName, ...args) => {
    if (listeners.has(eventName)) {
      for (const listener of listeners.get(eventName)) {
        await listener(...args);
      }
    }
  };

  // Store of subscribers that will be called when an event is emitted
  const subscribers = [defaultSubscriber];

  const eventHub = {
    async emit(eventName, ...args) {
      for (const subscriber of subscribers) {
        await subscriber(eventName, ...args);
      }
    },

    subscribe(subscriber) {
      subscribers.push(subscriber);

      // Return a function to remove the subscriber
      return () => {
        eventHub.unsubscribe(subscriber);
      };
    },

    unsubscribe(subscriber) {
      const subscriberIndex = subscribers.indexOf(subscriber);

      // Only remove the subscriber if it exists
      if (subscriberIndex >= 0) {
        subscribers.splice(subscriberIndex, 1);
      }
    },

    on(eventName, listener) {
      if (!listeners.has(eventName)) {
        listeners.set(eventName, [listener]);
      } else {
        listeners.get(eventName).push(listener);
      }

      // Return a function to remove the listener
      return () => {
        eventHub.off(eventName, listener);
      };
    },

    off(eventName, listener) {
      listeners.get(eventName).splice(listeners.get(eventName).indexOf(listener), 1);
    },

    once(eventName, listener) {
      return eventHub.on(eventName, async (...args) => {
        eventHub.off(eventName, listener);
        return listener(...args);
      });
    },

    destroy() {
      listeners.clear();
      subscribers.length = 0;
      return this;
    },
  };

  return {
    ...eventHub,
    removeListener: eventHub.off,
    removeAllListeners: eventHub.destroy,
    addListener: eventHub.on,
  };
};
