import 'koa-body';
import type { Context, Next } from 'koa';

export type Controller = Record<string, ControllerHandler>;

/** Resolves application overrides before package defaults, then falls back to the legacy controller. */
export type ControllerFor<TUID extends string> = TUID extends keyof Strapi.Registries.Controllers
  ? Strapi.Registries.Controllers[TUID]
  : TUID extends keyof Strapi.Registries.DefaultControllers
    ? Strapi.Registries.DefaultControllers[TUID]
    : Controller;
export interface ControllerHandler<TResponse = unknown> {
  (context: Context, next: Next): Promise<TResponse | void> | TResponse | void;
}
