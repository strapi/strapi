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

    /**
     * @param {string} action
     * @param {string} uid
     * @param {{ params?: any, result?: any }} properties
     * @param {Map<any, any>} state
     */
    createEvent(action, uid, properties, state) {
      const model = db.metadata.get(uid);

      return {
        action,
        model,
        state,
        ...properties,
      };
    },

    /**
     * @param {string} action
     * @param {string} uid
     * @param {{ params?: any, result?: any }} properties
     * @param {Map<any, any>} states
     */
    async run(action, uid, properties, states = new Map()) {
      for (let i = 0; i < subscribers.length; i++) {
        const subscriber = subscribers[i];
        if (typeof subscriber === 'function') {
          const state = states.get(subscriber) || {};
          const event = this.createEvent(action, uid, properties, state);
          await subscriber(event);
          if (event.state) {
            states.set(subscriber, event.state || state);
          }
          continue;
        }

        const hasAction = action in subscriber;
        const hasModel = !subscriber.models || subscriber.models.includes(uid);

        if (hasAction && hasModel) {
          const state = states.get(subscriber) || {};
          const event = this.createEvent(action, uid, properties, state);

          await subscriber[action](event);
          if (event.state) {
            states.set(subscriber, event.state);
          }
        }
      }

      return states;
    },
  };
};

module.exports = {
  createLifecyclesProvider,
};
