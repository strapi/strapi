import type { Sender } from './sender';

interface Options {
  limitedEvents?: string[];
}

type TailParams<T extends (...args: any[]) => any> =
  Parameters<T> extends [unknown, ...infer U] ? U : never;

function nextResetDate(): number {
  return Date.now() + 24 * 60 * 60 * 1000; // Now + 24 hours.
}

export default (sender: Sender, { limitedEvents = [] }: Options = {}) => {
  let cacheExpiresAt = nextResetDate();
  const eventCache = new Map();

  return async (event: string, ...args: TailParams<Sender>) => {
    if (!limitedEvents.includes(event)) {
      return sender(event, ...args);
    }

    if (Date.now() > cacheExpiresAt) {
      eventCache.clear();
      cacheExpiresAt = nextResetDate();
    }

    if (eventCache.has(event)) {
      return false;
    }

    eventCache.set(event, true);
    return sender(event, ...args);
  };
};
