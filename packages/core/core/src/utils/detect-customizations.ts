import type { Core } from '@strapi/types';

import * as factories from '../factories';

const APP_UID_PREFIX = 'api::';

/**
 * True when a lifecycle function has a non-empty body. The compiled function
 * source is inspected here only to derive a boolean; it is never returned.
 */
export const isLifecycleNonEmpty = (fn: unknown): boolean => {
  if (typeof fn !== 'function') {
    return false;
  }
  const source = Function.prototype.toString.call(fn);
  // The body starts at the first `{` AFTER the parameter list closes, not the
  // first `{` overall: a real lifecycle signature like `register({ strapi })`
  // or the template's `register(/*{ strapi }*/)` puts a `{` in the params/comment.
  const parenEnd = source.indexOf(')');
  const bodyStart = source.indexOf('{', parenEnd === -1 ? 0 : parenEnd);
  const body = bodyStart === -1 ? '' : source.slice(bodyStart + 1, source.lastIndexOf('}'));
  // strip line + block comments, then whitespace
  const stripped = body
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .trim();
  return stripped.length > 0;
};

/**
 * A default `createCoreService` result has its CRUD methods on its class
 * prototype and only `contentType` as an own key; that own key is copied onto
 * the direct prototype (the base service instance) too, so a default service
 * never has an own key that its direct prototype doesn't also have. A custom
 * service (built via a `cfg` object/callback) has extra own method keys that
 * are absent from the prototype it was assigned. Comparing own keys against
 * the DIRECT prototype's own keys (rather than guessing base method names)
 * avoids flagging every real service as custom.
 */
const isCustomService = (service: unknown): boolean => {
  if (service === null || typeof service !== 'object') {
    return false;
  }
  const proto = Object.getPrototypeOf(service);
  const protoOwnKeys = proto ? Object.keys(proto) : [];
  return Object.keys(service).some((key) => !protoOwnKeys.includes(key));
};

/**
 * Custom routes in Strapi are added as separate files in an api's `routes/`
 * directory (each exporting a plain `{ routes: [...] }` object), never by
 * editing the factory-generated route file, because Koa needs explicit route
 * ordering. The factory router exposes `routes` as a getter, so any route
 * file exposing `routes` as a plain data property is a hand-written custom
 * route file.
 */
const hasCustomRoutes = (strapi: Core.Strapi, apiName: string): boolean => {
  const api = strapi.api(apiName);
  const routeFiles = api?.routes ?? {};
  return Object.values(routeFiles).some((router) => {
    if (router === null || typeof router !== 'object') {
      return false;
    }
    const descriptor = Object.getOwnPropertyDescriptor(router, 'routes');
    // A factory router exposes `routes` as an accessor (getter); a hand-written
    // custom routes file exports it as a plain data property.
    return descriptor ? typeof descriptor.get !== 'function' : false;
  });
};

// Return shape is mirrored in @strapi/types Core.Strapi['getCustomizations'];
// keep the two in sync.
export const detectCustomizations = (strapi: Core.Strapi) => {
  const controllers = strapi.controllers ?? {};
  const services = strapi.services ?? {};

  const appControllerUids = Object.keys(controllers).filter((uid) =>
    uid.startsWith(APP_UID_PREFIX)
  );

  const apis = appControllerUids.map((uid) => {
    const controller = controllers[uid];
    const service = services[uid];
    // uid is `api::<name>.<name>`; map to the bare api name for route lookup.
    const apiName = uid.slice(APP_UID_PREFIX.length).split('.')[0];

    return {
      uid,
      customController: controller !== undefined && factories.isCustomController(controller),
      customService: isCustomService(service),
      customRoutes: hasCustomRoutes(strapi, apiName),
    };
  });

  const app = strapi.app;
  const registerDefined = typeof app?.register === 'function';
  const bootstrapDefined = typeof app?.bootstrap === 'function';
  const destroyDefined = typeof app?.destroy === 'function';
  const registerNonEmpty = isLifecycleNonEmpty(app?.register);
  const bootstrapNonEmpty = isLifecycleNonEmpty(app?.bootstrap);
  const destroyNonEmpty = isLifecycleNonEmpty(app?.destroy);

  return {
    apis,
    counts: {
      customControllers: apis.filter((a) => a.customController).length,
      customServices: apis.filter((a) => a.customService).length,
      customRoutes: apis.filter((a) => a.customRoutes).length,
    },
    srcIndex: {
      present: app != null,
      registerDefined,
      registerNonEmpty,
      bootstrapDefined,
      bootstrapNonEmpty,
      destroyDefined,
      destroyNonEmpty,
      // Template ships only empty register + bootstrap and no destroy.
      beyondTemplate: destroyDefined || registerNonEmpty || bootstrapNonEmpty,
    },
  };
};
