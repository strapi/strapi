'use strict';

const { pickBy, has } = require('lodash/fp');
const { addNamespace, hasNamespace } = require('../utils');

/**
 * @typedef {import('./policies').Policy} Policy
 */

// TODO: move instantiation part here instead of in the policy utils
const policiesRegistry = () => {
  const policies = {};

  return {
    /**
     * Returns this list of registered policies uids
     * @returns {string[]}
     */
    keys() {
      return Object.keys(policies);
    },

    /**
     * Returns the instance of a policy. Instantiate the policy if not already done
     * @param {string} uid
     * @returns {Policy}
     */
    get(uid) {
      return policies[uid];
    },

    /**
     * Returns a map with all the policies in a namespace
     * @param {string} namespace
     * @returns {{ [key: string]: Policy }}
     */
    getAll(namespace) {
      return pickBy((_, uid) => hasNamespace(uid, namespace))(policies);
    },

    /**
     * Registers a policy
     * @param {string} uid
     * @param {Policy} policy
     */
    set(uid, policy) {
      policies[uid] = policy;
      return this;
    },

    /**
     * Registers a map of policies for a specific namespace
     * @param {string} namespace
     * @param {{ [key: string]: Policy }} newPolicies
     * @returns
     */
    add(namespace, newPolicies) {
      for (const policyName in newPolicies) {
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
    extend(uid, extendFn) {
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

module.exports = policiesRegistry;
