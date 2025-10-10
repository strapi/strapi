import { pickBy, has } from 'lodash/fp';
import type { Core, UID } from '@strapi/types';
import { addNamespace, hasNamespace } from './namespace';

export type ControllerFactory =
  | ((params: { strapi: Core.Strapi }) => Core.Controller)
  | Core.Controller;
export type ControllerFactoryMap = Record<UID.Controller, ControllerFactory>;
export type ControllerMap = Record<UID.Controller, Core.Controller>;
export type ControllerExtendFn = (service: Core.Controller) => Core.Controller;

const controllersRegistry = (strapi: Core.Strapi) => {
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
    get(uid: UID.Controller) {
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
      for (const uid of Object.keys(filteredControllers) as UID.Controller[]) {
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
    set(uid: UID.Controller, value: ControllerFactory) {
      controllers[uid] = value;
      delete instances[uid];
      return this;
    },

    /**
     * Registers a map of controllers for a specific namespace
     */
    add(namespace: string, newControllers: ControllerFactoryMap) {
      for (const controllerName of Object.keys(newControllers) as UID.Controller[]) {
        const controller = newControllers[controllerName];
        const uid = addNamespace(controllerName, namespace) as UID.Controller;

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
    extend(controllerUID: UID.Controller, extendFn: ControllerExtendFn) {
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
