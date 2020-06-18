/**
 * Policies util
 */
'use strict';

const _ = require('lodash');

const GLOBAL_PREFIX = 'global::';
const PLUGIN_PREFIX = 'plugins::';
const ADMIN_PREFIX = 'admin::';
const APPLICATION_PREFIX = 'application::';

const isPolicyGenerator = _.isArray;

const getPolicyIn = (container, policy) =>
  _.get(container, ['config', 'policies', _.toLower(policy)]);

const policyExistsIn = (container, policy) => !_.isUndefined(getPolicyIn(container, policy));

const stripPolicy = (policy, prefix) => policy.replace(prefix, '');

const createPolicy = (policyName, args) => ({ policyName, args });

const resolveHandler = policy => (_.isFunction(policy) ? policy : policy.handler);

const parsePolicy = policy =>
  isPolicyGenerator(policy) ? createPolicy(...policy) : createPolicy(policy);

const resolvePolicy = policyName => {
  for (const policyModel of Object.values(policyModelsProvider)) {
    if (policyModel.exists(policyName)) {
      return resolveHandler(policyModel.get)(policyName);
    }
  }

  return undefined;
};

const getLegacyPolicy = (policy, plugin, apiName) => {
  let [absoluteApiName, policyName] = policy.split('.');
  let absoluteApi = _.get(strapi.api, absoluteApiName);

  if (policyExistsIn(absoluteApi, policyName)) {
    return resolveHandler(getPolicyIn(absoluteApi, policyName));
  }

  const pluginPolicy = `${PLUGIN_PREFIX}${plugin}.${policy}`;

  if (plugin && policyModelsProvider.plugin.exists(pluginPolicy)) {
    return resolveHandler(policyModelsProvider.plugin.get(pluginPolicy));
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
      splitEndpoint: endpoint,
      verb: _.toLower(method),
      plugin,
    };

    await next();
  };
};

const createPolicyModelsProvider = () => ({
  APIPolicy: {
    is(policy) {
      return _.startsWith(policy, APPLICATION_PREFIX);
    },
    exists(policy) {
      return this.is(policy) && !_.isUndefined(this.get(policy));
    },
    get: policy => {
      const [, policyWithoutPrefix] = policy.split('::');
      const [api = '', policyName = ''] = policyWithoutPrefix.split('.');
      return getPolicyIn(_.get(strapi, ['api', api]), policyName);
    },
  },
  admin: {
    is(policy) {
      return _.startsWith(policy, ADMIN_PREFIX);
    },
    exists(policy) {
      return this.is(policy) && !_.isUndefined(this.get(policy));
    },
    get: policy => {
      return getPolicyIn(_.get(strapi, 'admin'), stripPolicy(policy, ADMIN_PREFIX));
    },
  },
  plugin: {
    is(policy) {
      return _.startsWith(policy, PLUGIN_PREFIX);
    },
    exists(policy) {
      return this.is(policy) && !_.isUndefined(this.get(policy));
    },
    get(policy) {
      const [plugin = '', policyName = ''] = stripPolicy(policy, PLUGIN_PREFIX).split('.');
      return getPolicyIn(_.get(strapi, ['plugins', plugin]), policyName);
    },
  },
  global: {
    is(policy) {
      return _.startsWith(policy, GLOBAL_PREFIX);
    },
    exists(policy) {
      return this.is(policy) && !_.isUndefined(this.get(policy));
    },
    get(policy) {
      return getPolicyIn(strapi, stripPolicy(policy, GLOBAL_PREFIX));
    },
  },
});

const policyModelsProvider = createPolicyModelsProvider();

const get = (policy, plugin, apiName) => {
  const { policyName, args } = parsePolicy(policy);

  const resolvedPolicy = resolvePolicy(policyName);

  if (resolvedPolicy !== undefined) {
    return isPolicyGenerator(policy) ? resolvedPolicy(args) : resolvedPolicy;
  }

  const legacyPolicy = getLegacyPolicy(policy, plugin, apiName);

  if (legacyPolicy !== undefined) {
    return legacyPolicy;
  }

  throw new Error(`Could not find policy "${policy}"`);
};

module.exports = {
  get,
  globalPolicy,
};
