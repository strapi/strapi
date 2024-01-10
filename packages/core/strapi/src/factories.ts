import { pipe, omit, pick } from 'lodash/fp';
import type { Strapi, Common, CoreApi, Utils } from '@strapi/types';

import { createController } from './core-api/controller';
import { createService } from './core-api/service';
import { createRoutes } from './core-api/routes';

const symbols = {
  CustomController: Symbol('StrapiCustomCoreController'),
} as const;

type WithStrapiCallback<T> = T | (<S extends { strapi: Strapi }>(params: S) => T);

// Content type is proxied to allow for dynamic content type updates
const getContentTypeProxy = (strapi: Strapi, uid: Common.UID.ContentType) => {
  return new Proxy(strapi.contentType(uid), {
    get(target, prop) {
      const contentType = strapi.contentType(uid);
      if (prop in contentType) {
        return contentType[prop as keyof typeof contentType];
      }
    },
  });
};

const createCoreController = <
  TUID extends Common.UID.ContentType,
  TController extends CoreApi.Controller.Extendable<TUID>
>(
  uid: TUID,
  cfg?: WithStrapiCallback<Utils.PartialWithThis<CoreApi.Controller.Extendable<TUID> & TController>>
) => {
  return ({ strapi }: { strapi: Strapi }): TController & CoreApi.Controller.ContentType<TUID> => {
    const baseController = createController({ contentType: getContentTypeProxy(strapi, uid) });

    const userCtrl = typeof cfg === 'function' ? cfg({ strapi }) : cfg ?? ({} as any);

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
  TUID extends Common.UID.ContentType,
  TService extends CoreApi.Service.Extendable<TUID>
>(
  uid: TUID,
  cfg?: WithStrapiCallback<Utils.PartialWithThis<CoreApi.Service.Extendable<TUID> & TService>>
) {
  return ({ strapi }: { strapi: Strapi }): TService & CoreApi.Service.ContentType<TUID> => {
    const baseService = createService({ contentType: getContentTypeProxy(strapi, uid) });

    const userService = typeof cfg === 'function' ? cfg({ strapi }) : cfg ?? ({} as any);

    for (const methodName of Object.keys(baseService) as Array<keyof typeof baseService>) {
      if (userService[methodName] === undefined) {
        userService[methodName] = baseService[methodName];
      }
    }

    Object.setPrototypeOf(userService, baseService);
    return userService;
  };
}

function createCoreRouter<T extends Common.UID.ContentType>(
  uid: T,
  cfg?: CoreApi.Router.RouterConfig<T>
): CoreApi.Router.Router {
  const { prefix, config = {}, only, except, type = 'content-api' } = cfg ?? {};
  let routes: CoreApi.Router.Route[];

  return {
    type,
    prefix,
    get routes() {
      if (!routes) {
        const contentType = strapi.contentType(uid);

        const defaultRoutes = createRoutes({ contentType });
        const keys = Object.keys(defaultRoutes) as Array<keyof typeof defaultRoutes>;

        keys.forEach((routeName) => {
          const defaultRoute = defaultRoutes[routeName];

          Object.assign(defaultRoute.config, config[routeName] || {});
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

const isCustomController = <T extends Common.Controller>(controller: T): boolean => {
  return symbols.CustomController in controller;
};

export { createCoreController, createCoreService, createCoreRouter, isCustomController };
