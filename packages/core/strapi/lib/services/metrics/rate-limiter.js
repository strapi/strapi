'use strict';

/**
 * @param events a list of events that need to be limited
 */
module.exports = (sender, { limitedEvents = [] } = {}) => {
  let currentDay = new Date().getDate();
  const eventCache = new Map();

  return async (event, ...args) => {
    if (!limitedEvents.includes(event)) {
      return sender(event, ...args);
    }

    if (new Date().getDate() !== currentDay) {
      eventCache.clear();
      currentDay = new Date().getDate();
    }

    if (eventCache.has(event)) {
      return false;
    }

    eventCache.set(event, true);
    return sender(event, ...args);
  };
};
