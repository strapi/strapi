'use strict';

/**
 * @param events a list of events that need to be limited
 */
module.exports = (sender, { limitedEvents = [] } = {}) => {
  let currentDay = new Date().getDate();
  const eventCache = new Map();

  return async (event, payload) => {
    if (!limitedEvents.includes(event)) {
      return sender(event, payload);
    }

    if (new Date().getDate() !== currentDay) {
      eventCache.clear();
      currentDay = new Date().getDate();
    }

    if (eventCache.has(event)) {
      return false;
    }

    eventCache.set(event, true);
    return sender(event, payload);
  };
};
