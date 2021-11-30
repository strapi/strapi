/**
 * Policies util
 */
'use strict';

const _ = require('lodash');
const { eq } = require('lodash/fp');

const PLUGIN_PREFIX = 'plugin::';
const API_PREFIX = 'api::';

const parsePolicy = policy => {
  if (typeof policy === 'string') {
    return { policyName: policy, config: {} };
  }

  const { name, config } = policy;
  return { policyName: name, config };
};

const searchLocalPolicy = (policyName, { pluginName, apiName }) => {
  if (pluginName) {
    return strapi.policy(`${PLUGIN_PREFIX}${pluginName}.${policyName}`);
  }

  if (apiName) {
    return strapi.policy(`${API_PREFIX}${apiName}.${policyName}`);
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

const resolvePolicies = (config, { pluginName, apiName } = {}) => {
  return config.map(policyConfig => {
    return {
      handler: getPolicy(policyConfig, { pluginName, apiName }),
      config: policyConfig.config || {},
    };
  });
};

const findPolicy = (name, { pluginName, apiName } = {}) => {
  const resolvedPolicy = strapi.policy(name);

  if (resolvedPolicy !== undefined) {
    return resolvedPolicy;
  }

  const localPolicy = searchLocalPolicy(name, { pluginName, apiName });

  if (localPolicy !== undefined) {
    return localPolicy;
  }

  throw new Error(`Could not find policy "${name}"`);
};

const getPolicy = (policyConfig, { pluginName, apiName } = {}) => {
  if (typeof policyConfig === 'function') {
    return policyConfig;
  }

  const { policyName, config } = parsePolicy(policyConfig);

  const policy = findPolicy(policyName, { pluginName, apiName });

  if (typeof policy === 'function') {
    return policy;
  }

  if (policy.validator) {
    policy.validator(config);
  }

  return policy.handler;
};

const createPolicy = options => {
  const { name = 'unnamed', validator, handler } = options;

  const wrappedValidator = config => {
    if (validator) {
      try {
        validator(config);
      } catch (e) {
        throw new Error(`Invalid config passed to "${name}" policy.`);
      }
    }
  };

  return {
    name,
    validator: wrappedValidator,
    handler,
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
  get: getPolicy,
  resolve: resolvePolicies,
  globalPolicy,
  createPolicy,
  createPolicyContext,
};
