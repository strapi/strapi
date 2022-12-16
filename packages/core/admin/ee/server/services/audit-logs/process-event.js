'use strict';

module.exports = function processEvent(strapi, name, ...args) {
  const getDefaultPayload = (...args) => args[0];

  const eventMap = {
    'entry.create': getDefaultPayload,
    'entry.update': getDefaultPayload,
    'entry.delete': getDefaultPayload,
    'entry.publish': getDefaultPayload,
    'entry.unpublish': getDefaultPayload,
    'media.create': getDefaultPayload,
    'media.update': getDefaultPayload,
    'media.delete': getDefaultPayload,
    'admin.auth.success': getDefaultPayload,
    'user.create': getDefaultPayload,
    'user.read': getDefaultPayload,
    'user.update': getDefaultPayload,
    'user.delete': getDefaultPayload,
  };
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
