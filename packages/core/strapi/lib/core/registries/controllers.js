'use strict';

const { pickBy, has } = require('lodash/fp');
const { addNamespace, hasNamespace } = require('../utils');

const controllersRegistry = () => {
  /**
   * @type {Record<string, any>}
   */
  const controllers = {};

  return {
    /**
     * @param {string} uid
     */
    get(uid) {
      return controllers[uid];
    },
    /**
     * @param {string=} namespace
     */
    getAll(namespace) {
      return pickBy((_, uid) => hasNamespace(uid, namespace))(controllers);
    },
    /**
     * @param {string} uid
     * @param {any} value
     */
    set(uid, value) {
      controllers[uid] = value;
      return this;
    },
    /**
     * @param {string} namespace
     * @param {any} newControllers
     */
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
    /**
     * @param {string} controllerUID
     * @param {(contoller: any) => any} extendFn
     */
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
