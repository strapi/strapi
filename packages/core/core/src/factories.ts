import { pipe, omit, pick } from 'lodash/fp';
import type { Core, UID, Utils } from '@strapi/types';

import { createController } from './core-api/controller';
import { CoreContentTypeRouteValidator } from './core-api/routes/validation';
import { createService } from './core-api/service';
import { createRoutes } from './core-api/routes';

const symbols = {
  CustomController: Symbol('StrapiCustomCoreController'),
} as const;

type WithStrapiCallback<T> = T | (<S extends { strapi: Core.Strapi }>(params: S) => T);

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
    const baseController = createController({ contentType: strapi.contentType(uid) });

    const userCtrl = typeof cfg === 'function' ? cfg({ strapi }) : (cfg ?? ({} as any));

    for (const methodName of Object.keys(baseController) as Array<keyof typeof baseController>) {
      if (userCtrl[methodName] === undefined) {
        userCtrl[methodName] = baseController[methodName];
      }
    }

    Object.setPrototypeOf(userCtrl, baseController);

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
    const baseService = createService({ contentType: strapi.contentType(uid) });

    const userService = typeof cfg === 'function' ? cfg({ strapi }) : (cfg ?? ({} as any));

    for (const methodName of Object.keys(baseService) as Array<keyof typeof baseService>) {
      if (userService[methodName] === undefined) {
        userService[methodName] = baseService[methodName];
      }
    }

    Object.setPrototypeOf(userService, baseService);
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

        const selectedRoutes = pipe(
          (routes) => (except ? omit(except, routes) : routes),
          (routes) => (only ? pick(only, routes) : routes)
        )(defaultRoutes);

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
