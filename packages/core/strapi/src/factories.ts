import { pipe, omit, pick } from 'lodash/fp';

import { createController } from './core-api/controller';
import { createService } from './core-api/service';
import { createRoutes } from './core-api/routes';

import type { Strapi } from './Strapi';
import type { Common, CoreApi } from './types';

type WithStrapiCallback<T> = <S extends { strapi: Strapi }>(params: S) => T;

const createCoreController = <
  TUID extends Common.UID.ContentType,
  TUserController extends Partial<CoreApi.Controller.Extendable<TUID>>,
  TController extends Required<TUserController & CoreApi.Controller.ContentType<TUID>>
>(
  uid: TUID,
  cfg?: WithStrapiCallback<TUserController> | TUserController
): WithStrapiCallback<TController> => {
  return ({ strapi }: { strapi: Strapi }) => {
    const baseController = createController({
      contentType: strapi.contentType(uid),
    });

    const userCtrl = typeof cfg === 'function' ? cfg({ strapi }) : cfg ?? {};

    for (const methodName of Object.keys(baseController)) {
      if (userCtrl[methodName] === undefined) {
        userCtrl[methodName] = baseController[methodName];
      }
    }

    Object.setPrototypeOf(userCtrl, baseController);
    return userCtrl;
  };
};

export type CreateCoreService = <
  T extends Common.UID.ContentType,
  S extends Partial<CoreApi.Service.Extendable<T>>
>(
  uid: T,
  config?: WithStrapiCallback<S> | S
) => () => Required<S & CoreApi.Service.ContentType<T>>;

const createCoreService: CreateCoreService = (uid: string, cfg = {}) => {
  return ({ strapi }: { strapi: Strapi }) => {
    const baseService = createService({
      contentType: strapi.contentType(uid),
    });

    const userService = typeof cfg === 'function' ? cfg({ strapi }) : cfg;

    for (const methodName of Object.keys(baseService)) {
      if (userService[methodName] === undefined) {
        userService[methodName] = baseService[methodName];
      }
    }

    Object.setPrototypeOf(userService, baseService);
    return userService;
  };
};

export type CreateCoreRouter = <T extends Common.UID.ContentType>(
  uid: T,
  cfg?: CoreApi.Router.RouterConfig<T>
) => CoreApi.Router.Router;

const createCoreRouter: CreateCoreRouter = (uid, cfg) => {
  const { prefix, config = {}, only, except, type = 'content-api' } = cfg ?? {};
  let routes: CoreApi.Router.Route[];

  return {
    type,
    prefix,
    get routes() {
      if (!routes) {
        const contentType = strapi.contentType(uid);

        const defaultRoutes = createRoutes({ contentType });

        Object.keys(defaultRoutes).forEach((routeName) => {
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
};

export { createCoreController, createCoreService, createCoreRouter };
