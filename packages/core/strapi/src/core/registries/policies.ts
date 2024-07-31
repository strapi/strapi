import { pickBy, has } from 'lodash/fp';
import type { Common } from '@strapi/types';
import { addNamespace, hasNamespace } from '../utils';

type PolicyExtendFn = (policy: Common.Policy) => Common.Policy;
type PolicyMap = Record<string, Common.Policy>;

// TODO: move instantiation part here instead of in the policy utils
const policiesRegistry = () => {
  const policies: PolicyMap = {};

  return {
    /**
     * Returns this list of registered policies uids
     */
    keys() {
      return Object.keys(policies);
    },

    /**
     * Returns the instance of a policy. Instantiate the policy if not already done
     */
    get(uid: Common.UID.Policy) {
      return policies[uid];
    },

    /**
     * Returns a map with all the policies in a namespace
     */
    getAll(namespace: string) {
      return pickBy((_, uid) => hasNamespace(uid, namespace))(policies);
    },

    /**
     * Registers a policy
     */
    set(uid: string, policy: Common.Policy) {
      policies[uid] = policy;
      return this;
    },

    /**
     * Registers a map of policies for a specific namespace
     */
    add(namespace: string, newPolicies: PolicyMap) {
      for (const policyName of Object.keys(newPolicies)) {
        const policy = newPolicies[policyName];
        const uid = addNamespace(policyName, namespace);

        if (has(uid, policies)) {
          throw new Error(`Policy ${uid} has already been registered.`);
        }
        policies[uid] = policy;
      }
    },

    /**
     * Wraps a policy to extend it
     * @param {string} uid
     * @param {(policy: Policy) => Policy} extendFn
     */
    extend(uid: Common.UID.Policy, extendFn: PolicyExtendFn) {
      const currentPolicy = this.get(uid);

      if (!currentPolicy) {
        throw new Error(`Policy ${uid} doesn't exist`);
      }

      const newPolicy = extendFn(currentPolicy);
      policies[uid] = newPolicy;

      return this;
    },
  };
};

export default policiesRegistry;
