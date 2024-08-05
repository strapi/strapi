import { pickBy, has, castArray } from 'lodash/fp';
import type { Core } from '@strapi/types';
import { addNamespace, hasNamespace } from './namespace';

const PLUGIN_PREFIX = 'plugin::';
const API_PREFIX = 'api::';

interface PolicyInfo {
  name: string;
  config: unknown;
}

type PolicyConfig = string | PolicyInfo;

interface NamespaceInfo {
  pluginName?: string;
  apiName?: string;
}

const parsePolicy = (policy: string | PolicyInfo) => {
  if (typeof policy === 'string') {
    return { policyName: policy, config: {} };
  }

  const { name, config } = policy;
  return { policyName: name, config };
};

const policiesRegistry = () => {
  const policies = new Map<string, Core.Policy>();

  const find = (name: string, namespaceInfo?: NamespaceInfo) => {
    const { pluginName, apiName } = namespaceInfo ?? {};

    // try to resolve a full name to avoid extra prefixing
    const policy = policies.get(name);

    if (policy) {
      return policy;
    }

    if (pluginName) {
      return policies.get(`${PLUGIN_PREFIX}${pluginName}.${name}`);
    }

    if (apiName) {
      return policies.get(`${API_PREFIX}${apiName}.${name}`);
    }
  };

  function resolveHandler(policyConfig: PolicyConfig, namespaceInfo?: NamespaceInfo): Core.Policy;
  function resolveHandler(
    policyConfig: PolicyConfig[],
    namespaceInfo?: NamespaceInfo
  ): Core.Policy[];
  function resolveHandler(
    policyConfig: PolicyConfig | PolicyConfig[],
    namespaceInfo?: NamespaceInfo
  ): Core.Policy | Core.Policy[] {
    if (Array.isArray(policyConfig)) {
      return policyConfig.map((config) => {
        return resolveHandler(config, namespaceInfo);
      });
    }

    const { policyName, config } = parsePolicy(policyConfig);

    const policy = find(policyName, namespaceInfo);

    if (!policy) {
      throw new Error(`Policy ${policyName} not found.`);
    }

    if (typeof policy === 'function') {
      return policy;
    }

    if (policy.validator) {
      policy.validator(config);
    }

    return policy.handler;
  }

  return {
    /**
     * Returns this list of registered policies uids
     */
    keys() {
      // Return an array so format stays the same as controllers, services, etc
      return Array.from(policies.keys());
    },

    /**
     * Returns the instance of a policy. Instantiate the policy if not already done
     */
    get(name: string, namespaceInfo?: NamespaceInfo) {
      return find(name, namespaceInfo);
    },
    /**
     * Checks if a policy is registered
     */
    has(name: string, namespaceInfo?: NamespaceInfo) {
      const res = find(name, namespaceInfo);
      return !!res;
    },

    /**
     * Returns a map with all the policies in a namespace
     */
    getAll(namespace: string) {
      return pickBy((_, uid) => hasNamespace(uid, namespace))(Object.fromEntries(policies));
    },

    /**
     * Registers a policy
     */
    set(uid: string, policy: Core.Policy) {
      policies.set(uid, policy);
      return this;
    },

    /**
     * Registers a map of policies for a specific namespace
     */
    add(namespace: string, newPolicies: Record<string, Core.Policy>) {
      for (const policyName of Object.keys(newPolicies)) {
        const policy = newPolicies[policyName];
        const uid = addNamespace(policyName, namespace);

        if (has(uid, policies)) {
          throw new Error(`Policy ${uid} has already been registered.`);
        }

        policies.set(uid, policy);
      }
    },

    /**
     * Resolves a list of policies
     */
    resolve(config: PolicyConfig | PolicyConfig[], namespaceInfo?: NamespaceInfo) {
      const { pluginName, apiName } = namespaceInfo ?? {};

      return castArray(config).map((policyConfig) => {
        return {
          handler: resolveHandler(policyConfig, { pluginName, apiName }),
          config: (typeof policyConfig === 'object' && policyConfig.config) || {},
        };
      });
    },
  };
};

export default policiesRegistry;
