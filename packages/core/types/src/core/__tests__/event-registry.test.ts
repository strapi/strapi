import type { Strapi as StrapiInstance } from '../strapi';
import type { Equal, Expect } from '../../../tests/helpers/assert';

type LabUser = { id: number; email: string };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Strapi {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace Registries {
      interface Events {
        'event-lab.user.delete': [{ user: LabUser } | { users: LabUser[] }];
        'event-lab.enable': [];
      }
    }
  }
}

declare const strapi: StrapiInstance;
declare const user: LabUser;
declare const dynamicName: string;

// An emit of a registered name takes one of the payloads of its producers.
strapi.eventHub.emit('event-lab.user.delete', { user });
strapi.eventHub.emit('event-lab.user.delete', { users: [user] });
strapi.eventHub.emit('event-lab.enable');
// @ts-expect-error A payload off the contract would reach listeners that read the registered shape.
strapi.eventHub.emit('event-lab.user.delete', { userId: 1 });
// @ts-expect-error The registered tuple is empty.
strapi.eventHub.emit('event-lab.enable', {});
// @ts-expect-error The payload is required.
strapi.eventHub.emit('event-lab.user.delete');

// Listeners receive the registered tuple; the union narrows with `in`.
const remove = strapi.eventHub.on('event-lab.user.delete', (payload) => {
  if ('users' in payload) {
    payload.users satisfies LabUser[];
  } else {
    payload.user satisfies LabUser;
  }
});
remove satisfies () => void;
const listener = (payload: { user: LabUser } | { users: LabUser[] }) => payload;
strapi.eventHub.once('event-lab.user.delete', listener);
strapi.eventHub.addListener('event-lab.user.delete', listener);
strapi.eventHub.off('event-lab.user.delete', listener);
strapi.eventHub.removeListener('event-lab.user.delete', listener);
// @ts-expect-error A listener cannot assume one producer's payload.
strapi.eventHub.on('event-lab.user.delete', (payload: { user: LabUser }) => payload);
// A listener's result is ignored, so it may be synchronous.
strapi.eventHub.on('event-lab.enable', () => {});

// Unregistered and wide names keep the types they have without strict types.
strapi.eventHub.emit('event-lab.unregistered', { any: 'payload' }, 2);
strapi.eventHub.emit(dynamicName, { userId: 1 });
strapi.eventHub.on('event-lab.unregistered', async (...args) => {
  type Args = typeof args;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type Check = Expect<Equal<Args, any[]>>;
});
// @ts-expect-error An unregistered listener returns a promise, as without strict types.
strapi.eventHub.on('event-lab.unregistered', () => {});
// Subscribers receive every event, registered or not.
strapi.eventHub.subscribe(async (eventName, ...args) => {
  eventName satisfies string;
  args satisfies unknown[];
});

// Cleanup methods return the hub, so a chained emit or listener keeps the registered contract.
// @ts-expect-error A payload off the contract, after `removeAllListeners()`.
strapi.eventHub.removeAllListeners().emit('event-lab.user.delete', { userId: 1 });
// @ts-expect-error A payload off the contract, after `removeAllSubscribers()`.
strapi.eventHub.removeAllSubscribers().emit('event-lab.user.delete', { userId: 1 });
// @ts-expect-error A payload off the contract, after `destroy()`.
strapi.eventHub.destroy().emit('event-lab.user.delete', { userId: 1 });
strapi.eventHub.destroy().on('event-lab.user.delete', (payload) => {
  type Payload = typeof payload;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  type Check = Expect<Equal<Payload, { user: LabUser } | { users: LabUser[] }>>;
});
