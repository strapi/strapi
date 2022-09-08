'use strict';

const { pickBy, has } = require('lodash/fp');
const { addNamespace, hasNamespace } = require('../utils');

/**
 * @typedef {import('./controllers').Controller} Controller
 * @typedef {import('./controllers').ControllerFactory} ControllerFactory
 */

const controllersRegistry = () => {
  const controllers = {};
  const instances = {};

  return {
    /**
     * Returns this list of registered controllers uids
     * @returns {string[]}
     */
    keys() {
      return Object.keys(controllers);
    },

    /**
     * Returns the instance of a controller. Instantiate the controller if not already done
     * @param {string} uid
     * @returns {Controller}
     */
    get(uid) {
      if (instances[uid]) {
        return instances[uid];
      }

      const controller = controllers[uid];

      if (controller) {
        instances[uid] = typeof controller === 'function' ? controller({ strapi }) : controller;
        return instances[uid];
      }
    },

    /**
     * Returns a map with all the controller in a namespace
     * @param {string} namespace
     * @returns {{ [key: string]: Controller }}
     */
    getAll(namespace) {
      const filteredControllers = pickBy((_, uid) => hasNamespace(uid, namespace))(controllers);

      const map = {};
      for (const uid of Object.keys(filteredControllers)) {
        Object.defineProperty(map, uid, {
          enumerable: true,
          get: () => {
            return this.get(uid);
          },
        });
      }

      return map;
    },

    /**
     * Registers a controller
     * @param {string} uid
     * @param {Controller} controller
     */
    set(uid, value) {
      controllers[uid] = value;
      delete instances[uid];
      return this;
    },

    /**
     * Registers a map of controllers for a specific namespace
     * @param {string} namespace
     * @param {{ [key: string]: Controller|ControllerFactory }} newControllers
     * @returns
     */
    add(namespace, newControllers) {
      for (const controllerName of Object.keys(newControllers)) {
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
     * Wraps a controller to extend it
     * @param {string} uid
     * @param {(controller: Controller) => Controller} extendFn
     */
    extend(controllerUID, extendFn) {
      const currentController = this.get(controllerUID);

      if (!currentController) {
        throw new Error(`Controller ${controllerUID} doesn't exist`);
      }

      const newController = extendFn(currentController);
      instances[controllerUID] = newController;

      return this;
    },
  };
};

module.exports = controllersRegistry;
