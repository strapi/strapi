/**
 * Policies util
 */
'use strict';

const _ = require('lodash');

const get = (policy, plugin, apiName) => {
  if (globalPolicyExists(policy)) {
    return parsePolicy(getGlobalPolicy(policy));
  }

  if (pluginPolicyExists(policy)) {
    return parsePolicy(getPluginPolicy(policy));
  }

  if (adminPolicyExists(policy)) {
    return parsePolicy(getAdminPolicy(policy));
  }

  if (APIPolicyExists(policy)) {
    return parsePolicy(getAPIPolicy(policy));
  }

  let [absoluteApiName, policyName] = policy.split('.');
  let absoluteApi = _.get(strapi.api, absoluteApiName);
  if (policyExistsIn(absoluteApi, policyName)) {
    return parsePolicy(getPolicyIn(absoluteApi, policyName));
  }

  const pluginPolicy = `${PLUGIN_PREFIX}${plugin}.${policy}`;

  if (plugin && pluginPolicyExists(pluginPolicy)) {
    return parsePolicy(getPluginPolicy(pluginPolicy));
  }

  const api = _.get(strapi.api, apiName);
  if (api && policyExistsIn(api, policy)) {
    return parsePolicy(getPolicyIn(api, policy));
  }

  throw new Error(`Could not find policy "${policy}"`);
};

const globalPolicy = ({ method, endpoint, controller, action, plugin }) => {
  return async (ctx, next) => {
    ctx.request.route = {
      endpoint: `${method} ${endpoint}`,
      controller: _.toLower(controller),
      action: _.toLower(action),
      splittedEndpoint: endpoint,
      verb: _.toLower(method),
      plugin,
    };

    await next();
  };
};

const parsePolicy = policy => {
  if (_.isFunction(policy)) {
    return policy;
  }

  return policy.handler;
};

const GLOBAL_PREFIX = 'global::';
const PLUGIN_PREFIX = 'plugins::';
const ADMIN_PREFIX = 'admin::';
const APPLICATION_PREFIX = 'application::';

const getPolicyIn = (container, policy) => {
  return _.get(container, ['config', 'policies', _.toLower(policy)]);
};

const policyExistsIn = (container, policy) => {
  return !_.isUndefined(getPolicyIn(container, policy));
};

const isGlobal = policy => _.startsWith(policy, GLOBAL_PREFIX);

const getGlobalPolicy = policy => {
  const strippedPolicy = policy.replace(GLOBAL_PREFIX, '');
  return getPolicyIn(strapi, strippedPolicy);
};

const globalPolicyExists = policy => {
  return isGlobal(policy) && !_.isUndefined(getGlobalPolicy(policy));
};

const getPluginPolicy = policy => {
  const strippedPolicy = policy.replace(PLUGIN_PREFIX, '');
  const [plugin = '', policyName = ''] = strippedPolicy.split('.');
  return getPolicyIn(_.get(strapi, ['plugins', plugin]), policyName);
};

const pluginPolicyExists = policy =>
  isPluginPolicy(policy) && !_.isUndefined(getPluginPolicy(policy));

const isPluginPolicy = policy => _.startsWith(policy, PLUGIN_PREFIX);

const getAdminPolicy = policy => {
  const strippedPolicy = policy.replace(ADMIN_PREFIX, '');
  return getPolicyIn(_.get(strapi, 'admin'), strippedPolicy);
};

const isAdminPolicy = policy => _.startsWith(policy, ADMIN_PREFIX);

const adminPolicyExists = policy => isAdminPolicy(policy) && !_.isUndefined(getAdminPolicy(policy));

const getAPIPolicy = policy => {
  const [, policyWithoutPrefix] = policy.split('::');
  const [api = '', policyName = ''] = policyWithoutPrefix.split('.');
  return getPolicyIn(_.get(strapi, ['api', api]), policyName);
};

const APIPolicyExists = policy => {
  return isAPIPolicy(policy) && !_.isUndefined(getAPIPolicy(policy));
};

const isAPIPolicy = policy => _.startsWith(policy, APPLICATION_PREFIX);

module.exports = {
  get,
  globalPolicy,
};
