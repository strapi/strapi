import { omit, pick } from 'lodash';
import type { Core, Providers, UID, Utils } from '@strapi/types';

import { createController } from './core-api/controller';
import { CoreContentTypeRouteValidator } from './core-api/routes/validation';
import { createService } from './core-api/service';
import { createRoutes } from './core-api/routes';
import {
  assertRouteRequest,
  createValidatedInputParser,
  parseRouteInput as parseInput,
} from './services/server/validated-input';

const symbols = {
  CustomController: Symbol('StrapiCustomCoreController'),
} as const;

type WithStrapiCallback<T> = T | (<S extends { strapi: Core.Strapi }>(params: S) => T);

const createCoreController = <
  TUID extends UID.ContentType,
  TController extends Core.CoreAPI.Controller.Extendable<TUID>,
>(
  uid: TUID,
  cfg?: WithStrapiCallback<Core.CoreAPI.Controller.FactoryConfig<TUID, TController>>
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

/**
 * Types an upload provider module where an application writes it, and returns it unchanged, with its
 * own type: `init`'s parameters and the members outside the contract keep theirs. Editors complete
 * the contract members in JavaScript too. Annotate `init`'s options; without an annotation they are
 * the `providerOptions` record of the upload config.
 *
 * The upload plugin `require`s the module and reads `init` from it, with no `.default` interop, so
 * the module must be the CommonJS export itself: `export =` in TypeScript, `module.exports =` in
 * JavaScript. Omit the provider members you do not implement: never set one to `undefined`.
 *
 * A provider package checks its module with `satisfies Providers.Upload.Factory<Options>` instead,
 * which needs no runtime dependency on Strapi.
 *
 * @template TModule - The module itself. Pass it explicitly to type the module from a declared type.
 * @template TOptions - `init`'s options, inferred from its annotation: an object type, inline or an
 * interface. Inferred apart from the module, so the options need no index signature.
 *
 * @example
 * import { factories } from '@strapi/strapi';
 *
 * export = factories.createUploadProvider({
 *   init(options: { baseUrl: string }) {
 *     return {
 *       async uploadStream(file) { file.url = `${options.baseUrl}/${file.hash}${file.ext}`; },
 *       async delete(file) {},
 *     };
 *   },
 * });
 */
const createUploadProvider = <
  TModule extends Providers.Upload.Factory<TOptions>,
  TOptions extends object = TModule extends Providers.Upload.Factory<infer TInit>
    ? TInit
    : Record<string, unknown>,
>(
  module: TModule & Providers.Upload.Factory<TOptions>
): TModule => module;

// The route keeps its `config` as written, not widened to `Core.RouteConfig`.
// TODO @Nico when strict types land, widen the constraint to `Core.RouteConfig | Core.RouteConfigFor`
// so a defined route also fits `Core.RouterInputFor`, which checks policy and middleware names.
type DefineRouteConfig<TRequest extends Core.RouteRequest, TConfig extends Core.RouteConfig> = Omit<
  Core.RouteInput,
  'handler' | 'request' | 'config'
> & {
  request?: TRequest;
  config?: TConfig;
  handler: Core.ValidatedRouteHandler<TRequest>;
};

type DefinedRoute<TRequest extends Core.RouteRequest, TConfig extends Core.RouteConfig> = Omit<
  Core.RouteInput,
  'handler' | 'request' | 'config'
> & {
  request: TRequest;
  config?: TConfig;
  handler: Core.MiddlewareHandler;
};

/**
 * Defines a route whose handler receives the request parsed with the route's `request` schemas, on
 * `ctx.input`, typed from the schemas' output. The same schemas document the route in OpenAPI.
 *
 * Opt-in and additive: only the handler of this route changes. `ctx.params`, `ctx.query` and
 * `ctx.request.body` keep their raw values, and routes not defined with this helper are not parsed.
 *
 * - `params` and `query` values arrive as strings. Coerce them in the schema: `z.coerce.number()`,
 *   `z.stringbool()` for booleans. Schemas that never accept a string, such as `z.number()`, and
 *   schemas that OpenAPI cannot document, such as `.transform()`, throw here.
 * - Unknown `params` and `query` keys are stripped from `ctx.input`.
 * - The body schema is the one of the request media type. Another media type answers 415.
 * - A request that does not match answers 400 with a `ValidationError`, after authentication,
 *   policies and route middlewares ran.
 *
 * The handler must be a function. A route whose handler is a controller action (`'api::x.x.pay'`)
 * keeps its permission scope: its action calls `factories.parseRouteInput(ctx, route)` instead.
 *
 * @example
 * import { factories } from '@strapi/strapi';
 * import { z } from 'zod/v4';
 *
 * export default {
 *   type: 'content-api',
 *   routes: [
 *     factories.defineRoute({
 *       method: 'POST',
 *       path: '/orders/:id/refunds',
 *       request: {
 *         params: { id: z.coerce.number().int() },
 *         query: { notify: z.stringbool().optional() },
 *         body: { 'application/json': z.object({ amount: z.number().positive() }) },
 *       },
 *       handler: async (ctx) => {
 *         const { params, query, body } = ctx.input; // { id: number }, { notify?: boolean }, { amount: number }
 *         return { orderId: params.id, amount: body.amount, notify: query.notify ?? false };
 *       },
 *     }),
 *   ],
 * };
 */
const defineRoute = <
  const TRequest extends Core.RouteRequest = Record<never, never>,
  const TConfig extends Core.RouteConfig = never,
>(
  route: DefineRouteConfig<TRequest, TConfig>
): DefinedRoute<TRequest, TConfig> => {
  const { handler } = route;
  const request = (route.request ?? {}) as TRequest;
  const label = `defineRoute ${route.method} ${route.path}`;

  if (typeof handler !== 'function') {
    throw new TypeError(
      `${label}: the handler must be a function. For a controller action, call factories.parseRouteInput(ctx, route) in the action.`
    );
  }

  try {
    assertRouteRequest(request);
    createValidatedInputParser(request);
  } catch (error) {
    if (error instanceof Error) {
      error.message = `${label}: ${error.message}`;
    }

    throw error;
  }

  const definedRoute: DefinedRoute<TRequest, TConfig> = {
    ...route,
    request,
    handler(ctx, next) {
      // Reads `definedRoute.request` per request: registration can replace it to add extra params.
      ctx.input = parseInput(ctx, definedRoute);

      return handler(ctx as Core.ValidatedRouteContext<TRequest>, next);
    },
  };

  return definedRoute;
};

/**
 * Parses the request with the `request` schemas of `route` and returns the parsed values, typed
 * from the schemas' output, with the same rules and errors as `defineRoute`.
 *
 * For a controller action that a route references by name. Such a route keeps the permission scope
 * Strapi generates from its handler, which a function handler has not. TypeScript cannot link the
 * action to its route, so the action names the route it parses for.
 *
 * Unlike `defineRoute`, the schemas are checked on the first request, not at definition.
 *
 * @example
 * // src/api/order/routes/order.ts
 * export const refundRoute = {
 *   method: 'POST',
 *   path: '/orders/:id/refunds',
 *   handler: 'api::order.order.refund',
 *   request: { params: { id: z.coerce.number().int() } },
 * } satisfies Core.RouteInput;
 *
 * // src/api/order/controllers/order.ts
 * export default factories.createCoreController('api::order.order', {
 *   async refund(ctx) {
 *     const { params } = factories.parseRouteInput(ctx, refundRoute); // { id: number }
 *   },
 * });
 */
const parseRouteInput = <TRoute extends { request?: Core.RouteRequest }>(
  ctx: Parameters<Core.ControllerHandler>[0],
  route: TRoute
): Core.ValidatedRouteInputOf<TRoute> => {
  // TODO @Nico check the schemas when the route is registered, not on the first request.
  return parseInput(ctx, route) as Core.ValidatedRouteInputOf<TRoute>;
};

export {
  createCoreController,
  createCoreService,
  createCoreRouter,
  createCoreValidator,
  createUploadProvider,
  defineRoute,
  isCustomController,
  parseRouteInput,
};
