'use strict';

const { strict: assert } = require('assert');
const { has, prop } = require('lodash/fp');
const { BaseRegistry } = require('../../core/registries/base');

class UnauthorizedError extends Error {}
class ForbiddenError extends Error {}

const INVALID_STRATEGY_MSG =
  'Invalid auth strategy. Expecting an object with properties {name: string, authenticate: function, verify: function}';

const validStrategy = strategy => {
  assert(has('authenticate', strategy), INVALID_STRATEGY_MSG);
  assert(typeof strategy.authenticate === 'function', INVALID_STRATEGY_MSG);

  if (has('verify', strategy)) {
    assert(typeof strategy.verify === 'function', INVALID_STRATEGY_MSG);
  }
};

class AuthenticationRegistry extends BaseRegistry {
  constructor(strapi) {
    super(strapi);
    this.strategies = {};
  }
  get errors() {
    return {
      UnauthorizedError,
      ForbiddenError,
    };
  }
  register(type, strategy) {
    validStrategy(strategy);

    if (!this.strategies[type]) {
      this.strategies[type] = [];
    }

    this.strategies[type].push(strategy);

    return this;
  }
  async authenticate(ctx, next) {
    const { route } = ctx.state;

    // use route strategy
    const config = prop('config.auth', route);

    if (config === false) {
      return next();
    }

    const strategiesToUse = this.strategies[route.info.type];

    for (const strategy of strategiesToUse) {
      const result = await strategy.authenticate(ctx);

      const { authenticated = false, error = null, credentials } = result || {};

      if (error !== null) {
        return ctx.unauthorized(error);
      }

      if (authenticated) {
        ctx.state.isAuthenticated = true;
        ctx.state.auth = {
          strategy,
          credentials,
        };

        return next();
      }
    }

    return ctx.unauthorized('Missing or invalid credentials');
  }
  async verify(auth, config = {}) {
    if (config === false) {
      return;
    }

    if (!auth) {
      throw new UnauthorizedError();
    }

    if (typeof auth.strategy.verify === 'function') {
      return auth.strategy.verify(auth, config);
    }

    return;
  }
}

const createAuthRegistry = strapi => {
  return new AuthenticationRegistry(strapi);
};

module.exports = createAuthRegistry;
module.exports.AuthenticationRegistry = AuthenticationRegistry;
