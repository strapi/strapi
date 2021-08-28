'use strict';

const { pickBy, has } = require('lodash/fp');
const { addNamespace, hasNamespace } = require('../utils');

const controllersRegistry = () => {
  const controllers = {};

  return {
    get(uid) {
      return controllers[uid];
    },
    getAll(namespace) {
      return pickBy((_, uid) => hasNamespace(uid, namespace))(controllers);
    },
    set(uid, value) {
      controllers[uid] = value;
      return this;
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
      return this;
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
