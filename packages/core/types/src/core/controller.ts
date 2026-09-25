import 'koa-body';
import type { Context, Next } from 'koa';
import type * as UID from '../uid';
import type { IsDynamicName, IsStrict } from './strictness';

export type Controller = Record<string, ControllerHandler>;

/**
 * Resolves application overrides before package defaults. With strict types enabled, an unregistered
 * literal UID resolves to `never`; with strict types disabled, every UID resolves to the legacy controller.
 */
export type ControllerFor<TUID extends string> = IsStrict extends false
  ? Controller
  : TUID extends keyof Strapi.Registries.AppControllers
    ? Strapi.Registries.AppControllers[TUID]
    : TUID extends keyof Strapi.Registries.PackageControllers
      ? Strapi.Registries.PackageControllers[TUID]
      : IsDynamicName<TUID> extends true
        ? // TODO @Nico decide whether dynamic names should also close in strict mode
          Controller
        : never;
/**
 * Return type of `strapi.controller<T>(uid)`: `T` when the UID kept its wide default, which happens
 * when the caller passes an explicit type argument (TypeScript then does not infer the UID) or a
 * dynamic UID; the registered lookup otherwise.
 */
export type ControllerLookup<TUID extends UID.Controller, T> = UID.Controller extends TUID
  ? T
  : ControllerFor<TUID>;

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
