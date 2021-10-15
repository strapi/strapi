'use strict';

/**
 * @typedef {import('@strapi/strapi').StrapiControllers} StrapiControllers
 */

const { pickBy, has } = require('lodash/fp');
const { addNamespace, hasNamespace } = require('../utils');

const controllersRegistry = () => {
  /**
   * @type {StrapiControllers}
   */
  // @ts-ignore
  const controllers = {};

  return {
    /**
     * @template {keyof StrapiControllers} T
     * @param {T} uid
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
     * @template {keyof StrapiControllers} T
     * @param {T} uid
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

        // @ts-ignore
        controllers[uid] = controller;
      }
      return this;
    },
    /**
     * @template {keyof StrapiControllers} T
     * @param {T} controllerUID
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
