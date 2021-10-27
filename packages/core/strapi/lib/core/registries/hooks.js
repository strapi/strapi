'use strict';

const { pickBy } = require('lodash/fp');
const { addNamespace, hasNamespace } = require('../utils');
const { BaseRegistry } = require('./base');

/**
 * @typedef {import('./hooks').Hook} Hook
 */

class HooksRegistry extends BaseRegistry {
  constructor(strapi) {
    super(strapi);
    this.hooks = {};
  }
  /**
   * Returns this list of registered hooks uids
   * @returns {string[]}
   */
  keys() {
    return Object.keys(this.hooks);
  }

  /**
   * Returns the instance of a hook.
   * @param {string} uid
   * @returns {Hook}
   */
  get(uid) {
    return this.hooks[uid];
  }

  /**
   * Returns a map with all the hooks in a namespace
   * @param {string} namespace
   * @returns {{ [key: string]: Hook }}
   */
  getAll(namespace) {
    return pickBy((_, uid) => hasNamespace(uid, namespace))(this.hooks);
  }

  /**
   * Registers a hook
   * @param {string} uid
   * @param {Hook} hook
   */
  set(uid, hook) {
    this.hooks[uid] = hook;
    return this;
  }

  /**
   * Registers a map of hooks for a specific namespace
   * @param {string} namespace
   * @param {{ [key: string]: Hook }} newHooks
   * @returns
   */
  add(namespace, hooks) {
    for (const hookName in hooks) {
      const hook = hooks[hookName];
      const uid = addNamespace(hookName, namespace);

      this.set(uid, hook);
    }

    return this;
  }

  /**
   * Wraps a hook to extend it
   * @param {string} uid
   * @param {(hook: Hook) => Hook} extendFn
   */
  extend(uid, extendFn) {
    const currentHook = this.get(uid);

    if (!currentHook) {
      throw new Error(`Hook ${uid} doesn't exist`);
    }

    const newHook = extendFn(currentHook);
    this.hooks[uid] = newHook;

    return this;
  }
}

const createHooksRegistry = strapi => {
  return new HooksRegistry(strapi);
};

module.exports = createHooksRegistry;
module.exports.HooksRegistry = HooksRegistry;
