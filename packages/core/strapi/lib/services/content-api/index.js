'use strict';

const { strict: assert } = require('assert');
const { has } = require('lodash/fp');

const INVALID_STRATEGY_MSG =
  'Invalid auth strategy. Expecting an object with properties {name: string, authenticate: function}';

const validStrategy = strategy => {
  assert(has('name', strategy), INVALID_STRATEGY_MSG);
  assert(typeof strategy.name === 'string', INVALID_STRATEGY_MSG);

  assert(has('authenticate', strategy), INVALID_STRATEGY_MSG);
  assert(typeof strategy.authenticate === 'function', INVALID_STRATEGY_MSG);
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
    async authenticate(ctx) {
      for (const strategy of strategies) {
        const result = await strategy.authenticate(ctx);

        const { authenticated = false, credentials, scope } = result || {};

        if (authenticated) {
          ctx.state.auth = {
            isAuthenticated: authenticated,
            scope,
            credentials,
          };

          return;
        }
      }
    },
  };
};

module.exports = () => {
  return {
    auth: createAuthentication(),
  };
};
