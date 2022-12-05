'use strict';

const ee = require('../utils/ee');

const createAuditLogsService = (strapi) => {
  const eventListener = (name, payload = {}) => {
    if (!name && !Object.keys(payload).length) {
      throw Error('No name or payload');
    }
    // TODO: filter events here
    // TODO: save events here via provider
    console.log(`Listened to event ${name} with payload: ${JSON.stringify(payload)}`);
  };

  const isEnabled = strapi.EE && ee.features.isEnabled('audit-logs');

  return {
    emitEvent(name, payload) {
      // Don't emit events if audit logs are not enabled
      if (!isEnabled) {
        return;
      }

      // Create a listener if it doesn't already exist
      const existingsEvents = strapi.eventHub.eventNames();
      if (!existingsEvents.includes(name)) {
        strapi.eventHub.addListener(name, (payload) => {
          eventListener(name, payload);
        });
      }

      // Emit the event
      strapi.eventHub.emit(name, payload);
    },
  };
};

module.exports = createAuditLogsService;
