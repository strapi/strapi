'use strict';

const assert = require('assert').strict;

/**
 * @typedef Event
 * @property {string} action
 * @property {Model} model
 */

/**
 * For each model try to run it's lifecycles function if any is defined
 * @param {Event} event
 */
const modelLifecyclesSubscriber = async event => {
  const { model } = event;
  if (event.action in model.lifecycles) {
    await model.lifecycles[event.action](event);
  }
};

const isValidSubscriber = subscriber => {
  return (
    typeof subscriber === 'function' || (typeof subscriber === 'object' && subscriber !== null)
  );
};

const createLifecyclesManager = db => {
  let subscribers = [modelLifecyclesSubscriber];

  const lifecycleManager = {
    subscribe(subscriber) {
      assert(isValidSubscriber(subscriber), 'Invalid subscriber. Expected function or object');

      subscribers.push(subscriber);

      return () => subscribers.splice(subscribers.indexOf(subscriber), 1);
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
          await subscriber(event);
          continue;
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
