import 'koa-body';
import type { Context, Next } from 'koa';
import type { IsStrict } from './strictness';

export type Controller = Record<string, ControllerHandler>;

/** Resolves application overrides before package defaults, then falls back to the legacy controller. */
export type ControllerFor<TUID extends string> = IsStrict extends false
  ? Controller
  : TUID extends keyof Strapi.Registries.Controllers
    ? Strapi.Registries.Controllers[TUID]
    : TUID extends keyof Strapi.Registries.DefaultControllers
      ? Strapi.Registries.DefaultControllers[TUID]
      : Controller;
export interface ControllerHandler<TResponse = unknown> {
  (context: Context, next: Next): Promise<TResponse | void> | TResponse | void;
}

/** The controller a controller map entry provides: the entry itself, or what a controller factory returns. */
type ControllerInstance<TEntry> = TEntry extends (...args: any[]) => infer TController
  ? TController
  : TEntry;

/**
 * `'<controller>.<action>'` for every action of a controller map, such as a plugin's `controllers` export.
 * With `TNamespace` (e.g. `'plugin::my-plugin'`), `'<namespace>.<controller>.<action>'` is accepted too.
 */
export type ControllerActionReference<TControllers, TNamespace extends string = never> = {
  [TName in keyof TControllers &
    string]: `${TName}.${keyof ControllerInstance<TControllers[TName]> & string}`;
}[keyof TControllers & string] extends infer TRelative extends string
  ? TRelative | `${TNamespace}.${TRelative}`
  : never;
