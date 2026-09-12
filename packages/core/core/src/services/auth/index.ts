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

/**
 * Runs once per request, after the request's identity is settled and before the
 * route's policies and controller — for authenticated requests and for
 * `auth: false` routes alike, so a handler sees anonymous callers too.
 *
 * Handlers derive request-scoped state from that identity (which tenant the
 * caller is acting in, for instance). Rejecting is done the Koa way: throw, or
 * call `ctx.forbidden()`/`ctx.unauthorized()`.
 *
 * A route that authenticates on its own — the MCP endpoint does, because its
 * protocol carries the credential — can call `runAuthenticated` once it knows
 * who the caller is, and handlers will run again with that identity. So a
 * handler must be able to run more than once per request, and reach the same
 * conclusion given the same state.
 */
type AuthenticatedHandler = (ctx: ParameterizedContext) => Promise<void> | void;

interface Authentication {
  register: (type: string, strategy: Strategy) => Authentication;
  /**
   * Registers a handler to run after authentication resolves. Returns a
   * function that unregisters it.
   */
  onAuthenticated: (handler: AuthenticatedHandler) => () => void;
  /**
   * Runs the registered handlers for a request that established its identity
   * itself, rather than through a strategy.
   */
  runAuthenticated: (ctx: ParameterizedContext) => Promise<void>;
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
  const authenticatedHandlers: AuthenticatedHandler[] = [];

  const runAuthenticatedHandlers = async (ctx: ParameterizedContext) => {
    for (const handler of authenticatedHandlers) {
      await handler(ctx);
    }
  };

  return {
    register(type, strategy) {
      validStrategy(strategy);

      if (!strategies[type]) {
        strategies[type] = [];
      }

      strategies[type].push(strategy);

      return this;
    },

    runAuthenticated: runAuthenticatedHandlers,

    onAuthenticated(handler) {
      authenticatedHandlers.push(handler);

      return () => {
        const index = authenticatedHandlers.indexOf(handler);

        if (index !== -1) {
          authenticatedHandlers.splice(index, 1);
        }
      };
    },

    async authenticate(ctx, next) {
      const route: Core.Route = ctx.state.route;

      // use route strategy
      const config = route?.config?.auth;

      if (config === false) {
        await runAuthenticatedHandlers(ctx);

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

          await runAuthenticatedHandlers(ctx);

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
