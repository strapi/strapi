'use strict';

const { pickBy } = require('lodash/fp');
const { addNamespace, hasNamespace } = require('../utils');

/**
 * @typedef {import('@strapi/strapi').StrapiHooks} StrapiHooks
 * @typedef {import('@strapi/strapi').Hook} Hook
 */

const hooksRegistry = () => {
  /**
   * @type {StrapiHooks}
   */
  // @ts-ignore
  const hooks = {};

  return {
    /**
     * Returns this list of registered hooks uids
     * @returns {string[]}
     */
    keys() {
      return Object.keys(hooks);
    },

    /**
     * Returns the instance of a hook.
     * @template {keyof StrapiHooks} T
     * @param {T} uid
     */
    get(uid) {
      return hooks[uid];
    },

    /**
     * Returns a map with all the hooks in a namespace
     * @param {string=} namespace
     * @returns {Record<string, Hook>}
     */
    getAll(namespace) {
      return pickBy((_, uid) => hasNamespace(uid, namespace))(hooks);
    },

    /**
     * Registers a hook
     * @param {string} uid
     * @param {Hook} hook
     */
    set(uid, hook) {
      hooks[uid] = hook;
      return this;
    },

    /**
     * Registers a map of hooks for a specific namespace
     * @param {string} namespace
     * @param {Record<string, Hook>} hooks
     */
    add(namespace, hooks) {
      for (const hookName in hooks) {
        const hook = hooks[hookName];
        const uid = addNamespace(hookName, namespace);

        this.set(uid, hook);
      }

      return this;
    },

    /**
     * Wraps a hook to extend it
     * @template {keyof StrapiHooks} T
     * @param {T} uid
     * @param {(hook: Hook) => Hook} extendFn
     */
    extend(uid, extendFn) {
      const currentHook = this.get(uid);

      if (!currentHook) {
        throw new Error(`Hook ${uid} doesn't exist`);
      }

      const newHook = extendFn(currentHook);
      hooks[uid] = newHook;

      return this;
    },
  };
};

module.exports = hooksRegistry;
