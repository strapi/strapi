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

const GLOBAL_PREFIX = 'global.';
const PLUGIN_PREFIX = 'plugins.';
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
  const [, plugin = '', policyName = ''] = policy.split('.');
  return getPolicyIn(_.get(strapi, ['plugins', plugin]), policyName);
};

const pluginPolicyExists = policy => {
  return isPluginPolicy(policy) && !_.isUndefined(getPluginPolicy(policy));
};

const isPluginPolicy = policy => _.startsWith(policy, PLUGIN_PREFIX);

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
