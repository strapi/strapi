'use strict';

function getEventMap(defaultEvents) {
  const getDefaultPayload = (...args) => args[0];

  // Use the default payload for all default events
  return defaultEvents.reduce((acc, event) => {
    acc[event] = getDefaultPayload;
    return acc;
  }, {});
}

module.exports = function processEvent(strapi, name, ...args) {
  const defaultEvents = [
    'entry.create',
    'entry.update',
    'entry.delete',
    'entry.publish',
    'entry.unpublish',
    'media.create',
    'media.update',
    'media.delete',
    'admin.auth.success',
  ];

  // NOTE: providers should be able to replace getEventMap to add or remove events
  const eventMap = getEventMap(defaultEvents);

  const getPayload = eventMap[name];

  // Ignore the event if it's not in the map
  if (!getPayload) {
    return null;
  }

  return {
    action: name,
    date: new Date().toISOString(),
    payload: getPayload(...args) || {},
    userId: strapi.requestContext.get().state?.user?.id,
  };
};
