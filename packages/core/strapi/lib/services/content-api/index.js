'use strict';

const { strict: assert } = require('assert');
const { has } = require('lodash/fp');

class UnauthorizedError extends Error {}
class ForbiddenError extends Error {}

const INVALID_STRATEGY_MSG =
  'Invalid auth strategy. Expecting an object with properties {name: string, authenticate: function, verify: function}';

const validStrategy = strategy => {
  assert(has('name', strategy), INVALID_STRATEGY_MSG);
  assert(typeof strategy.name === 'string', INVALID_STRATEGY_MSG);

  assert(has('authenticate', strategy), INVALID_STRATEGY_MSG);
  assert(typeof strategy.authenticate === 'function', INVALID_STRATEGY_MSG);

  assert(has('verify', strategy), INVALID_STRATEGY_MSG);
  assert(typeof strategy.verify === 'function', INVALID_STRATEGY_MSG);
};

const createAuthentication = () => {
  const strategies = [];

  return {
    register(strategy) {
      validStrategy(strategy);
      strategies.push(strategy);

      return () => {
        strategies.splice(strategies.indexOf(strategy), 1);
      };
    },
    async authenticate(ctx, next) {
      for (const strategy of strategies) {
        const result = await strategy.authenticate(ctx);

        const { authenticated = false, credentials } = result || {};

        if (authenticated) {
          ctx.state.auth = { strategy, credentials };
          return next();
        }
      }

      return next();
    },
    async verify(auth, config = {}) {
      if (config.public) {
        return undefined;
      }

      if (!auth) {
        throw new UnauthorizedError();
      }

      return await auth.strategy.verify(auth, config);
    },
  };
};

module.exports = () => {
  return {
    auth: createAuthentication(),
    errors: {
      UnauthorizedError,
      ForbiddenError,
    },
  };
};
