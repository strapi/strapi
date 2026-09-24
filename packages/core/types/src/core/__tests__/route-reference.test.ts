import type { ControllerHandler } from '../controller';
import type { RouterInputFor } from '../router';

const controllers = {
  items: {} as { list: ControllerHandler; create: ControllerHandler },
  jobs: (() => ({})) as () => { run: ControllerHandler },
} as const;

declare const middleware: ControllerHandler;

// String handlers reference an action of the controller map. Factories are unwrapped.
({
  type: 'admin',
  routes: [
    { method: 'GET', path: '/items', handler: 'items.list' },
    { method: 'POST', path: '/jobs', handler: 'jobs.run' },
    { method: 'GET', path: '/inline', handler: middleware },
    { method: 'GET', path: '/absolute', handler: 'plugin::route-lab.items.create' },
  ],
}) satisfies RouterInputFor<typeof controllers, 'plugin::route-lab'>;

({
  type: 'admin',
  // @ts-expect-error Unknown actions are rejected.
  routes: [{ method: 'GET', path: '/items', handler: 'items.missing' }],
}) satisfies RouterInputFor<typeof controllers, 'plugin::route-lab'>;

({
  type: 'admin',
  // @ts-expect-error Unknown controllers are rejected.
  routes: [{ method: 'GET', path: '/tags', handler: 'tags.list' }],
}) satisfies RouterInputFor<typeof controllers, 'plugin::route-lab'>;

({
  type: 'admin',
  // @ts-expect-error Absolute references must use the given namespace.
  routes: [{ method: 'GET', path: '/items', handler: 'plugin::other.items.list' }],
}) satisfies RouterInputFor<typeof controllers, 'plugin::route-lab'>;

({
  type: 'admin',
  // @ts-expect-error Without a namespace, only relative references are accepted.
  routes: [{ method: 'GET', path: '/items', handler: 'plugin::route-lab.items.list' }],
}) satisfies RouterInputFor<typeof controllers>;
