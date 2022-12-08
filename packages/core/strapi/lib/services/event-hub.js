'use strict';

/**
 * The event hub is Strapi's event control center.
 */
module.exports = function createEventHub() {
  // Store of subscribers that will be called when an event is emitted
  const subscribers = [];

  return {
    emit(eventName, ...args) {
      subscribers.forEach((subscriber) => {
        subscriber(eventName, ...args);
      });
    },

    addSubscriber(subscriber) {
      subscribers.push(subscriber);

      // Return a function to remove the subscriber
      return () => {
        subscribers.splice(subscribers.indexOf(subscriber), 1);
      };
    },

    removeAllSubscribers() {
      subscribers.length = 0;
    },
  };
};
