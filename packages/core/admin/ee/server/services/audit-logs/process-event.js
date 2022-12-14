'use strict';

module.exports = function processEvent(strapi, name, ...args) {
  const defaultGetPayload = (...args) => args[0];
  const getAuthPayload = (...args) => ({
    user: strapi.service('admin::user').sanitizeUser(args[0].user),
  });

  const eventMap = {
    'entry.create': defaultGetPayload,
    'entry.update': defaultGetPayload,
    'entry.delete': defaultGetPayload,
    'entry.publish': defaultGetPayload,
    'entry.unpublish': defaultGetPayload,
    'media.create': defaultGetPayload,
    'media.update': defaultGetPayload,
    'media.delete': defaultGetPayload,
    'admin.auth.success': getAuthPayload,
  };
  const getPayload = eventMap[name];

  // Ignore the event if it's not in the map
  if (!getPayload) {
    return null;
  }

  const event = {
    action: name,
    date: new Date().toISOString(),
    payload: getPayload(...args) || {},
    userId: strapi.requestContext.get().state?.user?.id,
  };

  return event;
};
