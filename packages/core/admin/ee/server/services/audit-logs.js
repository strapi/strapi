'use strict';

const createAuditLogsService = (strapi) => {
  const saveEvent = (name, ...args) => {
    if (!name) {
      throw Error('Name is required');
    }
    // TODO: filter events here
    // TODO: save events here via provider
    console.log(`Listened to event ${name} with args: ${JSON.stringify(args)}`);
  };

  return {
    bootstrap() {
      this.unsubscribe = strapi.eventHub.subscribe(saveEvent);
    },

    destroy() {
      if (this.unsubscribe) {
        this.unsubscribe();
      }
    },
  };
};

module.exports = createAuditLogsService;
