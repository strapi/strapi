import type { Sender } from './sender';

interface Options {
  limitedEvents?: string[];
}

type TailParams<T extends (...args: any[]) => any> =
  Parameters<T> extends [unknown, ...infer U] ? U : never;

export default (sender: Sender, { limitedEvents = [] }: Options = {}) => {
  let currentDay = new Date().getDate();
  const eventCache = new Map();

  return async (event: string, ...args: TailParams<Sender>) => {
    if (!limitedEvents.includes(event)) {
      return sender(event, ...args);
    }

    if (new Date().getDate() !== currentDay) {
      eventCache.clear();
      currentDay = new Date().getDate();
    }

    if (eventCache.has(event)) {
      return false;
    }

    eventCache.set(event, true);
    return sender(event, ...args);
  };
};
