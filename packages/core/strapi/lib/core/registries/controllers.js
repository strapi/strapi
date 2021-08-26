'use strict';

const { pickBy, has } = require('lodash/fp');
const { addNamespace } = require('../utils');

const controllersRegistry = () => {
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
        const uid = addNamespace(controllerName, namespace);

        if (has(uid, controllers)) {
          throw new Error(`Controller ${uid} has already been registered.`);
        }
        controllers[uid] = controller;
      }
    },
    extend(controllerUID, extendFn) {
      const currentController = this.get(controllerUID);
      if (!currentController) {
        throw new Error(`Controller ${controllerUID} doesn't exist`);
      }
      const newController = extendFn(currentController);
      controllers[controllerUID] = newController;
    },
  };
};

module.exports = controllersRegistry;
