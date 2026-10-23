import { get } from 'lodash';
import type Koa from 'koa';
import type { Core, Struct } from '@strapi/types';

import { transformResponse } from './transform';
import requestCtx from '../../services/request-context';

const getAuthFromKoaContext = (ctx: Koa.Context) => get(ctx, 'state.auth') ?? {};

/** Build options for contentAPI.sanitize/validate from the request context (auth, route, strictParams). */
const getContentAPIOptions = (strapi: Core.Strapi, ctx: Koa.Context) => {
  const auth = getAuthFromKoaContext(ctx);
  const route = ctx.state?.route;
  const options: { auth: unknown; strictParams?: boolean; route?: typeof route } = { auth, route };
  const apiStrictParams = strapi.config.get('api.rest.strictParams');
  if (typeof apiStrictParams === 'boolean') {
    options.strictParams = apiStrictParams;
  }
  return options;
};

/**
 * @internal Exported so apps can extend it. Not a stable API yet: it may change in a minor release.
 */
export abstract class CoreController<
  TContentType extends Struct.SingleTypeSchema | Struct.CollectionTypeSchema,
> implements Core.CoreAPI.Controller.Base
{
  declare protected readonly strapi: Core.Strapi;

  declare protected readonly contentType: TContentType;

  constructor({ strapi, contentType }: { strapi: Core.Strapi; contentType: TContentType }) {
    // Not enumerable: the own keys of a controller are its actions (routes, permissions)
    Object.defineProperties(this, {
      strapi: { value: strapi },
      contentType: { value: contentType },
    });
  }

  transformResponse<TData>(data: TData, meta?: object) {
    const ctx = requestCtx.get();
    return transformResponse(this.strapi, data, meta, {
      contentType: this.contentType,
      useJsonAPIFormat: ctx?.headers?.['strapi-response-format'] === 'v4',
      encodeSourceMaps: ctx?.headers?.['strapi-encode-source-maps'] === 'true',
    });
  }

  async sanitizeOutput<TData>(data: TData, ctx: Koa.Context) {
    const auth = getAuthFromKoaContext(ctx);

    return this.strapi.contentAPI.sanitize.output(data, this.contentType, { auth });
  }

  async sanitizeInput<TData>(data: TData, ctx: Koa.Context) {
    return this.strapi.contentAPI.sanitize.input(
      data,
      this.contentType,
      getContentAPIOptions(this.strapi, ctx)
    );
  }

  async sanitizeQuery(ctx: Koa.Context) {
    return this.strapi.contentAPI.sanitize.query(
      ctx.query,
      this.contentType,
      getContentAPIOptions(this.strapi, ctx)
    );
  }

  async validateQuery(ctx: Koa.Context) {
    return this.strapi.contentAPI.validate.query(
      ctx.query,
      this.contentType,
      getContentAPIOptions(this.strapi, ctx)
    );
  }

  async validateInput<TData>(data: TData, ctx: Koa.Context) {
    return this.strapi.contentAPI.validate.input(
      data,
      this.contentType,
      getContentAPIOptions(this.strapi, ctx)
    );
  }
}

/**
 * Names of the route actions (find, update, …) defined by the class of a controller.
 * The CoreController helpers are not actions: they must not become routes or permissions.
 */
export const getActionNames = (controller: object): string[] => {
  const names = new Set<string>();

  let proto = Object.getPrototypeOf(controller);
  while (proto && proto !== CoreController.prototype && proto !== Object.prototype) {
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
