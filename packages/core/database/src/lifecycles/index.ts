import { strict as assert } from 'assert';

import * as subscriberUtils from './subscribers';

import type { Action, Event, Params, Subscriber } from './types';
import type { Database } from '..';

export type * from './types';

export type State = Record<string, unknown>;
export type States = Map<Subscriber, State>;

export interface Properties {
  params: Params;
  result?: unknown;
}

export interface LifecycleProvider {
  subscribe(subscriber: Subscriber): () => void;
  clear(): void;
  run(action: Action, uid: string, properties: Properties, states?: States): Promise<States>;
  hasSubscribers(action: Action, uid: string): boolean;
  createEvent(action: Action, uid: string, properties: Properties, state: State): Event;
  disable(): void;
  enable(): void;
}

export const createLifecyclesProvider = (db: Database): LifecycleProvider => {
  let subscribers = [
    subscriberUtils.timestampsLifecyclesSubscriber,
    subscriberUtils.modelsLifecyclesSubscriber,
  ];

  let isLifecycleHooksDisabled = false;

  return {
    subscribe(subscriber) {
      assert(
        subscriberUtils.isValidSubscriber(subscriber),
        'Invalid subscriber. Expected function or object'
      );

      subscribers.push(subscriber);

      return () => subscribers.splice(subscribers.indexOf(subscriber), 1);
    },

    clear() {
      subscribers = [];
    },

    disable() {
      isLifecycleHooksDisabled = true;
    },

    enable() {
      isLifecycleHooksDisabled = false;
    },

    /**
     * Whether running `action` on `uid` would reach anyone: a lifecycle declared on the model, a
     * subscriber registered for that model or for every model, or a subscriber function.
     */
    hasSubscribers(action, uid) {
      if (isLifecycleHooksDisabled) {
        return false;
      }

      return subscribers.some((subscriber) => {
        if (subscriber === subscriberUtils.modelsLifecyclesSubscriber) {
          const model = db.metadata.get(uid);

          return Boolean(model.lifecycles && action in model.lifecycles);
        }

        if (typeof subscriber === 'function') {
          return true;
        }

        return action in subscriber && (!subscriber.models || subscriber.models.includes(uid));
      });
    },

    createEvent(action, uid, properties, state): Event {
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
      if (isLifecycleHooksDisabled) return states;
      for (let i = 0; i < subscribers.length; i += 1) {
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

          await subscriber[action]?.(event);
          if (event.state) {
            states.set(subscriber, event.state);
          }
        }
      }

      return states;
    },
  };
};
