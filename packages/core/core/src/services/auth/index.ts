import assert from 'assert/strict';
import { has } from 'lodash/fp';

import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';
import type { ParameterizedContext } from 'koa';

interface AuthenticationResponse {
  authenticated?: boolean;
  credentials?: unknown;
  ability?: unknown;
  error?: Error | null;
}

interface AuthenticationInfo {
  strategy: Strategy;
  credentials: unknown;
  ability: unknown;
}

interface Strategy {
  name: string;
  authenticate: (ctx: ParameterizedContext) => Promise<AuthenticationResponse>;
  verify?: (auth: AuthenticationInfo, config: Core.RouteConfig['auth']) => Promise<any>;
}

interface Authentication {
  register: (type: string, strategy: Strategy) => Authentication;
  authenticate: Core.MiddlewareHandler;
  verify: (auth: AuthenticationInfo, config?: Core.RouteConfig['auth']) => Promise<any>;
}

const INVALID_STRATEGY_MSG =
  'Invalid auth strategy. Expecting an object with properties {name: string, authenticate: function, verify: function}';

const validStrategy = (strategy: Strategy) => {
  assert(has('authenticate', strategy), INVALID_STRATEGY_MSG);
  assert(typeof strategy.authenticate === 'function', INVALID_STRATEGY_MSG);

  if (has('verify', strategy)) {
    assert(typeof strategy.verify === 'function', INVALID_STRATEGY_MSG);
  }
};

const createAuthentication = (): Authentication => {
  const strategies: Record<string, Strategy[]> = {};

  return {
    register(type, strategy) {
      validStrategy(strategy);

      if (!strategies[type]) {
        strategies[type] = [];
      }

      strategies[type].push(strategy);

      return this;
    },

    async authenticate(ctx, next) {
      const route: Core.Route = ctx.state.route;

      // use route strategy
      const config = route?.config?.auth;

      if (config === false) {
        return next();
      }

      const routeStrategies = route.info.type ? strategies[route.info.type] : [];
      const configStrategies = (config?.strategies ?? routeStrategies ?? []) as Array<
        string | Strategy
      >;

      const strategiesToUse: Strategy[] = configStrategies.reduce(
        (acc, strategy: string | Strategy) => {
          // Resolve by strategy name
          if (typeof strategy === 'string') {
            const routeStrategy = routeStrategies.find((rs) => rs.name === strategy);

            if (routeStrategy) {
              acc.push(routeStrategy);
            }
          }

          // Use the given strategy as is
          else if (typeof strategy === 'object') {
            validStrategy(strategy);

            acc.push(strategy);
          }

          return acc;
        },
        [] as Strategy[]
      );

      for (const strategy of strategiesToUse) {
        const result = await strategy.authenticate(ctx);

        const { authenticated = false, credentials, ability = null, error = null } = result || {};

        if (error !== null) {
          return ctx.unauthorized(error);
        }

        if (authenticated) {
          ctx.state.isAuthenticated = true;
          ctx.state.auth = {
            strategy,
            credentials,
            ability,
          };

          return next();
        }
      }

      return ctx.unauthorized('Missing or invalid credentials');
    },

    async verify(auth, config = {}) {
      if (config === false) {
        return;
      }

      if (!auth) {
        throw new errors.UnauthorizedError();
      }

      if (typeof auth.strategy.verify === 'function') {
        return auth.strategy.verify(auth, config);
      }
    },
  };
};

export default createAuthentication;
