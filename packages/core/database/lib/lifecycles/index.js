'use strict';

const assert = require('assert').strict;

const timestampsLifecyclesSubscriber = require('./subscribers/timestamps');
const modelLifecyclesSubscriber = require('./subscribers/models-lifecycles');

const isValidSubscriber = subscriber => {
  return (
    typeof subscriber === 'function' || (typeof subscriber === 'object' && subscriber !== null)
  );
};

/**
 * @type {import('.').createLifecyclesProvider}
 */
const createLifecyclesProvider = db => {
  let subscribers = [timestampsLifecyclesSubscriber, modelLifecyclesSubscriber];

  return {
    subscribe(subscriber) {
      assert(isValidSubscriber(subscriber), 'Invalid subscriber. Expected function or object');

      subscribers.push(subscriber);

      return () => subscribers.splice(subscribers.indexOf(subscriber), 1);
    },

    clear() {
      subscribers = [];
    },

    createEvent(action, uid, properties, state) {
      const model = db.metadata.get(uid);

      return {
        action,
        model,
        state,
        ...properties,
      };
    },

    async run(action, uid, properties, states) {
      for (let i = 0; i < subscribers.length; i++) {
        const subscriber = subscribers[i];
        if (typeof subscriber === 'function') {
          const event = this.createEvent(action, uid, properties, states[i]);
          await subscriber(event);
          if (event.state) {
            states[i] = event.state;
          }
          continue;
        }

        const hasAction = action in subscriber;
        const hasModel = !subscriber.models || subscriber.models.includes(uid);

        if (hasAction && hasModel) {
          const event = this.createEvent(action, uid, properties, states[i]);

          await subscriber[action](event);
          if (event.state) {
            states[i] = event.state;
          }
        }
      }
    },
  };
};

module.exports = {
  createLifecyclesProvider,
};
