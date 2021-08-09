'use strict';

const createLifecyclesManager = db => {
  let subscribers = [];

  const lifecycleManager = {
    subscribe(subscriber) {
      // TODO: verify subscriber
      subscribers.push(subscriber);

      return () => {
        subscribers.splice(subscribers.indexOf(subscriber), 1);
      };
    },

    createEvent(action, uid, properties) {
      const model = db.metadata.get(uid);

      return {
        action,
        model,
        ...properties,
      };
    },

    async run(action, uid, properties) {
      for (const subscriber of subscribers) {
        if (typeof subscriber === 'function') {
          const event = this.createEvent(action, uid, properties);
          return await subscriber(event);
        }

        const hasAction = action in subscriber;
        const hasModel = !subscriber.models || subscriber.models.includes(uid);

        if (hasAction && hasModel) {
          const event = this.createEvent(action, uid, properties);

          await subscriber[action](event);
        }
      }
    },

    clear() {
      subscribers = [];
    },
  };

  return lifecycleManager;
};

module.exports = {
  createLifecyclesManager,
};
