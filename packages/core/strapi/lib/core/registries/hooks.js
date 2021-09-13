'use strict';

const { pickBy, has } = require('lodash/fp');
const { addNamespace, hasNamespace } = require('../utils');

const hooksRegistry = () => {
  const hooks = {};

  return {
    get(hookUID) {
      return hooks[hookUID];
    },
    getAll(namespace) {
      return pickBy((_, uid) => hasNamespace(uid, namespace))(hooks);
    },
    set(uid, hook) {
      if (has(uid, hooks)) {
        throw new Error(`hook ${uid} has already been registered.`);
      }

      hooks[uid] = hook;
      return this;
    },
    add(namespace, hooks) {
      for (const hookName in hooks) {
        const hook = hooks[hookName];
        const uid = addNamespace(hookName, namespace);

        this.set(uid, hook);
      }

      return this;
    },
  };
};

module.exports = hooksRegistry;
