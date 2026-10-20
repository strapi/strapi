export type Subscriber = (eventName: string, ...args: any[]) => Promise<void>;
export type Listener = (...args: any[]) => Promise<void>;

export interface EventHub {
  emit(eventName: string, ...args: unknown[]): Promise<void>;
  subscribe(subscriber: Subscriber): () => void;
  unsubscribe(subscriber: Subscriber): void;
  on(eventName: string, listener: Listener): () => void;
  off(eventName: string, listener: Listener): void;
  once(eventName: string, listener: Listener): () => void;
  destroy(): EventHub;
  removeListener(eventName: string, listener: Listener): void;
  removeAllListeners(): EventHub;
  removeAllSubscribers(): EventHub;
  addListener(eventName: string, listener: Listener): () => void;
}

/**
 * The event hub is Strapi's event control center.
 */
export default function createEventHub(): EventHub {
  const listeners = new Map();

  // Default subscriber to easily add listeners with the on() method
  const defaultSubscriber = async (eventName: string, ...args: unknown[]) => {
    if (listeners.has(eventName)) {
      // Iterate over a copy so that a listener removed during the emit (e.g. a once() listener)
      // does not make the loop skip the next listener
      for (const listener of listeners.get(eventName).slice()) {
        await listener(...args);
      }
    }
  };

  // Store of subscribers that will be called when an event is emitted
  const subscribers = [defaultSubscriber];

  const eventHub: EventHub = {
    async emit(eventName, ...args) {
      for (const subscriber of subscribers) {
        await subscriber(eventName, ...args);
      }
    },

    subscribe(subscriber) {
      subscribers.push(subscriber);

      // Return a function to remove the subscriber
      return () => {
        eventHub.unsubscribe(subscriber);
      };
    },

    unsubscribe(subscriber) {
      const subscriberIndex = subscribers.indexOf(subscriber);

      // Only remove the subscriber if it exists
      if (subscriberIndex >= 0) {
        subscribers.splice(subscriberIndex, 1);
      }
    },

    on(eventName, listener) {
      if (!listeners.has(eventName)) {
        listeners.set(eventName, [listener]);
      } else {
        listeners.get(eventName).push(listener);
      }

      // Return a function to remove the listener
      return () => {
        eventHub.off(eventName, listener);
      };
    },

    off(eventName, listener) {
      const eventListeners = listeners.get(eventName);

      if (eventListeners === undefined) {
        return;
      }

      const listenerIndex = eventListeners.indexOf(listener);

      // Only remove the listener if it exists
      if (listenerIndex >= 0) {
        eventListeners.splice(listenerIndex, 1);
      }
    },

    once(eventName, listener) {
      let fired = false;

      // Remove the registered wrapper, not the original listener which is not in the list
      const wrapper: Listener = async (...args) => {
        // An emit that copied the listener list before the removal can still call the wrapper
        if (fired === true) {
          return;
        }

        fired = true;
        eventHub.off(eventName, wrapper);
        return listener(...args);
      };

      return eventHub.on(eventName, wrapper);
    },

    destroy() {
      this.removeAllListeners();
      this.removeAllSubscribers();
      return this;
    },

    removeListener(eventName, listener) {
      return eventHub.off(eventName, listener);
    },

    removeAllListeners() {
      listeners.clear();
      return this;
    },

    removeAllSubscribers() {
      subscribers.length = 0;
      return this;
    },

    addListener(eventName, listener) {
      return eventHub.on(eventName, listener);
    },
  };

  return eventHub;
}
