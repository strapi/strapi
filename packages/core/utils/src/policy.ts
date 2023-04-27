/**
 * Policies util
 */

import _ from 'lodash';
import { eq } from 'lodash/fp';
import type { Context } from './types';

const PLUGIN_PREFIX = 'plugin::';
const API_PREFIX = 'api::';

interface PolicyInfo {
  name: string;
  config: unknown;
}

type PolicyConfig = string | PolicyInfo | (() => PolicyInfo);

interface PolicyContext {
  pluginName?: string;
  apiName?: string;
}

interface RouteInfo {
  method: string;
  endpoint: string;
  controller: string;
  action: string;
  plugin: string;
}

const parsePolicy = (policy: string | PolicyInfo) => {
  if (typeof policy === 'string') {
    return { policyName: policy, config: {} };
  }

  const { name, config } = policy;
  return { policyName: name, config };
};

const searchLocalPolicy = (policyName: string, policyContext: PolicyContext) => {
  const { pluginName, apiName } = policyContext ?? {};

  if (pluginName) {
    return strapi.policy(`${PLUGIN_PREFIX}${pluginName}.${policyName}`);
  }

  if (apiName) {
    return strapi.policy(`${API_PREFIX}${apiName}.${policyName}`);
  }
};

const globalPolicy = ({ method, endpoint, controller, action, plugin }: RouteInfo) => {
  return async (ctx: Context, next: () => void) => {
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

const resolvePolicies = (config: PolicyInfo[], policyContext: PolicyContext) => {
  const { pluginName, apiName } = policyContext ?? {};

  return config.map((policyConfig) => {
    return {
      handler: getPolicy(policyConfig, { pluginName, apiName }),
      config: policyConfig.config || {},
    };
  });
};

const findPolicy = (name: string, policyContext: PolicyContext) => {
  const { pluginName, apiName } = policyContext ?? {};
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

const getPolicy = (policyConfig: PolicyConfig, policyContext: PolicyContext) => {
  const { pluginName, apiName } = policyContext ?? {};

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

interface Options {
  name: string;
  validator?(config: unknown): void;
  handler(...args: any[]): any;
}

const createPolicy = (options: Options) => {
  const { name = 'unnamed', validator, handler } = options;

  const wrappedValidator = (config: unknown) => {
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

const createPolicyContext = (type: string, ctx: object) => {
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

export {
  getPolicy as get,
  resolvePolicies as resolve,
  globalPolicy,
  createPolicy,
  createPolicyContext,
};
