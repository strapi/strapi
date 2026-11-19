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
