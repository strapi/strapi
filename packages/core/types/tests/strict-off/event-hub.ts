import type { Core, Modules } from '../../src';
import type { Equal, Expect } from './helpers';

// The event hub keeps develop's types, even for registered names.
declare const eventStrapi: Core.Strapi;
declare const eventChecks: [
  Expect<Equal<Core.Strapi['eventHub'], Modules.EventHub.EventHub>>,
  Expect<
    Equal<Parameters<Core.Strapi['eventHub']['emit']>, [eventName: string, ...args: unknown[]]>
  >,
  // Cleanup methods keep returning the legacy hub.
  Expect<Equal<ReturnType<Core.Strapi['eventHub']['destroy']>, Modules.EventHub.EventHub>>,
  Expect<
    Equal<ReturnType<Core.Strapi['eventHub']['removeAllListeners']>, Modules.EventHub.EventHub>
  >,
  Expect<
    Equal<ReturnType<Core.Strapi['eventHub']['removeAllSubscribers']>, Modules.EventHub.EventHub>
  >,
];
eventChecks satisfies unknown;
eventStrapi.eventHub.emit('legacy.event', { off: 'contract' });
eventStrapi.eventHub.destroy().emit('legacy.event', { off: 'contract' });

// Subscribers keep any arguments, so a subscriber that declares typed arguments still compiles.
type IsAny<T> = 0 extends 1 & T ? true : false;
type SubscribeParam = Parameters<Core.Strapi['eventHub']['subscribe']>[0];
declare const subscriberChecks: [
  Expect<Equal<SubscribeParam, Modules.EventHub.Subscriber>>,
  Expect<Equal<Parameters<Core.Strapi['eventHub']['unsubscribe']>[0], Modules.EventHub.Subscriber>>,
  Expect<Equal<Parameters<SubscribeParam>, [eventName: string, ...args: any[]]>>,
];
subscriberChecks satisfies unknown;
eventStrapi.eventHub.subscribe(async (eventName, ...args) => {
  eventName satisfies string;
  const argsAreAny: Expect<IsAny<(typeof args)[number]>> = true;
  argsAreAny satisfies true;
});
const typedSubscriber = async (eventName: string, entry: { id: number }) => {
  entry.id satisfies number;
};
const removeTypedSubscriber = eventStrapi.eventHub.subscribe(typedSubscriber);
removeTypedSubscriber satisfies () => void;
eventStrapi.eventHub.unsubscribe(typedSubscriber);
