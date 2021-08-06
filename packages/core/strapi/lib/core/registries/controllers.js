'use strict';

const { pickBy, has } = require('lodash/fp');

const policiesRegistry = () => {
  const controllers = {};

  return {
    get(controllerUID) {
      return controllers[controllerUID];
    },
    getAll(prefix = '') {
      return pickBy((controller, controllerUID) => controllerUID.startsWith(prefix))(controllers);
    },
    add(namespace, newControllers) {
      for (const controllerName in newControllers) {
        const controller = newControllers[controllerName];
        const uid = `${namespace}.${controllerName}`;

        if (has(uid, controllers)) {
          throw new Error(`Controller ${uid} has already been registered.`);
        }
        controllers[uid] = controller;
      }
    },
  };
};

module.exports = policiesRegistry;
