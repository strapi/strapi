export type Subscriber = (eventName: string, ...args: any[]) => Promise<void>;
export type Listener = (...args: any[]) => Promise<void>;

export interface EventHubSubscriberErrorInfo {
  eventName: string;
  phase: 'subscriber' | 'listener';
}

export interface CreateEventHubOptions {
  /**
   * Invoked when a subscriber or named listener throws; emit still completes for other handlers.
   * When omitted, failures are logged via `console.warn` (see {@link defaultOnSubscriberError})
   * rather than silently dropped.
   */
  onSubscriberError?(error: unknown, info: EventHubSubscriberErrorInfo): void;
}

export interface EventHub {
  /**
   * Emits an event to every subscriber and named listener, awaiting each in turn.
   *
   * Behavior note: a throwing subscriber/listener does NOT reject `emit` and does NOT prevent the
   * remaining handlers from running. Each failure is isolated and routed to `onSubscriberError`
   * (defaulting to a `console.warn`). This differs from the historical behavior where the first
   * throwing listener would reject the returned promise.
   */
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
 * Fallback handler used when no `onSubscriberError` is supplied. Logs rather than silently
 * swallowing so a failing handler is always observable, even for ad-hoc/external hub instances.
 */
function defaultOnSubscriberError(error: unknown, info: EventHubSubscriberErrorInfo): void {
  // eslint-disable-next-line no-console
  console.warn(`[event-hub] ${info.phase} handler failed for "${info.eventName}":`, error);
}

/**
 * The event hub is Strapi's event control center.
 */
export default function createEventHub(options?: CreateEventHubOptions): EventHub {
  const { onSubscriberError = defaultOnSubscriberError } = options ?? {};
  const listeners = new Map();

  // Default subscriber to easily add listeners with the on() method
  const defaultSubscriber = async (eventName: string, ...args: unknown[]) => {
    if (listeners.has(eventName)) {
      for (const listener of listeners.get(eventName)) {
        try {
          await listener(...args);
        } catch (error) {
          onSubscriberError?.(error, { eventName, phase: 'listener' });
        }
      }
    }
  };

  // Store of subscribers that will be called when an event is emitted
  const subscribers = [defaultSubscriber];

  const eventHub: EventHub = {
    async emit(eventName, ...args) {
      for (const subscriber of subscribers) {
        try {
          await subscriber(eventName, ...args);
        } catch (error) {
          onSubscriberError?.(error, { eventName, phase: 'subscriber' });
        }
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
      listeners.get(eventName)?.splice(listeners.get(eventName).indexOf(listener), 1);
    },

    once(eventName, listener) {
      return eventHub.on(eventName, async (...args) => {
        eventHub.off(eventName, listener);
        return listener(...args);
      });
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
