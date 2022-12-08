'use strict';

const createAuditLogsService = (strapi) => {
  const saveEvent = (name, ...args) => {
    if (!name) {
      throw Error('Name is required');
    }
    // TODO: filter events here
    // TODO: save events here via provider
    console.log(`Listened to event ${name} with args: ${args}`);
  };

  return {
    bootstrap() {
      console.log('Registering audit logs service...');
      this.unsubscribe = strapi.eventHub.addSubscriber(saveEvent);
    },

    destroy() {
      if (this.unsubscribe) {
        console.log('Unsubscribing from audit logs service...');
        this.unsubscribe();
      }
    },
  };
};

module.exports = createAuditLogsService;
