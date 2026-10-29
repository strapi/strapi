import type { Core } from '@strapi/types';
import type { Controllers } from '../../../../../server/src/types/controllers';
import type { RouteControllers } from '../../types/controllers';

// Compile-only checks of the EE routers' contract (`test:ts:back` runs them with strict types).
const ceAndEEActions = {
  type: 'admin',
  routes: [
    { method: 'GET', path: '/', handler: 'user.findOne' },
    { method: 'GET', path: '/', handler: 'user.isSSOLocked' },
    { method: 'GET', path: '/', handler: 'audit-logs.export' },
  ],
} satisfies Core.RouterInputFor<RouteControllers>;

const ceOnlyMap = {
  type: 'admin',
  // @ts-expect-error The CE controllers alone lack the EE actions: EE routes use `RouteControllers`.
  routes: [{ method: 'GET', path: '/', handler: 'user.isSSOLocked' }],
} satisfies Core.RouterInputFor<Controllers>;

const unknownAction = {
  type: 'admin',
  // @ts-expect-error Route handlers are checked against the CE and EE controller contracts.
  routes: [{ method: 'GET', path: '/', handler: 'authentication.getProvider' }],
} satisfies Core.RouterInputFor<RouteControllers>;

const unknownPermission = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/',
      handler: 'audit-logs.findMany',
      config: {
        policies: [
          {
            name: 'admin::hasPermissions',
            // @ts-expect-error Permission action IDs are checked against the registered IDs.
            config: { actions: ['admin::audit-logs.raed'] },
          },
        ],
      },
    },
  ],
} satisfies Core.RouterInputFor<RouteControllers>;

describe('Admin EE route contracts', () => {
  test('EE routes reference CE and EE actions and registered permission action IDs (checked by the compiler)', () => {
    expect(ceAndEEActions.routes).toHaveLength(3);
    expect([ceOnlyMap, unknownAction, unknownPermission]).toHaveLength(3);
  });
});
