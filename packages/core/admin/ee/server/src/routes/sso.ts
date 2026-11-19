import type { Core } from '@strapi/types';
import type { RouteControllers } from '../types/controllers';
import { enableFeatureMiddleware } from './utils';

// The published type stays the widened one develop infers; `satisfies` checks the literals.
const ssoRouter: {
  type: string;
  routes: (
    | {
        method: string;
        path: string;
        handler: string;
        config: {
          middlewares: Core.MiddlewareHandler[];
          auth: boolean;
          policies?: undefined;
        };
      }
    | {
        method: string;
        path: string;
        handler: string;
        config: {
          middlewares: Core.MiddlewareHandler[];
          policies: (string | { name: string; config: { actions: string[] } })[];
          auth?: undefined;
        };
      }
  )[];
} = {
  type: 'admin',
  routes: [
    {
      method: 'GET',
      path: '/providers',
      handler: 'authentication.getProviders',
      config: {
        middlewares: [enableFeatureMiddleware('sso')],
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/connect/:provider',
      handler: 'authentication.providerLogin',
      config: {
        middlewares: [enableFeatureMiddleware('sso')],
        auth: false,
      },
    },
    {
      method: 'POST',
      path: '/connect/:provider',
      handler: 'authentication.providerLogin',
      config: {
        middlewares: [enableFeatureMiddleware('sso')],
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/providers/options',
      handler: 'authentication.getProviderLoginOptions',
      config: {
        middlewares: [enableFeatureMiddleware('sso')],
        policies: [
          'admin::isAuthenticatedAdmin',
          { name: 'admin::hasPermissions', config: { actions: ['admin::provider-login.read'] } },
        ],
      },
    },
    {
      method: 'PUT',
      path: '/providers/options',
      handler: 'authentication.updateProviderLoginOptions',
      config: {
        middlewares: [enableFeatureMiddleware('sso')],
        policies: [
          'admin::isAuthenticatedAdmin',
          { name: 'admin::hasPermissions', config: { actions: ['admin::provider-login.update'] } },
        ],
      },
    },
    {
      method: 'GET',
      path: '/providers/isSSOLocked',
      handler: 'user.isSSOLocked',
      config: {
        middlewares: [enableFeatureMiddleware('sso')],
        policies: ['admin::isAuthenticatedAdmin'],
      },
    },
  ],
} satisfies Core.RouterInputFor<RouteControllers>;

export default ssoRouter;
