import { isPlainObject, omit, pick } from 'lodash';
import type { Core, UID, Utils } from '@strapi/types';

import { createController, getActionNames } from './core-api/controller';
import { CoreController } from './core-api/controller/core-controller';
import { CoreContentTypeRouteValidator } from './core-api/routes/validation';
import { createService } from './core-api/service';
import { CoreService } from './core-api/service/core-service';
import { createRoutes } from './core-api/routes';

const symbols = {
  CustomController: Symbol('StrapiCustomCoreController'),
} as const;

type WithStrapiCallback<T> = T | (<S extends { strapi: Core.Strapi }>(params: S) => T);

/**
 * Names of the methods along the prototype chain of `value`, e.g. the methods of its class.
 */
const getPrototypeMethodNames = (value: object): string[] => {
  const names = new Set<string>();

  let proto = Object.getPrototypeOf(value);
  while (proto && proto !== Object.prototype) {
    for (const [name, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(proto))) {
      // Skip accessors: reading them off the prototype would run them without an instance
      if (name !== 'constructor' && typeof descriptor.value === 'function') {
        names.add(name);
      }
    }
    proto = Object.getPrototypeOf(proto);
  }

  return [...names];
};

/**
 * Adds the methods of `base` that `instance` does not have, bound to `base`.
 *
 * `cfg` can return a class instance. Its methods live on its class prototype, so it cannot get
 * `base` as its prototype like an object literal does: that would drop them.
 */
const addMissingMethods = (
  instance: any,
  base: any,
  names: string[],
  { enumerable }: { enumerable: boolean }
) => {
  for (const name of names) {
    if (instance[name] === undefined) {
      Object.defineProperty(instance, name, {
        value: base[name].bind(base),
        enumerable,
        writable: true,
        configurable: true,
      });
    }
  }
};

/**
 * Route and permission discovery (e.g. users-permissions) read the actions from the
 * controller's own keys, so the methods of a controller class must become own keys.
 *
 * Each copy is bound to the controller, so every controller gets its own function: the router
 * marks route types (content-api, admin) on the action function, and a class method is shared
 * by every instance of the class.
 */
const exposeActionsAsOwnKeys = (controller: any) => {
  for (const methodName of getActionNames(controller)) {
    if (!Object.hasOwn(controller, methodName)) {
      Object.defineProperty(controller, methodName, {
        value: controller[methodName].bind(controller),
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
  }
};

const createCoreController = <
  TUID extends UID.ContentType,
  TController extends Core.CoreAPI.Controller.Extendable<TUID>,
>(
  uid: TUID,
  cfg?: WithStrapiCallback<
    Utils.PartialWithThis<Core.CoreAPI.Controller.Extendable<TUID> & TController>
  >
) => {
  return ({
    strapi,
  }: {
    strapi: Core.Strapi;
  }): TController & Core.CoreAPI.Controller.ContentType<TUID> => {
    const userCtrl = typeof cfg === 'function' ? cfg({ strapi }) : (cfg ?? ({} as any));

    if (userCtrl instanceof CoreController) {
      // Already has every core action and helper
      exposeActionsAsOwnKeys(userCtrl);
    } else {
      const baseController = createController({ strapi, contentType: strapi.contentType(uid) });

      if (isPlainObject(userCtrl)) {
        // The actions live on the class prototype; the helpers below it are not copied. Bound
        // to the object literal, for the same reason as in exposeActionsAsOwnKeys: the core
        // action then still calls the helpers the literal overrides.
        for (const methodName of getActionNames(baseController) as Array<
          keyof typeof baseController
        >) {
          if (userCtrl[methodName] === undefined) {
            userCtrl[methodName] = (baseController[methodName] as Core.ControllerHandler).bind(
              userCtrl
            );
          }
        }

        Object.setPrototypeOf(userCtrl, baseController);
      } else {
        exposeActionsAsOwnKeys(userCtrl);

        addMissingMethods(userCtrl, baseController, getActionNames(baseController), {
          enumerable: true,
        });
        // The helpers (sanitizeQuery, transformResponse, …) are not actions
        addMissingMethods(userCtrl, baseController, getPrototypeMethodNames(baseController), {
          enumerable: false,
        });
      }
    }

    const isCustom = typeof cfg !== 'undefined';
    if (isCustom) {
      Object.defineProperty(userCtrl, symbols.CustomController, {
        writable: false,
        configurable: false,
        enumerable: false,
      });
    }

    return userCtrl;
  };
};

function createCoreService<
  TUID extends UID.ContentType,
  TService extends Core.CoreAPI.Service.Extendable<TUID>,
>(
  uid: TUID,
  cfg?: WithStrapiCallback<Utils.PartialWithThis<Core.CoreAPI.Service.Extendable<TUID> & TService>>
) {
  return ({
    strapi,
  }: {
    strapi: Core.Strapi;
  }): TService & Core.CoreAPI.Service.ContentType<TUID> => {
    const userService = typeof cfg === 'function' ? cfg({ strapi }) : (cfg ?? ({} as any));

    // A CoreService subclass already has every core method
    if (!(userService instanceof CoreService)) {
      const baseService = createService({ strapi, contentType: strapi.contentType(uid) });

      if (isPlainObject(userService)) {
        for (const methodName of Object.keys(baseService) as Array<keyof typeof baseService>) {
          if (userService[methodName] === undefined) {
            userService[methodName] = baseService[methodName];
          }
        }

        Object.setPrototypeOf(userService, baseService);
      } else {
        addMissingMethods(userService, baseService, getPrototypeMethodNames(baseService), {
          enumerable: false,
        });
      }
    }

    return userService;
  };
}

function createCoreRouter<T extends UID.ContentType>(
  uid: T,
  cfg?: Core.CoreAPI.Router.RouterConfig<T>
): Core.CoreAPI.Router.Router {
  const { prefix, config = {}, only, except, type = 'content-api' } = cfg ?? {};
  let routes: Core.CoreAPI.Router.Route[];

  return {
    type,
    prefix,
    get routes(): Core.CoreAPI.Router.Route[] {
      if (!routes) {
        const contentType = strapi.contentType(uid);

        const defaultRoutes = createRoutes({ contentType, strapi });
        const keys = Object.keys(defaultRoutes) as Array<keyof typeof defaultRoutes>;

        keys.forEach((routeName) => {
          const defaultRoute = defaultRoutes[routeName];

          defaultRoute.config = (config[routeName] ?? {}) as Core.RouteConfig;
        });

        const availableRoutes = except ? omit(defaultRoutes, except) : defaultRoutes;
        const selectedRoutes = only ? pick(availableRoutes, only) : availableRoutes;

        routes = Object.values(selectedRoutes);
      }

      return routes;
    },
  };
}

const createCoreValidator = <T extends UID.ContentType>(
  uid: T,
  strapi: Core.Strapi
): CoreContentTypeRouteValidator => {
  return new CoreContentTypeRouteValidator(strapi, uid);
};

const isCustomController = <T extends Core.Controller>(controller: T): boolean => {
  return symbols.CustomController in controller;
};

export {
  createCoreController,
  createCoreService,
  createCoreRouter,
  createCoreValidator,
  isCustomController,
};
