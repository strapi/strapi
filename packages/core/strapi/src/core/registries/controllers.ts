import { pickBy, has } from 'lodash/fp';
import type { Strapi, Common } from '@strapi/types';
import { addNamespace, hasNamespace } from '../utils';

export type ControllerFactory =
  | ((params: { strapi: Strapi }) => Common.Controller)
  | Common.Controller;
export type ControllerFactoryMap = Record<Common.UID.Controller, ControllerFactory>;
export type ControllerMap = Record<Common.UID.Controller, Common.Controller>;
export type ControllerExtendFn = (service: Common.Controller) => Common.Controller;

const controllersRegistry = (strapi: Strapi) => {
  const controllers: ControllerFactoryMap = {};
  const instances: ControllerMap = {};

  return {
    /**
     * Returns this list of registered controllers uids
     */
    keys() {
      return Object.keys(controllers);
    },

    /**
     * Returns the instance of a controller. Instantiate the controller if not already done
     */
    get(uid: Common.UID.Controller) {
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
     */
    getAll(namespace: string) {
      const filteredControllers = pickBy((_, uid) => hasNamespace(uid, namespace))(controllers);

      const map = {};
      for (const uid of Object.keys(filteredControllers) as Common.UID.Controller[]) {
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
     */
    set(uid: Common.UID.Controller, value: ControllerFactory) {
      controllers[uid] = value;
      delete instances[uid];
      return this;
    },

    /**
     * Registers a map of controllers for a specific namespace
     */
    add(namespace: string, newControllers: ControllerFactoryMap) {
      for (const controllerName of Object.keys(newControllers) as Common.UID.Controller[]) {
        const controller = newControllers[controllerName];
        const uid = addNamespace(controllerName, namespace) as Common.UID.Controller;

        if (has(uid, controllers)) {
          throw new Error(`Controller ${uid} has already been registered.`);
        }

        controllers[uid] = controller;
      }

      return this;
    },

    /**
     * Wraps a controller to extend it
     */
    extend(controllerUID: Common.UID.Controller, extendFn: ControllerExtendFn) {
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

export default controllersRegistry;
