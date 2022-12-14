'use strict';

const processEvent = require('./process-event');

const createAuditLogsService = (strapi) => {
  const handleEvent = (name, ...args) => {
    if (!name) {
      throw Error('Name is required');
    }

    const processedEvent = processEvent(strapi, name, ...args);

    if (processedEvent) {
      // TODO: save events here via provider
      console.log(`Saving event: ${JSON.stringify(processedEvent, null, 2)}`);
    } else {
      // TODO remove
      console.log(`Ignored event ${name} with args: ${JSON.stringify(args)}`);
    }
  };

  return {
    register() {
      this.unsubscribe = strapi.eventHub.subscribe(handleEvent);
    },

    destroy() {
      if (this.unsubscribe) {
        this.unsubscribe();
      }
    },
  };
};

module.exports = createAuditLogsService;
