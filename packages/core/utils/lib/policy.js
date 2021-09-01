/**
 * Policies util
 */
'use strict';

const _ = require('lodash');
const { eq } = require('lodash/fp');

const GLOBAL_PREFIX = 'global::';
const PLUGIN_PREFIX = 'plugin::';
const ADMIN_PREFIX = 'admin::';
const APPLICATION_PREFIX = 'api::';

const getPolicyIn = (container, policy) => {
  return (
    _.get(container, ['config', 'policies', policy]) ||
    _.get(container, ['config', 'policies', _.toLower(policy)])
  );
};

const policyExistsIn = (container, policy) => !_.isUndefined(getPolicyIn(container, policy));

const stripPolicy = (policy, prefix) => policy.replace(prefix, '');

const createPolicy = (policyName, args) => ({ policyName, args });

const resolveHandler = policy => (_.isFunction(policy) ? policy : policy.handler);

const parsePolicy = policy => {
  if (typeof policy === 'string') {
    return createPolicy(policy);
  }

  const { name, options = {} } = policy;
  return createPolicy(name, options);
};

const resolvePolicy = policyName => {
  const resolver = policyResolvers.find(resolver => resolver.exists(policyName));

  return resolver ? resolveHandler(resolver.get)(policyName) : undefined;
};

const searchLocalPolicy = (policy, plugin, apiName) => {
  let [absoluteApiName, policyName] = policy.split('.');
  let absoluteApi = _.get(strapi.api, absoluteApiName);
  const resolver = policyResolvers.find(({ name }) => name === 'plugin');

  if (policyExistsIn(absoluteApi, policyName)) {
    return resolveHandler(getPolicyIn(absoluteApi, policyName));
  }

  const pluginPolicy = `${PLUGIN_PREFIX}${plugin}.${policy}`;

  if (plugin && resolver.exists(pluginPolicy)) {
    return resolveHandler(resolver.get(pluginPolicy));
  }

  const api = _.get(strapi.api, apiName);
  if (api && policyExistsIn(api, policy)) {
    return resolveHandler(getPolicyIn(api, policy));
  }

  return undefined;
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

const policyResolvers = [
  {
    name: 'api',
    is(policy) {
      return _.startsWith(policy, APPLICATION_PREFIX);
    },
    exists(policy) {
      return this.is(policy) && !_.isUndefined(this.get(policy));
    },
    get: policy => {
      const [, policyWithoutPrefix] = policy.split('::');
      const [api = '', policyName = ''] = policyWithoutPrefix.split('.');
      // TODO: load policies into the registry & user strapi.policy(policy)
      return getPolicyIn(_.get(strapi, ['api', api]), policyName);
    },
  },
  {
    name: 'admin',
    is(policy) {
      return _.startsWith(policy, ADMIN_PREFIX);
    },
    exists(policy) {
      return this.is(policy) && !_.isUndefined(this.get(policy));
    },
    get(policy) {
      // TODO: load policies into the registry & user strapi.policy(policy)
      return getPolicyIn(_.get(strapi, 'admin'), stripPolicy(policy, ADMIN_PREFIX));
    },
  },
  {
    name: 'plugin',
    is(policy) {
      return _.startsWith(policy, PLUGIN_PREFIX);
    },
    exists(policy) {
      return this.is(policy) && !_.isUndefined(this.get(policy));
    },
    get(policy) {
      return strapi.policy(policy);
    },
  },
  {
    name: 'global',
    is(policy) {
      return _.startsWith(policy, GLOBAL_PREFIX);
    },
    exists(policy) {
      return this.is(policy) && !_.isUndefined(this.get(policy));
    },
    get(policy) {
      return strapi.policy(policy);
    },
  },
];

const get = (policy, plugin, apiName) => {
  if (typeof policy === 'function') {
    return policy;
  }

  const { policyName, args } = parsePolicy(policy);

  const resolvedPolicy = resolvePolicy(policyName);

  if (resolvedPolicy !== undefined) {
    return _.isPlainObject(policy) ? resolvedPolicy(args) : resolvedPolicy;
  }

  const localPolicy = searchLocalPolicy(policy, plugin, apiName);

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
