'use strict';

const createLifecyclesManager = db => {
  const lifecycleManager = {
    _subscribers: [],
    subscribe(subscriber) {
      // TODO: verify subscriber

      this._subscribers.push(subscriber);

      return () => {
        this._subscribers.splice(this._subscribers.indexOf(subscriber), 1);
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
    async emit(action, uid, properties) {
      for (const subscriber of this._subscribers) {
        const hasAction = action in subscriber;
        const hasModel = !subscriber.models || subscriber.models.includes(uid);

        if (hasAction && hasModel) {
          const event = this.createEvent(action, uid, properties);

          await subscriber[action](event);
        }
      }
    },
  };

  return lifecycleManager;
};

module.exports = {
  createLifecyclesManager,
};
