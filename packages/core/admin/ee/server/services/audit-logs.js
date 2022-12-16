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
    register() {
      this._eventHubUnsubscribe = strapi.eventHub.subscribe(saveEvent);
      return this;
    },

    unsubscribe() {
      if (this._eventHubUnsubscribe) {
        this._eventHubUnsubscribe();
      }
      return this;
    },

    destroy() {
      return this.unsubscribe();
    },
  };
};

module.exports = createAuditLogsService;
