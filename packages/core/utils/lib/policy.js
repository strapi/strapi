/**
 * Policies util
 */
'use strict';

const _ = require('lodash');
const { eq } = require('lodash/fp');

const PLUGIN_PREFIX = 'plugin::';
const API_PREFIX = 'api::';

const createPolicy = (policyName, args) => ({ policyName, args });

const resolveHandler = policy => {
  return _.has('handler', policy) ? policy.handler : policy;
};

const parsePolicy = policy => {
  if (typeof policy === 'string') {
    return createPolicy(policy);
  }

  const { name, options = {} } = policy;
  return createPolicy(name, options);
};

const resolvePolicy = policyName => {
  const policy = strapi.policy(policyName);

  return resolveHandler(policy);
};

const searchLocalPolicy = (policyName, { pluginName, apiName }) => {
  if (pluginName) {
    const policy = strapi.policy(`${PLUGIN_PREFIX}${pluginName}.${policyName}`);
    return resolveHandler(policy);
  }

  if (apiName) {
    const policy = strapi.policy(`${API_PREFIX}${apiName}.${policyName}`);
    return resolveHandler(policy);
  }
};

const globalPolicy = ({ method, endpoint, controller, action, plugin }) => {
  return async (ctx, next) => {
    ctx.request.route = {
      endpoint: `${method} ${endpoint}`,
      controller: _.toLower(controller),
      action: _.toLower(action),
      verb: _.toLower(method),
      plugin,
    };

    await next();
  };
};

const bodyPolicy = async (ctx, next) => {
  const values = await next();

  if (_.isNil(ctx.body) && !_.isNil(values)) {
    ctx.body = values;
  }
};

const get = (policy, { pluginName, apiName } = {}) => {
  if (typeof policy === 'function') {
    return policy;
  }

  const { policyName, args } = parsePolicy(policy);

  const resolvedPolicy = resolvePolicy(policyName);

  if (resolvedPolicy !== undefined) {
    return _.isPlainObject(policy) ? resolvedPolicy(args) : resolvedPolicy;
  }

  const localPolicy = searchLocalPolicy(policy, { pluginName, apiName });

  if (localPolicy !== undefined) {
    return localPolicy;
  }

  throw new Error(`Could not find policy "${policy}"`);
};

const createPolicyFactory = (factoryCallback, options) => {
  const { validator, name = 'unnamed' } = options;

  const validate = (...args) => {
    try {
      validator(...args);
    } catch (e) {
      throw new Error(`Invalid objects submitted to "${name}" policy.`);
    }
  };

  return options => {
    if (validator) {
      validate(options);
    }

    return factoryCallback(options);
  };
};

const createPolicyContext = (type, ctx) => {
  return Object.assign(
    {
      is: eq(type),

      get type() {
        return type;
      },
    },
    ctx
  );
};

module.exports = {
  get,
  globalPolicy,
  bodyPolicy,
  createPolicyFactory,
  createPolicyContext,
};
