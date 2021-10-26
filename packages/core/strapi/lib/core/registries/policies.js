'use strict';

const { pickBy, has } = require('lodash/fp');
const { addNamespace, hasNamespace } = require('../utils');

/**
 * @typedef {import('@strapi/strapi').StrapiPolicies} StrapiPolicies
 * @typedef {import('@strapi/strapi').Policy} Policy
 */

// TODO: move instantiation part here instead of in the policy utils
const policiesRegistry = () => {
  /**
   * @type {StrapiPolicies}
   */
  // @ts-ignore
  const policies = {};

  return {
    /**
     * Returns this list of registered policies uids
     */
    keys() {
      return Object.keys(policies);
    },

    /**
     * Returns the instance of a policy. Instantiate the policy if not already done
     * @template {keyof StrapiPolicies} T
     * @param {T} uid
     */
    get(uid) {
      return policies[uid];
    },

    /**
     * Returns a map with all the policies in a namespace
     * @param {string=} namespace
     * @returns {Record<string, Policy>}
     */
    getAll(namespace) {
      return pickBy((_, uid) => hasNamespace(uid, namespace))(policies);
    },

    /**
     * Registers a policy
     * @template {keyof StrapiPolicies} T
     * @param {T} uid
     * @param {Policy} policy
     */
    set(uid, policy) {
      // @ts-ignore
      policies[uid] = policy;
      return this;
    },

    /**
     * Registers a map of policies for a specific namespace
     * @param {string} namespace
     * @param {Record<string, Policy>} newPolicies
     */
    add(namespace, newPolicies) {
      for (const policyName in newPolicies) {
        const policy = newPolicies[policyName];
        const uid = addNamespace(policyName, namespace);

        if (has(uid, policies)) {
          throw new Error(`Policy ${uid} has already been registered.`);
        }

        // @ts-ignore
        this.set(uid, policy);
      }
    },

    /**
     * Wraps a policy to extend it
     * @template {keyof StrapiPolicies} T
     * @param {T} uid
     * @param {(policy: Policy) => Policy} extendFn
     */
    extend(uid, extendFn) {
      const currentPolicy = this.get(uid);

      if (!currentPolicy) {
        throw new Error(`Policy ${uid} doesn't exist`);
      }

      const newPolicy = extendFn(currentPolicy);
      return this.set(uid, newPolicy);
    },
  };
};

module.exports = policiesRegistry;
