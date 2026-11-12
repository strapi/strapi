import type { Core } from '@strapi/types';
import type { Controllers } from '../types/controllers';

/**
 * The forgot-password route uses email's `plugin::email.rateLimit` middleware. Admin cannot see
 * email's middleware contracts: email peer-depends on admin, so importing them would be a cycle.
 * This route alone keeps its middleware names unchecked.
 */
type ForgotPasswordRoute = Omit<Core.RouteInputFor<Controllers>, 'handler' | 'config'> & {
  handler: 'authentication.forgotPassword';
  config?: Omit<Core.RouteConfigFor, 'middlewares'> & { middlewares?: string[] };
};

// The published type stays the widened one develop infers; `satisfies` checks the literals.
const routes: (
  | {
      method: string;
      path: string;
      handler: string;
      config: {
        auth: boolean;
        middlewares: string[];
        policies?: undefined;
      };
    }
  | {
      method: string;
      path: string;
      handler: string;
      config: {
        auth: boolean;
        middlewares?: undefined;
        policies?: undefined;
      };
    }
  | {
      method: string;
      path: string;
      handler: string;
      config: {
        policies: string[];
        auth?: undefined;
        middlewares?: undefined;
      };
    }
)[] = [
  {
    method: 'POST',
    path: '/login',
    handler: 'authentication.login',
    config: {
      auth: false,
      middlewares: ['admin::rateLimit'],
    },
  },
  {
    method: 'POST',
    path: '/access-token',
    handler: 'authentication.accessToken',
    config: {
      auth: false,
    },
  },
  {
    method: 'POST',
    path: '/register-admin',
    handler: 'authentication.registerAdmin',
    config: {
      auth: false,
      middlewares: ['admin::rateLimit'],
    },
  },
  {
    method: 'GET',
    path: '/registration-info',
    handler: 'authentication.registrationInfo',
    config: { auth: false },
  },
  {
    method: 'POST',
    path: '/register',
    handler: 'authentication.register',
    config: { auth: false },
  },
  {
    method: 'POST',
    path: '/forgot-password',
    handler: 'authentication.forgotPassword',
    config: {
      auth: false,
      middlewares: ['plugin::email.rateLimit'],
    },
  },
  {
    method: 'POST',
    path: '/reset-password',
    handler: 'authentication.resetPassword',
    config: { auth: false },
  },
  {
    method: 'POST',
    path: '/logout',
    handler: 'authentication.logout',
    config: {
      policies: ['admin::isAuthenticatedAdmin'],
    },
  },
] satisfies (Core.RouteInputFor<Controllers> | ForgotPasswordRoute)[];

export default routes;
